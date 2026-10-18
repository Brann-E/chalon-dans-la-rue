import { h, img } from "../dom.js";

/** Barre d'état iOS de la maquette : heure, encoche, signal, wifi, batterie. */
export function createStatusbar() {
  return h(
    "div",
    { class: "statusbar", "aria-hidden": "true" },
    h("span", { class: "statusbar__time" }, "9:41"),
    h("span", { class: "statusbar__notch" }),
    h(
      "span",
      { class: "statusbar__icons" },
      img("assets/icon-signal.png", { class: "statusbar__signal" }),
      img("assets/icon-wifi.png", { class: "statusbar__wifi" }),
      img("assets/icon-battery.png", { class: "statusbar__battery" })
    )
  );
}
