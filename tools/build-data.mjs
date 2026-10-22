// Construit data/shows.json, data/venues.json et data/event.json à partir de la programmation extraite.
// Usage : node tools/build-data.mjs <programme.json> <ancien-venues.json>
//   programme.json  : sortie de tools/scrape-programme.mjs
//   ancien-venues.json : lieux du plan précédent (sert à reprendre les coordonnées déjà connues)
// Les lieux sans correspondance sont géocodés avec Nominatim (1 requête/s, arrêt après 8 échecs d'affilée),
// puis, à défaut, placés de façon déterministe près du centre.

import { readFileSync, writeFileSync } from "node:fs";

const [, , SOURCE, OLD_VENUES] = process.argv;
if (!SOURCE || !OLD_VENUES) {
  console.error("Usage : node tools/build-data.mjs <programme.json> <ancien-venues.json>");
  process.exit(1);
}

const programme = JSON.parse(readFileSync(SOURCE, "utf8")).shows;
const oldVenues = JSON.parse(readFileSync(OLD_VENUES, "utf8"));
const CENTER = { lat: 46.7806, lng: 4.8528 };
const BOUNDS = { west: 4.82, east: 4.9, south: 46.76, north: 46.805 };

// Lieux de convivialité du site (pastille -> type de repère). La Cour du festival est le lieu du festival.
const SPOT_KINDS = { 13: "festival", 8: "convivialite", 19: "convivialite", 20: "convivialite", 63: "convivialite" };

// ---- Outils ------------------------------------------------------------------------
const key = (text) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\bst[-\s]/g, "saint ")
    .replace(/[^a-z0-9']+/g, " ")
    .trim();

/** « Abattoir (L') » -> « L’Abattoir » ; « Maison (La) » -> « La Maison ». */
const tidyName = (name) => {
  const m = name.match(/^(.+?)\s*\((L'|La|Le|Les)\)$/);
  if (!m) return name.replace(/'/g, "’").trim();
  return (m[2] === "L'" ? `L’${m[1]}` : `${m[2]} ${m[1]}`).replace(/'/g, "’");
};

const hash = (text) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const inBounds = (lat, lng) => lng >= BOUNDS.west && lng <= BOUNDS.east && lat >= BOUNDS.south && lat <= BOUNDS.north;

// ---- Lieux -------------------------------------------------------------------------
const spotNames = new Map(); // pastille -> nom du lieu sur le site
for (const show of programme) {
  for (const entry of show.schedule) if (entry.spot && !spotNames.has(entry.spot)) spotNames.set(entry.spot, tidyName(entry.place));
}

// Lieux nommés autrement sur le site et sur le plan précédent.
const ALIASES = {
  [key("Cour du festival - École Vivant Denon")]: "Cour Vivant Denon",
  [key("Place des Publics - Parc Georges Nouelle")]: "Parc Georges Nouelle - Place des Publics",
  [key("Granges Forestier - bord de Saône")]: "Granges forestières",
};

const matchOld = (name) => {
  const k = key(name);
  const alias = ALIASES[k] && oldVenues.find((v) => v.name === ALIASES[k]);
  if (alias) return alias;
  return (
    oldVenues.find((v) => key(v.name) === k || key(v.address) === k) ??
    oldVenues.find((v) => {
      const a = key(v.name);
      const b = key(v.address);
      return (k.length >= 6 && a.length >= 6 && (a.includes(k) || k.includes(a))) || (k.length >= 6 && b.length >= 6 && (b.includes(k) || k.includes(b)));
    })
  );
};

let geocodeFailures = 0;
async function geocode(name) {
  if (geocodeFailures >= 8) return null;
  try {
    await sleep(1100);
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&viewbox=${BOUNDS.west},${BOUNDS.north},${BOUNDS.east},${BOUNDS.south}&bounded=1&q=${encodeURIComponent(`${name}, Chalon-sur-Saône`)}`;
    const res = await fetch(url, { headers: { "User-Agent": "chalon-dans-la-rue-prototype (projet de portfolio)" }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const [hit] = await res.json();
    geocodeFailures = 0;
    return hit && inBounds(Number(hit.lat), Number(hit.lon)) ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  } catch {
    geocodeFailures += 1;
    return null;
  }
}

const venues = [];
const report = { reused: 0, geocoded: 0, fallback: [] };
for (const [spot, name] of [...spotNames].sort((a, b) => a[0] - b[0])) {
  const old = matchOld(name);
  let place = old ? { lat: old.lat, lng: old.lng } : null;
  let source = old ? "plan" : null;
  if (place) report.reused += 1;
  else if ((place = await geocode(name))) {
    source = "geocodage";
    report.geocoded += 1;
  } else {
    // Repli déterministe : un point autour du centre (le plan exact n'est pas disponible).
    const h = hash(name);
    place = { lat: CENTER.lat + ((h % 1000) / 1000 - 0.5) * 0.008, lng: CENTER.lng + (((h >> 10) % 1000) / 1000 - 0.5) * 0.012 };
    source = "repli";
    report.fallback.push(`${spot} ${name}`);
  }
  venues.push({ spot, name, address: old?.address ?? name, kind: SPOT_KINDS[spot] ?? "spectacle", lat: Number(place.lat.toFixed(6)), lng: Number(place.lng.toFixed(6)), source });
}

// ---- Spectacles --------------------------------------------------------------------
const CATEGORY_MAP = {
  Cirque: { label: "Cirque", token: "cirque" },
  "Théâtre de rue": { label: "Théâtre de rue", token: "rue" },
  Danse: { label: "Danse", token: "danse" },
  Performance: { label: "Performance", token: "performance" },
  "Théâtre d´objets / Marionnettes": { label: "Marionnette", token: "marionnette" },
  Clown: { label: "Clown", token: "clown" },
  "Musique de rue": { label: "Concert", token: "concert" },
  "Mime / Théâtre gestuel": { label: "Théâtre de rue", token: "rue" },
  "Spectacle musical": { label: "Spectacle musical", token: "musical" },
  Installation: { label: "Performance", token: "performance" },
};
const FALLBACK_CATEGORY = CATEGORY_MAP["Théâtre de rue"];

const DAYS = { jeudi: "jeu.", vendredi: "ven.", samedi: "sam.", dimanche: "dim." };
const dayId = (label) => {
  const m = label.match(/(\d{1,2})\s+juillet/i);
  return m ? `${m[1].padStart(2, "0")}/07` : label;
};

/** « 09h00 » -> « 9h00 » (écriture de la maquette) ; heure absente -> « 15h00 ». */
const shortTime = (time) => (time ? time.replace(/^0(\d)/, "$1") : "15h00");

const formatDuration = (raw) => {
  const h = raw.match(/(\d+)\s*h\s*(\d+)?/i);
  if (h) return `${h[1]}h${(h[2] ?? "0").padStart(2, "0")}`;
  const min = raw.match(/(\d+)\s*min/i);
  if (min) return `${Math.floor(min[1] / 60)}h${String(min[1] % 60).padStart(2, "0")}`;
  return raw || "—";
};
const formatAge = (raw) => {
  const m = raw.match(/(\d+)\s*ans/i);
  return m ? `Dès ${m[1]} ans` : raw || "Tout public";
};
const summaryOf = (text) => {
  const flat = text.replace(/\s*\n+\s*/g, " ").trim();
  if (flat.length <= 190) return flat;
  return `${flat.slice(0, 190).replace(/\s+\S*$/, "")}...`;
};

const spectacleSpots = venues.filter((v) => v.kind === "spectacle").map((v) => v.spot);
const venueName = new Map(venues.map((v) => [v.spot, v.name]));

const shows = programme.map((p) => {
  const category = CATEGORY_MAP[p.categories[0]] ?? FALLBACK_CATEGORY;
  const reps = p.schedule.map((entry) => {
    // Pastille inconnue (« lieu indiqué sur le billet »…) : repère choisi de façon déterministe.
    const spot = entry.spot ?? spectacleSpots[hash(p.id) % spectacleSpots.length];
    return { date: dayId(entry.day), time: shortTime(entry.time), spot, venue: venueName.get(spot) ?? tidyName(entry.place) };
  });
  if (reps.length === 0) {
    const spot = spectacleSpots[hash(p.id) % spectacleSpots.length];
    reps.push({ date: "23/07", time: "15h00", spot, venue: venueName.get(spot) });
  }

  // Les lignes de production, coproduction, soutiens et résidences vont dans « Soutiens », le reste dans « Distribution ».
  const isSupport = (line) => /^(production|coproduction|co-production|soutiens?|accueil|avec le soutien|r[ée]sidences?|partenaires?|remerciements?)\b/i.test(line);
  const supports = p.credits.filter(isSupport);
  const cast = p.credits.filter((line) => !isSupport(line));
  const sections = [
    cast.length && { title: "Distribution", text: cast.join("\n") },
    { title: "Technique", text: [p.duration && `Durée : ${p.duration}`, p.capacity && `Jauge : ${p.capacity}`, p.createdIn && `Année de création : ${p.createdIn}`].filter(Boolean).join("\n") },
    (p.contact.name || p.contact.email) && { title: "Contact Diffusion", text: [p.contact.name, p.contact.email, p.contact.website].filter(Boolean).join("\n") },
    supports.length && { title: "Soutiens", text: supports.join("\n") },
  ].filter(Boolean);

  return {
    id: p.id,
    title: p.title,
    company: tidyName(p.company),
    accent: category.token,
    duration: formatDuration(p.duration),
    age: formatAge(p.age),
    location: reps[0].venue,
    category: category.label,
    programme: /\bIn\b/i.test(p.selection) ? "IN" : "OFF",
    selection: p.selection,
    tagline: p.tagline || undefined,
    summary: summaryOf(p.description),
    photo: { src: `assets/shows/${p.id}.jpg`, mode: "cover" },
    reps,
    detail: {
      photos: p.photos.slice(0, 2).map((_, i) => `assets/shows/${p.id}${i === 0 ? "" : "-2"}.jpg`),
      description: p.description,
      links: { show: p.url, company: p.contact.website ?? undefined },
      sections,
    },
  };
});

// ---- Sortie ------------------------------------------------------------------------
const event = {
  name: "Chalon dans la rue",
  city: "Chalon-sur-Saône",
  center: CENTER,
  days: [
    { id: "23/07", label: `${DAYS.jeudi} 23/07` },
    { id: "24/07", label: `${DAYS.vendredi} 24/07` },
    { id: "25/07", label: `${DAYS.samedi} 25/07` },
    { id: "26/07", label: `${DAYS.dimanche} 26/07` },
  ],
};

writeFileSync("data/venues.json", `${JSON.stringify(venues, null, 2)}\n`);
writeFileSync("data/shows.json", `${JSON.stringify(shows, null, 2)}\n`);
writeFileSync("data/event.json", `${JSON.stringify(event, null, 2)}\n`);
console.log(`Lieux : ${venues.length} (plan : ${report.reused}, géocodés : ${report.geocoded}, repli : ${report.fallback.length})`);
if (report.fallback.length) console.log("Repli :", report.fallback.join(" | "));
console.log(`Spectacles : ${shows.length}`);
