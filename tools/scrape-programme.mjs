// Extrait la programmation 2026 du site du festival (liste + fiches) vers un fichier JSON brut.
// Usage : node tools/scrape-programme.mjs <fichier-de-sortie.json>
// Garde-fous : pause entre requêtes, 2 tentatives par page, arrêt après 5 échecs d'affilée.

import { writeFileSync } from "node:fs";

const BASE = "https://www.chalondanslarue.com";
const LIST_URL = `${BASE}/fr/festival-2026/programmation-2026/programmation-detaillee-detail`;
const PAUSE_MS = 250;
const MAX_SHOWS = 200;
const MAX_CONSECUTIVE_FAILURES = 5;

const OUT = process.argv[2];
if (!OUT) {
  console.error("Usage : node tools/scrape-programme.mjs <fichier-de-sortie.json>");
  process.exit(1);
}

// ---- Texte HTML -> texte brut ------------------------------------------------------
const ACCENTS = { grave: "`", acute: "´", circ: "^", tilde: "~", uml: "¨", cedil: "¸" };
const NAMED = {
  nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", bdquo: "„",
  hellip: "…", ndash: "–", mdash: "—", laquo: "«", raquo: "»", oelig: "œ", OElig: "Œ", aelig: "æ", AElig: "Æ", szlig: "ß",
  euro: "€", deg: "°", middot: "·", copy: "©", times: "×", trade: "™", oslash: "ø", Oslash: "Ø",
};
for (const [letters, accents] of [["aeiou", ["grave", "acute", "circ", "uml"]], ["an", ["tilde"]], ["c", ["cedil"]], ["o", ["tilde"]], ["y", ["acute", "uml"]]]) {
  for (const l of letters) for (const a of accents) {
    const composed = (l + { grave: "̀", acute: "́", circ: "̂", tilde: "̃", uml: "̈", cedil: "̧" }[a]).normalize("NFC");
    NAMED[l + a] = composed;
    NAMED[l.toUpperCase() + a] = composed.toUpperCase();
  }
}
const unknownEntities = new Set();
const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => {
      if (n in NAMED) return NAMED[n];
      unknownEntities.add(m);
      return m;
    });
const clean = (s) => decode(s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/[ \t\r\f\v]+/g, " ").replace(/ ?\n ?/g, "\n").trim();
const first = (re, s) => (s.match(re) ?? [])[1];

// ---- Réseau ------------------------------------------------------------------------
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

// ---- Liste -------------------------------------------------------------------------
function parseList(html) {
  const items = [];
  for (const block of html.split('class="block prog-summary__item').slice(1)) {
    const url = first(/href="(https:\/\/www\.chalondanslarue\.com\/prog2026\/[^"]+)"/, block);
    if (!url) continue;
    items.push({
      url,
      thumb: first(/<img src="(https:[^"]+_SmartImage[^"]+)"/, block) ?? null,
      selection: clean(first(/<span class="hidden">([\s\S]*?)<\/span>/, block) ?? ""),
      company: clean(first(/<h2 class="prog-summary__cie">([\s\S]*?)<\/h2>/, block) ?? ""),
      title: clean(first(/<div class="block__title prog-summary__titre">([\s\S]*?)<\/div>/, block) ?? ""),
      tagline: clean(first(/<div class="prog-summary__soustitre">([\s\S]*?)<\/div>/, block) ?? ""),
      categories: [...(first(/<ul class="prog__type[^"]*">([\s\S]*?)<\/ul>/, block) ?? "").matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => clean(m[1])),
    });
  }
  return items;
}

// ---- Fiche -------------------------------------------------------------------------
function parseSchedule(html) {
  const zone = first(/<div class="prog-detail__datelieu">([\s\S]*?)<div class="prog-detail__text">/, html) ?? "";
  const days = [];
  for (const part of zone.split(/<h4[^>]*>/).slice(1)) {
    const label = clean(part.split("</h4>")[0]);
    const entries = [...part.split("</h4>")[1].matchAll(/<div>([\s\S]*?)<\/div>/g)].map((m) => clean(m[1])).filter(Boolean);
    for (const raw of entries) {
      const time = first(/^(\d{1,2}h\d{0,2})/, raw) ?? null;
      const spot = raw.match(/Pastille\s+(\d+)\s*:?\s*(.*)$/i);
      days.push({ day: label, time, spot: spot ? Number(spot[1]) : null, place: spot ? spot[2].trim() : raw.replace(/^\d{1,2}h\d{0,2}\s*-?\s*/, ""), raw });
    }
  }
  return days;
}

function parseFiche(html, listItem) {
  const detail = first(/<div class="prog-detail">([\s\S]*?)<a [^>]*class="return-link/, html) ?? html;
  // Deux images par fiche : la grande (bannière, avant le bloc détail) puis la carrée.
  const imgs = [...new Set([...html.matchAll(/<img src="(https:[^"]+_SmartImage[^"]+)"/g)].map((m) => m[1]))];
  const coord = first(/<div class="prog-detail__cie-coord">([\s\S]*?)<div class="prog-detail__reso/, detail) ?? "";
  return {
    id: listItem.url.split("/").slice(-2)[0],
    url: listItem.url,
    company: clean(first(/<span class="prog-detail__cie">([\s\S]*?)<\/span>/, detail) ?? listItem.company),
    title: clean(first(/<span class="prog-detail__title">([\s\S]*?)<\/span>/, detail) ?? listItem.title),
    tagline: clean(first(/<span class="prog-detail__soustitre">([\s\S]*?)<\/span>/, detail) ?? listItem.tagline),
    selection: clean(first(/<div class="prog-detail__category">([\s\S]*?)<\/div>/, detail) ?? listItem.selection),
    duration: clean(first(/Durée du spectacle :<\/strong>([^<]*)/, detail) ?? ""),
    capacity: clean(first(/Jauge :<\/strong>([^<]*)/, detail) ?? ""),
    categories: [...(first(/<ul class="prog__type[^"]*">([\s\S]*?)<\/ul>/, detail) ?? "").matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => clean(m[1])),
    accessibility: [...(first(/<ul class="prog-detail__a11y[^"]*">([\s\S]*?)<\/ul>/, detail) ?? "").matchAll(/alt="([^"]*)"/g)].map((m) => m[1]),
    age: clean(first(/<div class="prog-detail__age">([\s\S]*?)<\/div>/, detail) ?? ""),
    schedule: parseSchedule(detail),
    description: [...(first(/<div id="info_fr"[^>]*>([\s\S]*?)<\/div>\s*<div id="info_en"/, detail) ?? "").matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => clean(m[1])).filter(Boolean).join("\n"),
    contact: {
      name: clean(coord.split("<br>")[0] ?? ""),
      website: first(/<a href="(https?:\/\/(?!www\.chalondanslarue)[^"]+)"/, coord) ?? null,
      email: first(/mailto:([^"]+)"/, coord) ?? null,
    },
    createdIn: clean(first(/Année de création :<\/strong>([^<]*)/, detail) ?? ""),
    credits: [...(first(/<div class="prog-detail__prod">([\s\S]*?)<\/div>/, detail) ?? "").matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => clean(m[1])).filter(Boolean),
    photos: imgs,
    thumb: listItem.thumb,
  };
}

// ---- Principal ---------------------------------------------------------------------
const list = parseList(await get(LIST_URL));
console.log(`Liste : ${list.length} spectacles`);
if (list.length === 0 || list.length > MAX_SHOWS) {
  console.error(`Nombre de spectacles inattendu (${list.length}) : arrêt.`);
  process.exit(2);
}

const shows = [];
const failures = [];
let consecutive = 0;
for (const [index, item] of list.entries()) {
  try {
    shows.push(parseFiche(await get(item.url), item));
    consecutive = 0;
  } catch (error) {
    failures.push({ url: item.url, error: String(error) });
    if (++consecutive >= MAX_CONSECUTIVE_FAILURES) {
      console.error(`${MAX_CONSECUTIVE_FAILURES} échecs d'affilée : arrêt.`);
      break;
    }
  }
  if ((index + 1) % 20 === 0) console.log(`${index + 1}/${list.length}`);
  await sleep(PAUSE_MS);
}

writeFileSync(OUT, JSON.stringify({ source: LIST_URL, count: shows.length, failures, unknownEntities: [...unknownEntities], shows }, null, 1));
console.log(`Terminé : ${shows.length} fiches, ${failures.length} échecs, entités inconnues : ${[...unknownEntities].join(" ") || "aucune"}`);
