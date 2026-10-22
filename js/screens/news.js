import { h, img } from "../dom.js";
import { loadJSON } from "../data.js";
import * as store from "../store.js";

/**
 * Panneau « Actualités » : les flashs du festival (programme modifié, bons plans, conseils, infos pratiques).
 * Une pastille rose marque ce qui n'a pas été lu ; toucher une actualité la marque comme lue.
 * Certaines proposent un raccourci : voir le spectacle, ou voir le lieu sur la carte.
 */
const KINDS = {
  modif: { label: "Programme", token: "rue" },
  "bon-plan": { label: "Bon plan", token: "cirque" },
  conseil: { label: "Conseil", token: "enfants" },
  info: { label: "Info pratique", token: "performance" },
};

const emit = (el, name, detail) => el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
const readIds = () => store.getSetting("readNews", []);
const markRead = (...ids) => store.setSetting("readNews", [...new Set([...readIds(), ...ids])]);

export async function createNewsPanel() {
  const news = await loadJSON("data/news.json");

  const cards = news.map((item) => {
    const kind = KINDS[item.kind] ?? KINDS.info;
    const dot = h("span", { class: "news-card__dot", "aria-hidden": "true" });
    dot.style.setProperty("--dot", `var(--color-cat-${kind.token})`);

    const action = item.show
      ? h("button", { class: "button-outline", type: "button", onclick: (event) => { markRead(item.id); emit(event.currentTarget, "open-show", { id: item.show }); } }, "Voir le spectacle")
      : item.spot
        ? h("button", { class: "button-outline", type: "button", onclick: (event) => { markRead(item.id); emit(event.currentTarget, "show-on-map", { spot: item.spot }); } }, "Voir sur la carte")
        : null;

    const card = h(
      "article",
      { class: "news-card", dataset: { id: item.id, read: "false" }, onclick: (event) => !event.target.closest("button") && markRead(item.id) },
      h("span", { class: "news-card__unread", "aria-label": "Non lue" }),
      h("div", { class: "news-card__meta" }, dot, h("span", { class: "news-card__kind" }, kind.label), item.when && h("span", { class: "news-card__when" }, `· ${item.when}`)),
      h("h3", { class: "news-card__title" }, item.title),
      h("p", { class: "news-card__text" }, item.text),
      action
    );
    return card;
  });

  const close = (event) => emit(event.currentTarget, "close-overlay");
  const markAll = h("button", { class: "filters__reset", type: "button", onclick: () => markRead(...news.map((item) => item.id)) }, "Tout lire");

  const panel = h(
    "section",
    { class: "filters news", "aria-label": "Actualités" },
    h(
      "header",
      { class: "filters__header" },
      h(
        "div",
        { class: "filters__bar" },
        h("button", { class: "filters__close", type: "button", "aria-label": "Fermer", onclick: close }, img("assets/fermer.png")),
        h("h2", { class: "filters__title" }, "Actualités"),
        markAll
      )
    ),
    h("div", { class: "filters__body news__body" }, cards)
  );

  const sync = () => {
    const read = readIds();
    cards.forEach((card) => card.setAttribute("data-read", String(read.includes(card.dataset.id))));
    markAll.hidden = news.every((item) => read.includes(item.id));
  };
  sync();
  const unsubscribe = store.subscribe(() => (panel.isConnected || !panel.__opened ? sync() : unsubscribe()));
  requestAnimationFrame(() => (panel.__opened = true));
  return panel;
}
