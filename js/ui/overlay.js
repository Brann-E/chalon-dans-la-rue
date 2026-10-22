import { h } from "../dom.js";

/**
 * Couche d'affichage au-dessus de l'écran courant et de la barre du bas :
 * fiche d'un lieu, feuilles de filtres, sélecteur de créneau.
 * Un seul panneau à la fois ; la fermeture rejoue la transition en sens inverse.
 * Clavier : Échap ferme le panneau, Tab reste dans le panneau, et le focus revient où il était à la fermeture.
 */
const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select, textarea, [tabindex]:not([tabindex="-1"])';

let layer = null;
let current = null;
let previousFocus = null;

const focusables = (panel) => [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);

function onKeydown(event) {
  if (!current) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeOverlay();
    return;
  }
  if (event.key !== "Tab") return;
  const items = focusables(current);
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && (document.activeElement === first || !current.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !current.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
  }
}

export function initOverlay(host) {
  layer = h("div", { class: "overlay-layer" });
  host.append(layer);
  document.addEventListener("keydown", onKeydown);
}

export const hasOverlay = () => current !== null;

/** @param {HTMLElement} panel élément du panneau ; @param {{kind?: string}} [options] kind : fade | slide-up | slide-left */
export function openOverlay(panel, { kind = "fade" } = {}) {
  closeOverlay({ immediate: true });
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  panel.classList.add("overlay-panel", `overlay-panel--${kind}`);
  panel.setAttribute("role", "dialog");
  layer.append(panel);
  current = panel;
  requestAnimationFrame(() => panel.classList.add("is-open"));
  // Le focus passe au premier élément du panneau (la croix, en général).
  focusables(panel)[0]?.focus({ preventScroll: true });
  return panel;
}

export function closeOverlay({ immediate = false } = {}) {
  if (!current) return;
  const panel = current;
  current = null;
  previousFocus?.focus?.({ preventScroll: true });
  previousFocus = null;
  if (immediate) {
    panel.remove();
    return;
  }
  panel.classList.remove("is-open");
  panel.addEventListener("transitionend", () => panel.remove(), { once: true });
  setTimeout(() => panel.remove(), 400); // filet de sécurité si la transition ne se déclenche pas
}
