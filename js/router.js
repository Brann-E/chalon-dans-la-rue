/**
 * Routeur minimal : un registre d'écrans, un conteneur, un onglet actif.
 * - Transition en fondu enchaîné : l'écran quitté reste dessous pendant que le nouveau apparaît (le Menu glisse par-dessus).
 * - Le défilement de chaque écran est mémorisé et rétabli au retour (la liste de Découvrir ne repart pas du haut).
 * - Si l'affichage d'un écran dure, un indicateur de chargement apparaît ; s'il échoue, un écran d'erreur propose de réessayer.
 */
const screens = new Map();
const scrollMemory = new Map();
let host = null;
let onChange = () => {};
let loader = null;
let onError = null;
let currentId = null;
let currentKey = null;
let navigationToken = 0;

const LOADER_DELAY = 250; // ms : en dessous, pas d'indicateur (évite un clignotement)
const LEAVE_DELAY = 400; // ms : filet de sécurité pour retirer l'écran quitté (> durée de la transition)

/** @param {{loader?: HTMLElement, onError?: (error: Error, retry: () => void) => HTMLElement}} [hooks] */
export function initRouter(container, changeHandler, hooks = {}) {
  host = container;
  onChange = changeHandler;
  loader = hooks.loader ?? null;
  onError = hooks.onError ?? null;
}

/** @param {string} id @param {{tab?: string, render: () => Promise<HTMLElement>|HTMLElement}} definition */
export function register(id, definition) {
  screens.set(id, definition);
}

// Une même page peut exister avec plusieurs contenus (sous-pages du Menu, fiches) : la clé les distingue.
const keyOf = (id, params) => (params?.id ? `${id}:${params.id}` : id);
const bodyOf = (element) => element?.querySelector?.(".screen__body");

const showLoader = (visible) => {
  if (loader) loader.hidden = !visible;
};

/**
 * @param {{transition?: "fade"|"slide-right"|"none", restore?: boolean}} [options]
 *   transition : force la transition d'entrée (ex. au retour d'une sous-page)
 *   restore : false pour repartir du haut au lieu de rétablir le défilement mémorisé (ex. après un changement de filtres)
 */
export async function navigate(id, params = {}, options = {}) {
  const definition = screens.get(id);
  if (!definition) throw new Error(`Écran inconnu : ${id}`);
  const token = ++navigationToken;
  const key = keyOf(id, params);

  const timer = setTimeout(() => showLoader(true), LOADER_DELAY);
  let element;
  try {
    element = await definition.render(params ?? {});
  } catch (error) {
    clearTimeout(timer);
    showLoader(false);
    if (token !== navigationToken) return;
    if (!onError) throw error;
    element = onError(error, () => navigate(id, params, options));
  }
  clearTimeout(timer);
  showLoader(false);
  if (token !== navigationToken) return; // une navigation plus récente a pris le relais

  // Défilement de l'écran quitté.
  const previous = host.querySelector(":scope > .screen:not(.is-leaving)");
  if (previous && previous !== element && currentKey) scrollMemory.set(currentKey, bodyOf(previous)?.scrollTop ?? 0);

  // Les écrans encore en train de partir sont retirés tout de suite (sauf celui qu'on réaffiche).
  host.querySelectorAll(":scope > .is-leaving").forEach((leaving) => {
    if (leaving !== element) leaving.remove();
  });
  element.classList.remove("is-leaving");

  const transition = options?.transition ?? definition.transition ?? "fade";
  const animate = Boolean(previous) && previous !== element && transition !== "none";

  if (previous !== element) host.append(element);
  if (animate) {
    previous.classList.add("is-leaving"); // sous le nouvel écran, sans réaction au toucher
    element.classList.add(`enter-${transition}`);
    const finish = () => {
      element.classList.remove(`enter-${transition}`);
      if (previous.classList.contains("is-leaving")) previous.remove();
    };
    element.addEventListener("animationend", finish, { once: true });
    setTimeout(finish, LEAVE_DELAY);
  } else if (previous && previous !== element) {
    previous.remove();
  }

  if (options?.restore !== false && scrollMemory.has(key)) {
    const body = bodyOf(element);
    if (body) body.scrollTop = scrollMemory.get(key);
  }

  currentId = id;
  currentKey = key;
  const tab = typeof definition.tab === "function" ? definition.tab(params) : (definition.tab ?? id);
  onChange({ id, tab });
}

export const current = () => currentId;
export const has = (id) => screens.has(id);
