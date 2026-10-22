import { h, img } from "../dom.js";
import { createNewsButton } from "./news-button.js";

/**
 * Gabarit commun des écrans : en-tête jaune (titre centré) + corps défilant.
 * @param {{id: string, title: string, body: Node|Node[], above?: Node, softLine?: boolean, bodyClass?: string,
 *   back?: {to: string, params?: object}}} options
 *   `above` : bloc fixe sous l'en-tête (ex. barre de recherche).
 *   `back` : écran vers lequel ramène la flèche à gauche du titre (sous-pages du Menu).
 */
export function createScreen({ id, title, body, above, softLine = false, bodyClass = "", back = null }) {
  const backButton =
    back &&
    h(
      "button",
      {
        class: "screen__back",
        type: "button",
        "aria-label": "Retour",
        onclick: (event) =>
          event.currentTarget.dispatchEvent(new CustomEvent("navigate", { bubbles: true, detail: { to: back.to, params: back.params, options: { transition: "fade" } } })),
      },
      img("assets/chevron.png")
    );
  return h(
    "section",
    { class: "screen", dataset: { screen: id } },
    h(
      "header",
      { class: softLine ? "screen__header screen__header--soft" : "screen__header" },
      backButton,
      h("h1", { class: "screen__title" }, title),
      createNewsButton() // la cloche des actualités, en haut à droite de chaque écran
    ),
    above,
    h("div", { class: `screen__body ${bodyClass}`.trim() }, body)
  );
}
