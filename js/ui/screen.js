import { h } from "../dom.js";

/**
 * Gabarit commun des écrans : en-tête jaune (titre centré) + corps défilant.
 * @param {{id: string, title: string, body: Node|Node[], above?: Node, titleShifted?: boolean, softLine?: boolean, bodyClass?: string}} options
 *   `above` : bloc fixe sous l'en-tête (ex. barre de recherche).
 */
export function createScreen({ id, title, body, above, titleShifted = false, softLine = false, bodyClass = "" }) {
  return h(
    "section",
    { class: "screen", dataset: { screen: id } },
    h(
      "header",
      { class: softLine ? "screen__header screen__header--soft" : "screen__header" },
      h("h1", { class: titleShifted ? "screen__title screen__title--shifted" : "screen__title" }, title)
    ),
    above,
    h("div", { class: `screen__body ${bodyClass}`.trim() }, body)
  );
}
