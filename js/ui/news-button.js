import { h, img } from "../dom.js";
import { loadJSON } from "../data.js";
import * as store from "../store.js";

/**
 * Cloche des actualités : en haut à droite de chaque écran, avec le nombre d'actualités non lues.
 * Toucher la cloche ouvre le panneau des actualités (événement `open-news`).
 */
export async function unreadCount() {
  const news = await loadJSON("data/news.json");
  const read = store.getSetting("readNews", []);
  return news.filter((item) => !read.includes(item.id)).length;
}

/** @param {{floating?: boolean}} [options] floating : version ronde posée sur la carte, qui n'a pas d'en-tête */
export function createNewsButton({ floating = false } = {}) {
  const badge = h("span", { class: "bell__badge", hidden: true, "aria-hidden": "true" });
  const button = h(
    "button",
    {
      class: floating ? "bell bell--floating" : "bell",
      type: "button",
      "aria-label": "Actualités",
      onclick: (event) => event.currentTarget.dispatchEvent(new CustomEvent("open-news", { bubbles: true })),
    },
    img("assets/notification.svg"),
    badge
  );

  const refresh = async () => {
    const count = await unreadCount();
    badge.hidden = count === 0;
    badge.textContent = String(count);
    button.setAttribute("aria-label", count ? `Actualités, ${count} non lue${count > 1 ? "s" : ""}` : "Actualités");
  };
  refresh();

  // Mise à jour quand une actualité est lue ; on se désabonne quand l'écran a disparu.
  const unsubscribe = store.subscribe(() => {
    if (button.isConnected) {
      button.__attached = true;
      refresh();
    } else if (button.__attached) unsubscribe();
  });
  return button;
}
