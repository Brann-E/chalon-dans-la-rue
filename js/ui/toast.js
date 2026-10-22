import { h } from "../dom.js";

/**
 * Confirmation brève en bas de l'écran, au-dessus de la barre du bas, avec une action facultative (« Annuler »).
 * Une seule à la fois : la nouvelle remplace la précédente.
 */
const VISIBLE_MS = 4000;
const HIDE_MS = 300; // = durée de la transition de sortie (--duration-move)

let layer = null;
let current = null;
let timer = null;

export function initToast(host) {
  layer = h("div", { class: "toast-layer", "aria-live": "polite" });
  host.append(layer);
}

function hide(toast) {
  clearTimeout(timer);
  toast.classList.remove("is-visible");
  setTimeout(() => toast.remove(), HIDE_MS);
  if (current === toast) current = null;
}

/** @param {{message: string, actionLabel?: string, onAction?: () => void}} options */
export function showToast({ message, actionLabel = null, onAction = null }) {
  if (!layer) return;
  clearTimeout(timer);
  current?.remove();

  const toast = h(
    "div",
    { class: "toast", role: "status" },
    h("span", { class: "toast__text" }, message),
    actionLabel &&
      h(
        "button",
        {
          class: "toast__action",
          type: "button",
          onclick: () => {
            onAction?.();
            hide(toast);
          },
        },
        actionLabel
      )
  );
  layer.append(toast);
  current = toast;
  void toast.offsetWidth; // force le calcul du style de départ pour que l'apparition s'anime
  toast.classList.add("is-visible");
  timer = setTimeout(() => hide(toast), VISIBLE_MS);
}
