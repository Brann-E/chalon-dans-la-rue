import { h } from "../dom.js";
import { createScreen } from "../ui/screen.js";

/** Écran provisoire des onglets pas encore reconstruits. */
export function renderPlaceholder(id, title) {
  return createScreen({ id, title, body: h("p", { class: "placeholder" }, "Écran en cours de reconstruction.") });
}
