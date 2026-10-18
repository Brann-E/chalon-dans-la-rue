import { h, img } from "../dom.js";

/** Pastille numérotée d'un lieu (cercle plein, liseré blanc intérieur, numéro en gras). */
export function createVenuePin(venue, onSelect) {
  return h(
    "button",
    {
      class: "map-pin",
      type: "button",
      "aria-label": `${venue.name}, repère ${venue.spot}`,
      dataset: { kind: venue.kind, spot: venue.spot },
      onclick: (event) => {
        event.stopPropagation();
        onSelect(venue);
      },
    },
    String(venue.spot)
  );
}

/** Repère de service (sanitaires, eau, parking…) : rond bleu avec son sigle. */
const SERVICE_GLYPHS = { wc: "WC", "wc-pmr": "WC", water: "", shower: "", parking: "P", "parking-pmr": "P" };

export function createServicePin(service) {
  return h(
    "span",
    { class: "map-service", role: "img", "aria-label": service.label, dataset: { type: service.type } },
    SERVICE_GLYPHS[service.type] ?? ""
  );
}

/** Marqueur « Ma position » : le clown de la maquette. */
export function createUserMarker(onClick) {
  return h("button", { class: "map-user", type: "button", "aria-label": "Ma position", onclick: onClick }, img("assets/pitre.png"));
}

/** Bulle « CLICK HERE » de la maquette, accrochée au repère de démonstration. */
export function createHintBubble() {
  return h("span", { class: "map-hint", "aria-hidden": "true" }, img("assets/cliquez-ici.png"));
}
