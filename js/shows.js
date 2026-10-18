import { loadJSON } from "./data.js";

/**
 * Spectacles avec numéros de lieu cohérents avec le plan du festival :
 * le numéro affiché sur chaque représentation est déduit du nom du lieu (data/venues.json),
 * pas recopié des maquettes Figma où un même numéro pouvait désigner plusieurs lieux.
 */
const key = (name) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\bst[-\s]/g, "saint ")
    .replace(/[-\s]+/g, " ")
    .trim();

let cache = null;

export function loadShows() {
  cache ??= Promise.all([loadJSON("data/shows.json"), loadJSON("data/venues.json")]).then(([shows, venues]) => {
    const bySpot = new Map(venues.map((venue) => [key(venue.name), venue.spot]));
    return shows.map((show) => ({
      ...show,
      reps: show.reps.map((rep) => ({ ...rep, spot: bySpot.get(key(rep.venue)) ?? rep.spot })),
    }));
  });
  return cache;
}
