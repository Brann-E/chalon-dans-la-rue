import { loadJSON } from "./data.js";

/**
 * Programmation du festival (data/shows.json, générée par tools/build-data.mjs).
 * Chaque représentation porte le numéro de pastille du lieu (data/venues.json) et son nom.
 */
let cache = null;

export function loadShows() {
  cache ??= loadJSON("data/shows.json");
  return cache;
}
