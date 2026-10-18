import { h } from "../dom.js";

/**
 * Couche d'affichage au-dessus de l'écran courant et de la barre du bas :
 * fiche d'un lieu, fiche d'un spectacle, feuilles de filtres.
 * Un seul panneau à la fois ; la fermeture rejoue la transition en sens inverse.
 */
let layer = null;
let current = null;

export function initOverlay(host) {
  layer = h("div", { class: "overlay-layer" });
  host.append(layer);
}

export const hasOverlay = () => current !== null;

/** @param {HTMLElement} panel élément du panneau ; @param {{kind?: string}} [options] kind : fade | slide-up | slide-left */
export function openOverlay(panel, { kind = "fade" } = {}) {
  closeOverlay({ immediate: true });
  panel.classList.add("overlay-panel", `overlay-panel--${kind}`);
  layer.append(panel);
  current = panel;
  requestAnimationFrame(() => panel.classList.add("is-open"));
  return panel;
}

export function closeOverlay({ immediate = false } = {}) {
  if (!current) return;
  const panel = current;
  current = null;
  if (immediate) {
    panel.remove();
    return;
  }
  panel.classList.remove("is-open");
  panel.addEventListener("transitionend", () => panel.remove(), { once: true });
  setTimeout(() => panel.remove(), 400); // filet de sécurité si la transition ne se déclenche pas
}
