import { h } from "../dom.js";

/** Gabarit commun des écrans : en-tête jaune (titre centré) + corps défilant. */
export function createScreen({ id, title, body }) {
  return h(
    "section",
    { class: "screen", dataset: { screen: id } },
    h("header", { class: "screen__header" }, h("h1", { class: "screen__title" }, title)),
    h("div", { class: "screen__body" }, body)
  );
}
