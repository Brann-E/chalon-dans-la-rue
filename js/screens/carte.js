import { h, img } from "../dom.js";
import { loadJSON } from "../data.js";
import { loadShows } from "../shows.js";
import * as store from "../store.js";
import { buildStyle } from "../map/style.js";
import { createVenuePin, createServicePin, createUserMarker, createHintBubble } from "../map/markers.js";

/**
 * Écran Carte (Accueil) : vraie carte interactive MapLibre centrée sur le centre-ville de
 * Chalon-sur-Saône, avec les 82 lieux du plan du festival, les services (OpenStreetMap),
 * une recherche à suggestions et le bouton filtre. Les calques se règlent dans « Filtres carte ».
 * L'écran est un singleton : le fond de carte garde sa vue quand on change d'onglet.
 */
const DEMO_HINT_SPOT = 68; // repère portant la bulle « CLICK HERE » de la maquette
const USER_FALLBACK = [4.8545, 46.7809]; // position de démonstration du clown
const FOCUS_ZOOM = 17;

let screen = null;
let map = null;
let venues = [];
let shows = [];
let layerDefs = [];
const venuePins = new Map(); // spot -> { venue, el }
const layered = []; // { layer, el } : tout repère rattaché à un calque

const normalize = (text) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const emit = (name, detail) => screen.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));

function applyLayers() {
  const byKey = new Map(layerDefs.map((layer) => [layer.key, layer]));
  for (const { layer, el } of layered) {
    el.classList.toggle("is-hidden", !store.isLayerOn(layer, byKey.get(layer)?.default ?? true));
  }
}

function focusVenue(spot) {
  const entry = venuePins.get(Number(spot));
  if (!entry) return;
  map.flyTo({ center: [entry.venue.lng, entry.venue.lat], zoom: Math.max(map.getZoom(), FOCUS_ZOOM), duration: 800 });
  entry.el.classList.add("is-focus");
  setTimeout(() => entry.el.classList.remove("is-focus"), 2600);
}

function selectVenue(venue) {
  venuePins.get(venue.spot)?.el.querySelector(".map-hint")?.remove();
  emit("open-venue", { spot: venue.spot });
}

/** Suggestions : lieux par nom ou adresse, spectacles par titre / compagnie / catégorie. */
function suggestionsFor(query) {
  const q = normalize(query.trim());
  if (!q) return [];
  const results = [];
  for (const venue of venues) {
    if (normalize(`${venue.name} ${venue.address}`).includes(q)) {
      results.push({ label: venue.name, sub: `Repère ${venue.spot}${venue.address ? ` · ${venue.address}` : ""}`, spot: venue.spot });
    }
  }
  for (const show of shows) {
    if (normalize([show.title, show.company, show.category].join(" ")).includes(q)) {
      results.push({ label: show.title, sub: `${show.company} · ${show.reps[0].venue}`, spot: show.reps[0].spot });
    }
  }
  return results.slice(0, 6);
}

function createSearch() {
  const input = h("input", {
    class: "map-search__input",
    type: "search",
    placeholder: "Recherchez un lieu, un artiste,...",
    "aria-label": "Rechercher un lieu ou un artiste",
    autocomplete: "off",
  });
  const list = h("ul", { class: "map-suggestions", hidden: true, role: "listbox" });

  const close = () => {
    list.hidden = true;
    list.replaceChildren();
  };
  const choose = (suggestion) => {
    input.value = "";
    close();
    input.blur();
    focusVenue(suggestion.spot);
  };

  input.addEventListener("input", () => {
    const items = suggestionsFor(input.value);
    list.replaceChildren(
      ...items.map((item) =>
        h(
          "li",
          { role: "option" },
          h(
            "button",
            { class: "map-suggestions__item", type: "button", onclick: () => choose(item) },
            item.label,
            h("span", { class: "map-suggestions__sub" }, item.sub)
          )
        )
      )
    );
    list.hidden = items.length === 0;
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
    if (event.key === "Enter") {
      event.preventDefault();
      const first = suggestionsFor(input.value)[0];
      if (first) choose(first);
    }
  });

  const form = h(
    "form",
    { class: "map-search", role: "search", onsubmit: (event) => event.preventDefault() },
    input,
    img("assets/search.png", { class: "map-search__icon" })
  );
  return [form, list];
}

function locateUser(marker) {
  if (!("geolocation" in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const lngLat = [coords.longitude, coords.latitude];
      const bounds = map.getMaxBounds();
      if (bounds && bounds.contains(lngLat)) {
        marker.setLngLat(lngLat);
        map.flyTo({ center: lngLat, zoom: FOCUS_ZOOM, duration: 800 });
      }
    },
    () => {
      /* refus ou indisponible : le clown reste à sa position de démonstration */
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

async function build() {
  const [venueData, services, showData, event, layers] = await Promise.all([
    loadJSON("data/venues.json"),
    loadJSON("data/services.json"),
    loadShows(),
    loadJSON("data/event.json"),
    loadJSON("data/layers.json"),
  ]);
  venues = venueData;
  shows = showData;
  layerDefs = layers;

  const canvas = h("div", { class: "map-canvas" });
  const filterButton = h(
    "button",
    {
      class: "map-filter",
      type: "button",
      "aria-label": "Filtrer la carte",
      onclick: (e) => e.currentTarget.dispatchEvent(new CustomEvent("open-map-filters", { bubbles: true })),
    },
    img("assets/sliders.png")
  );
  screen = h("section", { class: "screen screen--map", dataset: { screen: "carte" } }, canvas, ...createSearch(), filterButton);

  const maplibregl = window.maplibregl;
  map = new maplibregl.Map({
    container: canvas,
    style: buildStyle(),
    center: [event.center.lng + 0.0045, event.center.lat + 0.0006],
    zoom: 15.6,
    minZoom: 13.5,
    maxZoom: 19,
    maxBounds: [[4.82, 46.76], [4.9, 46.805]],
    attributionControl: false,
    dragRotate: false,
    pitchWithRotate: false,
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

  for (const service of services) {
    const el = createServicePin(service);
    layered.push({ layer: service.type, el });
    new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([service.lng, service.lat]).addTo(map);
  }
  for (const venue of venues) {
    const el = createVenuePin(venue, selectVenue);
    if (venue.spot === DEMO_HINT_SPOT) el.append(createHintBubble());
    venuePins.set(venue.spot, { venue, el });
    layered.push({ layer: venue.kind, el });
    new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([venue.lng, venue.lat]).addTo(map);
  }

  const userEl = createUserMarker(() => locateUser(userMarker));
  const userMarker = new maplibregl.Marker({ element: userEl, anchor: "center" }).setLngLat(USER_FALLBACK).addTo(map);
  layered.push({ layer: "position", el: userEl });

  applyLayers();
  store.subscribe(applyLayers);
}

/** @param {{focus?: {spot: number}}} [params] */
export async function renderCarte(params = {}) {
  if (!screen) await build();
  requestAnimationFrame(() => {
    map.resize();
    if (params.focus) focusVenue(params.focus.spot);
  });
  return screen;
}
