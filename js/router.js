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

export async function navigate(id) {
  const definition = screens.get(id);
  if (!definition) throw new Error(`Écran inconnu : ${id}`);
  const element = await definition.render();
  host.replaceChildren(element);
  currentId = id;
  onChange({ id, tab: definition.tab ?? id });
}

export const current = () => currentId;
export const has = (id) => screens.has(id);
