/**
 * Charge MapLibre GL JS (copie locale dans vendor/) à la demande, avec nouvelles tentatives.
 * L'appli ne dépend ainsi pas de ce gros script pour s'afficher : seul l'écran Carte l'attend.
 */
const SRC = "vendor/maplibre-gl/maplibre-gl.js";
const ATTEMPTS = 4;
let pending = null;

function injectScript() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SRC;
    script.onload = () => resolve(window.maplibregl);
    script.onerror = () => {
      script.remove();
      reject(new Error(`Chargement de ${SRC} impossible`));
    };
    document.head.append(script);
  });
}

export function loadMapLibre() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  pending ??= (async () => {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
      try {
        return await injectScript();
      } catch (error) {
        if (attempt === ATTEMPTS) throw error;
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }
    return null;
  })().catch((error) => {
    pending = null;
    throw error;
  });
  return pending;
}
