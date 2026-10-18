/** Chargement des données (JSON) avec cache : le code ne contient aucun contenu éditorial. */
const cache = new Map();

export function loadJSON(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(path).then((response) => {
        if (!response.ok) throw new Error(`Impossible de charger ${path} (${response.status})`);
        return response.json();
      })
    );
  }
  return cache.get(path);
}
