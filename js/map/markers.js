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
const SERVICE_GLYPHS = { wc: "WC", "wc-pmr": "WC", parking: "P", "parking-pmr": "P" };
const SERVICE_ICONS = { water: "assets/service-water.svg", shower: "assets/service-shower.svg" };
const PMR_TYPES = new Set(["wc-pmr", "parking-pmr"]);

export function createServicePin(service) {
  const pin = h(
    "span",
    { class: "map-service", role: "img", "aria-label": service.label, dataset: { type: service.type } },
    SERVICE_ICONS[service.type] ? img(SERVICE_ICONS[service.type], { class: "map-service__glyph" }) : (SERVICE_GLYPHS[service.type] ?? "")
  );
  // Les repères accessibles portent un petit médaillon « fauteuil » en bas à droite.
  if (PMR_TYPES.has(service.type)) pin.append(h("span", { class: "map-service__badge" }, img("assets/service-pmr.svg")));
  return pin;
}

/** Marqueur « Ma position » : le clown de la maquette. */
export function createUserMarker(onClick) {
  return h("button", { class: "map-user", type: "button", "aria-label": "Ma position", onclick: onClick }, img("assets/pitre.png"));
}

/** Bulle « CLICK HERE » de la maquette, accrochée au repère de démonstration. */
export function createHintBubble() {
  return h("span", { class: "map-hint", "aria-hidden": "true" }, img("assets/cliquez-ici.png"));
}
