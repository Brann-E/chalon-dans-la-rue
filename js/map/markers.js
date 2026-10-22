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
        const pin = event.currentTarget;
        // Onde jaune au clic ; la fiche s'ouvre une fraction de seconde après, le temps de la voir partir.
        pin.classList.remove("is-ping");
        void pin.offsetWidth; // permet de rejouer l'animation à un second clic
        pin.classList.add("is-ping");
        pin.addEventListener("animationend", () => pin.classList.remove("is-ping"), { once: true });
        setTimeout(() => onSelect(venue), PING_LEAD_MS);
      },
    },
    String(venue.spot)
  );
}

const PING_LEAD_MS = 180;

/** Repère de service (sanitaires, eau, parking…) : rond bleu avec son sigle. */
const SERVICE_GLYPHS = { wc: "WC", "wc-pmr": "WC" };
const SERVICE_ICONS = {
  water: "assets/service-water.svg",
  shower: "assets/service-shower.svg",
  parking: "assets/service-parking.svg",
  "parking-pmr": "assets/service-parking.svg",
  restauration: "assets/service-restauration.svg",
  buvette: "assets/service-buvette.svg",
};
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
