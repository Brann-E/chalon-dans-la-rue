// Télécharge les photos de la programmation et les réduit pour l'appli (JPEG).
// Usage : SHARP_DIR=<dossier contenant node_modules/sharp> node tools/fetch-photos.mjs <programme.json> <dossier-de-sortie>
// Sortie : <id>.jpg (bannière, 900 px de large) et <id>-2.jpg (photo carrée, 600 px) quand elle existe.
// Garde-fous : 4 requêtes en parallèle, arrêt après 8 échecs d'affilée, fichiers existants conservés.

import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const [, , SOURCE, OUT_DIR] = process.argv;
if (!SOURCE || !OUT_DIR || !process.env.SHARP_DIR) {
  console.error("Usage : SHARP_DIR=<dossier> node tools/fetch-photos.mjs <programme.json> <dossier-de-sortie>");
  process.exit(1);
}
const sharp = createRequire(join(process.env.SHARP_DIR, "package.json"))("sharp");
mkdirSync(OUT_DIR, { recursive: true });

const shows = JSON.parse(readFileSync(SOURCE, "utf8")).shows;
const jobs = shows.flatMap((show) => show.photos.slice(0, 2).map((url, index) => ({ url, file: join(OUT_DIR, index === 0 ? `${show.id}.jpg` : `${show.id}-2.jpg`), width: index === 0 ? 900 : 600 })));

let done = 0;
let consecutiveFailures = 0;
let stopped = false;
const failures = [];

async function run(job) {
  if (stopped || existsSync(job.file)) return;
  try {
    const res = await fetch(job.url, { headers: { "User-Agent": "chalon-dans-la-rue-prototype (projet de portfolio)" }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await sharp(Buffer.from(await res.arrayBuffer())).resize({ width: job.width, withoutEnlargement: true }).jpeg({ quality: 74, mozjpeg: true }).toFile(job.file);
    consecutiveFailures = 0;
  } catch (error) {
    failures.push({ url: job.url, error: String(error) });
    if (++consecutiveFailures >= 8) {
      stopped = true;
      console.error("8 échecs d'affilée : arrêt.");
    }
  }
  if (++done % 40 === 0) console.log(`${done}/${jobs.length}`);
}

const queue = [...jobs];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length && !stopped) {
      await run(queue.shift());
      await new Promise((r) => setTimeout(r, 120));
    }
  })
);
console.log(`Terminé : ${jobs.length - failures.length} images traitées, ${failures.length} échecs`);
if (failures.length) console.log(failures.slice(0, 5));
