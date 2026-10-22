// Extrait des pages éditoriales du site du festival (histoire, partenaires, mentions légales, lieux de convivialité)
// vers un JSON de blocs simples : { type: "h2"|"h3"|"p"|"ul", text | items }.
// Usage : node tools/scrape-pages.mjs <fichier-de-sortie.json>
// Garde-fous : pause entre requêtes, 2 tentatives par page, une page en échec n'arrête pas les autres.

import { writeFileSync } from "node:fs";

const BASE = "https://www.chalondanslarue.com";
const PAGES = [
  { id: "histoire", path: "/fr/nos-activites/le-festival/presentation" },
  { id: "soutiens", path: "/fr/vous/partenaires/partenaires-institutionnels-et-entreprises" },
  { id: "commercants", path: "/fr/vous/partenaires/commercants-mecenes" },
  { id: "mentions", path: "/fr/mentions-legales" },
  { id: "confidentialite", path: "/fr/politique-de-confidentialite" },
  { id: "selection-in", path: "/fr/nos-activites/le-festival/selection-in" },
  { id: "selection-off", path: "/fr/nos-activites/le-festival/selection-off" },
  { id: "tandem", path: "/fr/nos-activites/le-festival/auteurs-en-tandem" },
  { id: "contact", path: "/fr/le-cnarep/nous-contacter" },
  { id: "conv-cour-vivant-denon", path: "/lieuconvivialite/cour-vivant-denon" },
  { id: "conv-boumkao", path: "/lieuconvivialite/boumkao" },
  { id: "conv-collective-la-ruee", path: "/lieuconvivialite/collective-la-ruee" },
  { id: "conv-destinee", path: "/lieuconvivialite/destinee" },
  { id: "conv-la-clenche", path: "/lieuconvivialite/la-clenche" },
];

const NAMED = { nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…", ndash: "–", mdash: "—", laquo: "«", raquo: "»", oelig: "œ", OElig: "Œ", euro: "€", deg: "°", middot: "·", copy: "©", times: "×", trade: "™", bull: "•" };
for (const [letters, accents] of [["aeiou", { grave: "̀", acute: "́", circ: "̂", uml: "̈" }], ["an", { tilde: "̃" }], ["c", { cedil: "̧" }], ["o", { tilde: "̃" }], ["y", { acute: "́", uml: "̈" }]]) {
  for (const l of letters) for (const [a, mark] of Object.entries(accents)) {
    NAMED[l + a] = (l + mark).normalize("NFC");
    NAMED[l.toUpperCase() + a] = (l + mark).normalize("NFC").toUpperCase();
  }
}
const unknown = new Set();
const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => (n in NAMED ? NAMED[n] : (unknown.add(m), m)));
const text = (html) => decode(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/[ \t\r\f\v]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{2,}/g, "\n").trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "chalon-dans-la-rue-prototype (projet de portfolio)" }, signal: AbortSignal.timeout(30000) });
      if (res.ok) return await res.text();
      throw new Error(`HTTP ${res.status}`);
    } catch (error) {
      if (attempt === 2) throw error;
      await sleep(1500);
    }
  }
}

// Bruit à écarter : bandeaux d'une autre édition, appels à candidatures, liens fléchés, onglets de langue.
const NOISE = /2027|appel à candidatures|^>.*<$|^\(VIDE\)$|^Accessibilité$/i;

/** Contenu principal -> liste de blocs (titres, paragraphes, listes). Le texte anglais des onglets FR/EN est ignoré. */
function toBlocks(html) {
  const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? html;
  const cleaned = main
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<form[\s\S]*?<\/form>/g, "")
    .replace(/<ul class="js-tablist[\s\S]*?<\/ul>/g, "")
    .replace(/<div id="(?:info_)?en"[\s\S]*?<\/div>/g, "")
    .replace(/<ul class="prog-detail__a11y[\s\S]*?<\/ul>/g, "");
  const blocks = [];
  // Titres, paragraphes, listes, et « div » feuilles (texte sans bloc imbriqué, ex. la ligne « Lieu »).
  const pattern = /<(h[1-4]|p|ul|ol)\b[^>]*>([\s\S]*?)<\/\1>|<div\b[^>]*>((?:(?!<div|<p\b|<ul|<ol|<h[1-4]|<\/div>)[\s\S])*)<\/div>/g;
  for (const m of cleaned.matchAll(pattern)) {
    const [, tag, inner, leaf] = m;
    if (leaf !== undefined) {
      const value = text(leaf);
      if (value.length > 2 && !NOISE.test(value)) blocks.push({ type: "p", text: value });
    } else if (/^h/.test(tag)) {
      const value = text(inner);
      if (value && !NOISE.test(value)) blocks.push({ type: tag === "h1" ? "h1" : tag === "h2" ? "h2" : "h3", text: value });
    } else if (tag === "p") {
      const value = text(inner);
      if (value && !NOISE.test(value)) blocks.push({ type: "p", text: value });
    } else {
      const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((li) => text(li[1])).filter((item) => item && !NOISE.test(item));
      if (items.length) blocks.push({ type: "ul", items });
    }
  }
  return blocks;
}

const OUT = process.argv[2];
if (!OUT) {
  console.error("Usage : node tools/scrape-pages.mjs <fichier-de-sortie.json>");
  process.exit(1);
}

const pages = {};
const failures = [];
for (const page of PAGES) {
  try {
    const html = await get(`${BASE}${page.path}`);
    pages[page.id] = { source: `${BASE}${page.path}`, title: text(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""), blocks: toBlocks(html) };
  } catch (error) {
    failures.push({ id: page.id, error: String(error) });
  }
  await sleep(250);
}
writeFileSync(OUT, JSON.stringify(pages, null, 1));
console.log(`Pages : ${Object.keys(pages).length}/${PAGES.length}, échecs : ${failures.length}, entités inconnues : ${[...unknown].join(" ") || "aucune"}`);
if (failures.length) console.log(failures);
for (const [id, p] of Object.entries(pages)) console.log(`${id.padEnd(26)} ${String(p.blocks.length).padStart(3)} blocs, ${p.blocks.reduce((n, b) => n + (b.text?.length ?? b.items.join("").length), 0)} caractères`);
