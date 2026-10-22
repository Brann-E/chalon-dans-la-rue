import { h } from "./dom.js";
import { loadJSON } from "./data.js";
import { initRouter, register, navigate, has } from "./router.js";
import { createStatusbar } from "./ui/statusbar.js";
import { createTabbar } from "./ui/tabbar.js";
import { initOverlay, openOverlay, closeOverlay } from "./ui/overlay.js";
import { renderMenu } from "./screens/menu.js";
import { renderDecouvrir } from "./screens/decouvrir.js";
import { renderFavoris } from "./screens/favoris.js";
import { renderPlanning } from "./screens/planning.js";
import { renderCarte } from "./screens/carte.js";
import { renderSpectacle } from "./screens/spectacle.js";
import { renderPlaceholder } from "./screens/placeholder.js";
import { createVenuePanel } from "./screens/venue.js";
import { createFiltersPanel } from "./screens/filters.js";
import { createMapFiltersPanel } from "./screens/map-filters.js";
import { renderPage } from "./screens/pages.js";
import { createSlotPicker } from "./screens/slot-picker.js";
import * as store from "./store.js";

const app = document.getElementById("app");
const tabs = await loadJSON("data/tabs.json");

const screensHost = h("main", { class: "screens" });
const tabbar = createTabbar(tabs, (id) => {
  closeOverlay({ immediate: true });
  navigate(id);
});

app.append(screensHost, tabbar.el);
initOverlay(app);
app.append(createStatusbar());
initRouter(screensHost, ({ tab }) => tabbar.setActive(tab));

for (const tab of tabs) {
  register(tab.id, { tab: tab.id, render: () => renderPlaceholder(tab.id, tab.label) });
}
register("menu", { tab: "menu", render: renderMenu, transition: "slide-right" });
// Sous-pages du Menu : l'onglet Menu reste allumé.
register("page", { tab: "menu", render: renderPage, transition: "slide-right" });
register("decouvrir", { tab: "decouvrir", render: renderDecouvrir });
register("favoris", { tab: "favoris", render: renderFavoris });
register("planning", { tab: "planning", render: renderPlanning });
register("carte", { tab: "carte", render: renderCarte });
// La fiche spectacle garde allumé l'onglet d'où l'on vient.
register("spectacle", { tab: (params) => params.from ?? "decouvrir", render: renderSpectacle });

// Événements émis par les composants.
app.addEventListener("navigate", (event) => {
  const { to, params, options } = event.detail;
  if (has(to)) navigate(to, params, options);
});
app.addEventListener("open-show", (event) => {
  closeOverlay({ immediate: true });
  navigate("spectacle", { id: event.detail.id, from: tabbar.el.dataset.active });
});
app.addEventListener("show-on-map", (event) => {
  closeOverlay({ immediate: true });
  navigate("carte", { focus: event.detail });
});
app.addEventListener("open-venue", async (event) => {
  openOverlay(await createVenuePanel(event.detail.spot), { kind: "fade" });
});
app.addEventListener("open-filters", async (event) => {
  openOverlay(await createFiltersPanel({ section: event.detail?.section }), { kind: "slide-up" });
});
app.addEventListener("change-slot", async (event) => {
  openOverlay(await createSlotPicker(event.detail), { kind: "slide-up" });
});
// Menu > Paramètres > Carte : on va sur la carte et on ouvre la feuille « Filtres carte » (pas de liste en double).
app.addEventListener("show-map-filters", async () => {
  await navigate("carte");
  openOverlay(await createMapFiltersPanel(), { kind: "fade" });
});
app.addEventListener("open-map-filters", async () => {
  openOverlay(await createMapFiltersPanel(), { kind: "fade" });
});
app.addEventListener("apply-filters", () => {
  closeOverlay();
  navigate("decouvrir");
});
app.addEventListener("close-overlay", () => closeOverlay());

// Réglages d'accessibilité (classes sur l'appli) et préférences de démarrage.
const applySettings = () => {
  app.classList.toggle("reduce-motion", store.getSetting("reduceMotion", false));
  app.classList.toggle("high-contrast", store.getSetting("highContrast", false));
};
applySettings();
store.subscribe(applySettings);
if (!store.getSetting("keepFilters", true)) store.resetFilters();

await navigate(store.getSetting("startOnMap", true) ? "carte" : "decouvrir");
