import { h, img } from "../dom.js";

/**
 * Barre du bas flottante (composant « Menu » de Figma).
 * @param {{id: string, label: string, icon: string}[]} tabs
 * @param {(id: string) => void} onSelect
 */
export function createTabbar(tabs, onSelect) {
  const el = h(
    "nav",
    { class: "tabbar", "aria-label": "Navigation principale" },
    h("div", { class: "tabbar__clip" }, h("span", { class: "tabbar__active" })),
    tabs.map((tab) =>
      h(
        "button",
        { class: "tabbar__item", type: "button", dataset: { tab: tab.id }, onclick: () => onSelect(tab.id) },
        img(tab.icon, { class: "tabbar__icon" }),
        h("span", { class: "tabbar__label" }, tab.label)
      )
    )
  );

  return {
    el,
    setActive(id) {
      el.dataset.active = id;
      for (const item of el.querySelectorAll(".tabbar__item")) {
        if (item.dataset.tab === id) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
      }
    },
  };
}
