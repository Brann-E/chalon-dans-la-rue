/**
 * État partagé de l'appli (favoris, planning), persistant dans le navigateur.
 * Les composants s'abonnent et se mettent à jour sans re-rendu complet.
 */
const STORAGE_KEY = "chalon-dans-la-rue:v1";

const defaultFilters = () => ({
  from: "", // heure de début (ex. "9h"), vide = aucune
  to: "",
  days: [], // "10/07"…
  programme: [], // "IN" | "OFF"
  categories: [],
  zones: [],
});

const defaults = () => ({
  favorites: [], // ids de spectacles
  planning: {}, // idSpectacle -> index de la représentation épinglée
  layers: {}, // clé de calque -> visible ; absent = valeur par défaut de data/layers.json
  filters: defaultFilters(), // filtres de la liste Découvrir
  settings: {}, // réglages du Menu (clé -> valeur) ; absent = valeur par défaut passée à getSetting
});

function read() {
  try {
    return { ...defaults(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") };
  } catch {
    return defaults();
  }
}

let state = read();
const listeners = new Set();

function commit(next) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* stockage indisponible : l'état reste en mémoire pour la session */
  }
  listeners.forEach((listener) => listener(state));
}

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const isFavorite = (showId) => state.favorites.includes(showId);
export const pinnedIndex = (showId) => (showId in state.planning ? state.planning[showId] : null);
export const isPinned = (showId, index) => pinnedIndex(showId) === index;
export const getFavorites = () => [...state.favorites];
export const getPlanning = () => Object.entries(state.planning).map(([showId, index]) => ({ showId, index }));

export function toggleFavorite(showId) {
  const favorites = isFavorite(showId) ? state.favorites.filter((id) => id !== showId) : [...state.favorites, showId];
  commit({ ...state, favorites });
}

/** Ajoute plusieurs favoris d'un coup, en conservant l'ordre et sans doublon. */
export function addFavorites(showIds) {
  const favorites = [...state.favorites];
  for (const id of showIds) if (!favorites.includes(id)) favorites.push(id);
  commit({ ...state, favorites });
}

/** Vide d'un coup les favoris ou le planning (bouton « Vider la page »). */
export function clearFavorites() {
  commit({ ...state, favorites: [] });
}

export function clearPlanning() {
  commit({ ...state, planning: {} });
}

/** Épingle une représentation ; un nouvel appui sur la même la retire (une seule par spectacle). */
export function togglePin(showId, index) {
  const planning = { ...state.planning };
  if (isPinned(showId, index)) delete planning[showId];
  else planning[showId] = index;
  commit({ ...state, planning });
}

export function setPin(showId, index) {
  commit({ ...state, planning: { ...state.planning, [showId]: index } });
}

/** Visibilité d'un calque de la carte ; `fallback` : valeur par défaut si l'utilisateur n'a rien choisi. */
export const isLayerOn = (key, fallback) => (key in state.layers ? state.layers[key] : fallback);

export function setLayer(key, visible) {
  commit({ ...state, layers: { ...state.layers, [key]: visible } });
}

export function resetLayers() {
  commit({ ...state, layers: {} });
}

/** Réglage du Menu (notifications, accessibilité, préférences, avatar…) ; `fallback` : valeur par défaut. */
export const getSetting = (key, fallback) => (key in state.settings ? state.settings[key] : fallback);

export function setSetting(key, value) {
  commit({ ...state, settings: { ...state.settings, [key]: value } });
}

export const getFilters = () => ({ ...defaultFilters(), ...state.filters });

export function setFilters(patch) {
  commit({ ...state, filters: { ...getFilters(), ...patch } });
}

export function resetFilters() {
  commit({ ...state, filters: defaultFilters() });
}

/** Un groupe de filtres (ex. « categories ») a-t-il une sélection active ? */
export function isFilterActive(group) {
  const value = getFilters()[group];
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

export function reset() {
  commit(defaults());
}
