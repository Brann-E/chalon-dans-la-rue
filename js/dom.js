/**
 * Crée un élément DOM. Pas de style en ligne : les valeurs de design vivent dans les CSS.
 * @param {string} tag
 * @param {Record<string, unknown>} [props] class, dataset, on* (écouteurs) ou attributs
 * @param {...(Node|string|null|false)} children
 * @returns {HTMLElement}
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key === "dataset") Object.assign(el.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(child));
  }
  return el;
}

export function img(src, props = {}) {
  return h("img", { src, alt: "", draggable: "false", ...props });
}
