import { h, img } from "../dom.js";
import { loadJSON } from "../data.js";
import { createScreen } from "../ui/screen.js";

/** Une rubrique ouvre une sous-page (`page`), un site externe (`href`), la feuille « Filtres carte » (`action`) ou rien. */
const open = (item) => (event) => {
  if (item.href) window.open(item.href, "_blank", "noopener");
  else if (item.action === "map-filters") event.currentTarget.dispatchEvent(new CustomEvent("show-map-filters", { bubbles: true }));
  else if (item.page) event.currentTarget.dispatchEvent(new CustomEvent("navigate", { bubbles: true, detail: { to: "page", params: { id: item.page } } }));
};

const row = (item) =>
  h(
    "button",
    { class: "menu-row", type: "button", onclick: open(item) },
    img(item.icon, { class: "menu-row__icon" }),
    h("span", { class: item.variant === "legal" ? "menu-row__label menu-row__label--legal" : "menu-row__label" }, item.label)
  );

const rule = () => h("hr", { class: "rule" });

const setting = (item, isLast) =>
  h(
    "button",
    { class: isLast ? "menu-setting menu-setting--last" : "menu-setting", type: "button", onclick: open(item) },
    h("span", { class: "menu-setting__label" }, item.label),
    img("assets/chevron.png", { class: "menu-setting__chevron" })
  );

export async function renderMenu() {
  const data = await loadJSON("data/menu.json");
  const list = h("div", { class: "menu-list" });

  for (const item of data.primary) list.append(row(item), rule());

  list.append(row(data.settings));
  data.settings.items.forEach((item, index, all) => list.append(setting(item, index === all.length - 1)));
  list.append(rule());

  for (const item of data.secondary) list.append(row(item), rule());
  list.append(h("p", { class: "menu-version" }, data.version));

  return createScreen({ id: "menu", title: data.title, body: list });
}
