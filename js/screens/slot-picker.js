import { h, img } from "../dom.js";
import { loadShows } from "../shows.js";
import * as store from "../store.js";

/**
 * Feuille « Changer le créneau » : toutes les représentations d'un spectacle, la sélectionnée est cerclée.
 * Choisir une ligne épingle ce créneau dans le Planning et ferme la feuille.
 */
export async function createSlotPicker({ id, fallbackIndex = 0 }) {
  const show = (await loadShows()).find((s) => s.id === id);
  const close = (el) => el.dispatchEvent(new CustomEvent("close-overlay", { bubbles: true }));
  const current = store.pinnedIndex(id) ?? fallbackIndex;

  const rows = show.reps.map((rep, index) =>
    h(
      "button",
      {
        class: "list-row",
        type: "button",
        "aria-pressed": String(index === current),
        onclick: (event) => {
          store.setPin(id, index);
          close(event.currentTarget);
        },
      },
      h("span", { class: "badge" }, String(rep.spot)),
      h("span", { class: "list-row__text" }, h("span", { class: "list-row__title" }, `${rep.date} - ${rep.time}`), h("span", { class: "list-row__sub" }, rep.venue))
    )
  );

  const panel = h(
    "section",
    { class: "slot-picker", "aria-label": `Changer le créneau : ${show.title}`, onclick: (event) => event.target === panel && close(panel) },
    h(
      "div",
      { class: "slot-picker__sheet" },
      h(
        "header",
        { class: "slot-picker__header" },
        h("h2", { class: "slot-picker__title" }, "Changer le créneau"),
        h("button", { class: "slot-picker__close", type: "button", "aria-label": "Fermer", onclick: (event) => close(event.currentTarget) }, img("assets/fermer.png"))
      ),
      h("p", { class: "slot-picker__show" }, show.title),
      h("div", { class: "list" }, rows)
    )
  );
  return panel;
}
