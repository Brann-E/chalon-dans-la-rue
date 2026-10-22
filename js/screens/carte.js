import { h, img } from "../dom.js";
import { loadJSON } from "../data.js";
import { loadShows } from "../shows.js";
import * as store from "../store.js";
import { buildStyle } from "../map/style.js";
import { loadMapLibre } from "../map/loader.js";
import { createVenuePin, createServicePin, createUserMarker } from "../map/markers.js";
import { createNewsButton } from "../ui/news-button.js";
import { fetchWalkingRoute, straightRoute, formatDuration, formatDistance } from "../map/route.js";

/**
 * Écran Carte (Accueil) : vraie carte interactive MapLibre centrée sur le centre-ville de
 * Chalon-sur-Saône, avec les 82 lieux du plan du festival, les services (OpenStreetMap),
 * une recherche à suggestions et le bouton filtre. Les calques se règlent dans « Filtres carte ».
 * L'écran est un singleton : le fond de carte garde sa vue quand on change d'onglet.
 */
const USER_FALLBACK = [4.8531, 46.77942]; // position de démonstration du clown : sur le quai Gambetta, au niveau de la rue des Lancharres
const DEFAULT_AVATAR = "assets/pitre.png";
const FOCUS_ZOOM = 17;

let screen = null;
let map = null;
let building = null; // construction unique, même si l'écran est demandé plusieurs fois d'affilée
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
  emit("open-venue", { spot: venue.spot });
}

// ---- Itinéraire à pied : de la position (le clown) jusqu'à un lieu ---------------------------
const ROUTE_SOURCE = "route";
const EMPTY_ROUTE = { type: "FeatureCollection", features: [] };
const FIT_PADDING = { top: 180, bottom: 220, left: 48, right: 48 }; // laisse voir le tracé entre le bandeau et la barre du bas
let userMarker = null;
let routeBanner = null;
let routeToken = 0; // pour ignorer un calcul devenu obsolète (nouvel itinéraire demandé, ou tracé effacé)

const cssToken = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Le tracé est une suite de vrais ronds (calque « circle » : toujours ronds, quel que soit le zoom). Leur écart à l'écran
// doit rester constant : on les replace le long du trajet à chaque changement de zoom.
let routePath = null; // { coordinates, estimated }

function ensureRouteLayers() {
  if (map.getSource(ROUTE_SOURCE)) return;
  map.addSource(ROUTE_SOURCE, { type: "geojson", data: EMPTY_ROUTE });
  const outline = parseFloat(cssToken("--route-dot-outline"));
  map.addLayer({
    id: "route-dots",
    type: "circle",
    source: ROUTE_SOURCE,
    paint: {
      "circle-radius": parseFloat(cssToken("--route-dot-size")) / 2,
      "circle-color": ["get", "color"],
      "circle-stroke-width": outline,
      "circle-stroke-color": cssToken("--color-black"),
    },
  });
  map.on("zoom", drawRouteDots);
}

/** Points régulièrement espacés (en pixels d'écran) le long du trajet, jaune et bleu en alternance. */
function routeDots(coordinates) {
  const spacing = parseFloat(cssToken("--route-dot-spacing"));
  const meters = (a, b) => {
    const k = 111320;
    const dx = (b[0] - a[0]) * k * Math.cos((a[1] * Math.PI) / 180);
    const dy = (b[1] - a[1]) * k;
    return Math.hypot(dx, dy);
  };
  const step = spacing * ((78271.517 * Math.cos((coordinates[0][1] * Math.PI) / 180)) / 2 ** map.getZoom());
  const colors = [cssToken("--color-yellow"), cssToken("--color-sky")];
  const features = [];
  let next = step; // distance (en mètres) du prochain point
  let walked = 0;
  for (let i = 1; i < coordinates.length; i += 1) {
    const from = coordinates[i - 1];
    const to = coordinates[i];
    const length = meters(from, to);
    while (length > 0 && walked + length >= next) {
      const t = (next - walked) / length;
      features.push({
        type: "Feature",
        properties: { color: colors[features.length % 2] },
        geometry: { type: "Point", coordinates: [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t] },
      });
      next += step;
    }
    walked += length;
  }
  // Pas de point collé à l'arrivée : le repère du lieu prend le relais.
  if (features.length > 0 && walked - (next - step) < step / 2) features.pop();
  return { type: "FeatureCollection", features };
}

function drawRouteDots() {
  if (!routePath || !map.getSource(ROUTE_SOURCE)) return;
  map.getSource(ROUTE_SOURCE).setData(routeDots(routePath.coordinates));
}

function setRouteBanner({ headline, destination }) {
  routeBanner.querySelector(".route-banner__time").textContent = headline;
  routeBanner.querySelector(".route-banner__dest").textContent = destination;
  routeBanner.hidden = false;
}

function clearRoute() {
  routeToken += 1;
  routePath = null;
  if (map?.getSource(ROUTE_SOURCE)) map.getSource(ROUTE_SOURCE).setData(EMPTY_ROUTE);
  if (routeBanner) routeBanner.hidden = true;
}

async function routeTo(spot) {
  const entry = venuePins.get(Number(spot));
  if (!entry) return;
  const token = ++routeToken;
  const destination = `À pied vers ${entry.venue.name}`;
  setRouteBanner({ headline: "Calcul de l’itinéraire…", destination });

  if (!map.loaded()) await new Promise((resolve) => map.once("idle", resolve));
  ensureRouteLayers();

  const from = userMarker.getLngLat().toArray();
  const to = [entry.venue.lng, entry.venue.lat];
  let route;
  try {
    route = await fetchWalkingRoute(from, to);
  } catch {
    route = straightRoute(from, to); // service indisponible : ligne droite et durée estimée
  }
  if (token !== routeToken) return;

  routePath = { coordinates: route.coordinates, estimated: route.estimated };
  map.setPaintProperty("route-dots", "circle-opacity", route.estimated ? parseFloat(cssToken("--route-estimated-opacity")) : 1);
  map.setPaintProperty("route-dots", "circle-stroke-opacity", route.estimated ? parseFloat(cssToken("--route-estimated-opacity")) : 1);
  drawRouteDots();
  setRouteBanner({ headline: `${formatDuration(route.duration)} · ${formatDistance(route.distance)}${route.estimated ? " (estimé)" : ""}`, destination });

  const lngs = route.coordinates.map(([lng]) => lng);
  const lats = route.coordinates.map(([, lat]) => lat);
  map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: FIT_PADDING, maxZoom: FOCUS_ZOOM, duration: 800 });
  entry.el.classList.add("is-focus");
  setTimeout(() => entry.el.classList.remove("is-focus"), 2600);
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
  routeBanner = h(
    "div",
    { class: "route-banner", role: "status", hidden: true },
    h("div", { class: "route-banner__text" }, h("span", { class: "route-banner__time" }), h("span", { class: "route-banner__dest" })),
    h("button", { class: "route-banner__close", type: "button", "aria-label": "Effacer l’itinéraire", onclick: clearRoute }, img("assets/fermer.png"))
  );
  screen = h("section", { class: "screen screen--map", dataset: { screen: "carte" } }, canvas, ...createSearch(), filterButton, createNewsButton({ floating: true }), routeBanner);

  const maplibregl = await loadMapLibre();
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
    venuePins.set(venue.spot, { venue, el });
    layered.push({ layer: venue.kind, el });
    new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([venue.lng, venue.lat]).addTo(map);
  }

  const userEl = createUserMarker(() => locateUser(userMarker));
  userMarker = new maplibregl.Marker({ element: userEl, anchor: "center" }).setLngLat(USER_FALLBACK).addTo(map);
  layered.push({ layer: "position", el: userEl });

  // L'avatar choisi dans le Menu remplace le clown sur la carte.
  const syncAvatar = () => userEl.querySelector("img").setAttribute("src", store.getSetting("avatar", DEFAULT_AVATAR));
  syncAvatar();

  applyLayers();
  store.subscribe(() => {
    applyLayers();
    syncAvatar();
  });
}

/** @param {{focus?: {spot: number}, route?: {spot: number}}} [params] focus : centrer sur un lieu ; route : tracer l'itinéraire à pied jusqu'à un lieu */
export async function renderCarte(params = {}) {
  building ??= build();
  await building;
  requestAnimationFrame(() => {
    map.resize();
    if (params.route) routeTo(params.route.spot);
    else if (params.focus) focusVenue(params.focus.spot);
  });
  return screen;
}
