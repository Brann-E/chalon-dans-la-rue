import { h, img } from "../dom.js";
import { loadJSON } from "../data.js";
import * as store from "../store.js";
import { createServicePin } from "../map/markers.js";

/** Pastille de légende de chaque calque (couleurs = tokens de la carte). */
const DOTS = {
  spectacle: "--color-brand",
  festival: "--color-pin-festival",
  convivialite: "--color-pin-convivialite",
};
// Calques dont la légende reprend le repère de la carte (même icône, même couleur).
const SERVICE_LAYERS = new Set(["water", "wc", "wc-pmr", "shower", "parking", "parking-pmr", "restauration", "buvette"]);

function createIcon(layer) {
  const box = h("span", { class: "mapfilters__icon", "aria-hidden": "true" });
  if (layer.key === "position") box.append(img("assets/pitre.png"));
  else if (SERVICE_LAYERS.has(layer.key)) box.append(createServicePin({ type: layer.key, label: layer.label }));
  else {
    const dot = h("span", { class: "mapfilters__dot" });
    dot.style.setProperty("--dot", `var(${DOTS[layer.key]})`);
    box.append(dot);
  }
  return box;
}

/** Feuille « Filtres carte » : calques affichés sur le plan ; la carte se met à jour en direct. */
export async function createMapFiltersPanel() {
  const layers = await loadJSON("data/layers.json");

  const rows = layers.map((layer) => {
    const input = h("input", { type: "checkbox", dataset: { layer: layer.key } });
    input.checked = store.isLayerOn(layer.key, layer.default);
    input.addEventListener("change", () => store.setLayer(layer.key, input.checked));
    return h("li", {}, h("label", { class: "mapfilters__row" }, input, h("span", { class: "checkbox" }, img("assets/verifier.png")), createIcon(layer), layer.label));
  });

  return h(
    "section",
    { class: "mapfilters", "aria-label": "Filtres de la carte" },
    h(
      "div",
      { class: "mapfilters__stack" },
      h("div", { class: "mapfilters__card" }, h("h2", { class: "mapfilters__heading" }, "Filtrez les éléments de la carte"), h("ul", { class: "mapfilters__list" }, rows)),
      // Le bouton reprend exactement la place et l'aspect du bouton filtre de la carte : son icône « curseurs »
      // pivote et se change en croix à l'ouverture, puis fait le chemin inverse à la fermeture.
      h(
        "button",
        {
          class: "mapfilters__confirm",
          type: "button",
          "aria-label": "Fermer",
          onclick: (event) => event.currentTarget.dispatchEvent(new CustomEvent("close-overlay", { bubbles: true })),
        },
        img("assets/sliders.png", { class: "mapfilters__morph mapfilters__morph--filter" }),
        img("assets/fermer.png", { class: "mapfilters__morph mapfilters__morph--close" })
      )
    )
  );
}
