import { h, img } from "../dom.js";
import { loadJSON } from "../data.js";
import { createScreen } from "../ui/screen.js";

const row = (item) =>
  h(
    "button",
    { class: "menu-row", type: "button", dataset: { to: item.to ?? "" } },
    img(item.icon, { class: "menu-row__icon" }),
    h("span", { class: item.variant === "legal" ? "menu-row__label menu-row__label--legal" : "menu-row__label" }, item.label)
  );

const rule = () => h("hr", { class: "menu-rule" });

const setting = (item, isLast) =>
  h(
    "button",
    { class: isLast ? "menu-setting menu-setting--last" : "menu-setting", type: "button", dataset: { to: item.to ?? "" } },
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
