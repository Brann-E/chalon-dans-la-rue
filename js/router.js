/**
 * Routeur minimal : un registre d'écrans, un conteneur, un onglet actif.
 * Les transitions de Figma (smart animate, glissement, fondu) sont ajoutées ici.
 */
const screens = new Map();
let host = null;
let onChange = () => {};
let currentId = null;

export function initRouter(container, changeHandler) {
  host = container;
  onChange = changeHandler;
}

/** @param {string} id @param {{tab?: string, render: () => Promise<HTMLElement>|HTMLElement}} definition */
export function register(id, definition) {
  screens.set(id, definition);
}

export async function navigate(id, params = {}) {
  const definition = screens.get(id);
  if (!definition) throw new Error(`Écran inconnu : ${id}`);
  const element = await definition.render(params);
  const first = host.childElementCount === 0;
  host.replaceChildren(element);
  // Transitions de la maquette : le Menu glisse depuis la droite, le reste se fond (« smart animate », « dissolve »).
  const transition = definition.transition ?? "fade";
  if (!first && transition !== "none") {
    element.classList.add(`enter-${transition}`);
    element.addEventListener("animationend", () => element.classList.remove(`enter-${transition}`), { once: true });
  }
  currentId = id;
  const tab = typeof definition.tab === "function" ? definition.tab(params) : (definition.tab ?? id);
  onChange({ id, tab });
}

export const current = () => currentId;
export const has = (id) => screens.has(id);
