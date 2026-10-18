import { h } from "./dom.js";
import { loadJSON } from "./data.js";
import { initRouter, register, navigate, has } from "./router.js";
import { createStatusbar } from "./ui/statusbar.js";
import { createTabbar } from "./ui/tabbar.js";
import { renderMenu } from "./screens/menu.js";
import { renderDecouvrir } from "./screens/decouvrir.js";
import { renderFavoris } from "./screens/favoris.js";
import { renderPlaceholder } from "./screens/placeholder.js";

const app = document.getElementById("app");
const tabs = await loadJSON("data/tabs.json");

const screensHost = h("main", { class: "screens" });
const tabbar = createTabbar(tabs, (id) => navigate(id));

app.append(screensHost, tabbar.el, createStatusbar());
initRouter(screensHost, ({ tab }) => tabbar.setActive(tab));

for (const tab of tabs) {
  register(tab.id, { tab: tab.id, render: () => renderPlaceholder(tab.id, tab.label) });
}
register("menu", { tab: "menu", render: renderMenu });
register("decouvrir", { tab: "decouvrir", render: renderDecouvrir });
register("favoris", { tab: "favoris", render: renderFavoris });

// Événements émis par les composants ; les écrans de destination arrivent aux étapes suivantes.
app.addEventListener("navigate", (event) => {
  if (has(event.detail.to)) navigate(event.detail.to);
});
app.addEventListener("open-show", (event) => {
  if (has("spectacle")) navigate("spectacle", { id: event.detail.id });
});
app.addEventListener("show-on-map", (event) => {
  if (has("carte")) navigate("carte", { focus: event.detail });
});

await navigate("decouvrir");
