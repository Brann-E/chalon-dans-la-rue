import { h, img } from "../dom.js";

const go = (el, to) => el.dispatchEvent(new CustomEvent("navigate", { bubbles: true, detail: { to } }));

/**
 * État vide de la maquette (Favoris, Planning) : titre surligné, message, illustration,
 * consigne et deux boutons d'orientation.
 * @param {{title: string, lead: string, art: string, hint: string}} content
 */
export function createEmptyState({ title, lead, art, hint, shortHint = false, narrowHighlight = false }) {
  return h(
    "div",
    { class: "empty" },
    h("h2", { class: "empty__title", dataset: narrowHighlight ? { highlight: "narrow" } : {} }, title),
    h("p", { class: "empty__lead" }, lead),
    img(art, { class: "empty__art" }),
    h("p", { class: shortHint ? "empty__hint empty__hint--short" : "empty__hint" }, hint),
    h(
      "button",
      { class: "cta cta--centered", type: "button", onclick: (event) => go(event.currentTarget, "carte") },
      img("assets/binoculars.png", { class: "cta__icon--large" }),
      "Retourner sur la carte"
    ),
    h(
      "button",
      { class: "cta", type: "button", onclick: (event) => go(event.currentTarget, "decouvrir") },
      img("assets/megaphone.png", { class: "cta__icon--small" }),
      "Découvrir des spectacles"
    )
  );
}

/** Bouton de démonstration en bas à droite : « Remplir la page » (maquette) ou « Vider la page » pour revenir à l'état vide. */
export const createDemoFill = (onClick, label = "Remplir la page") => h("button", { class: "demo-fill", type: "button", onclick: onClick }, label);
