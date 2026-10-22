import { h, img } from "../dom.js";
import { loadJSON } from "../data.js";
import { loadShows } from "../shows.js";
import * as store from "../store.js";
import { inZone } from "../filtering.js";
import { createScreen } from "../ui/screen.js";
import { createBlocks } from "../ui/blocks.js";

/**
 * Sous-pages du Menu. `renderPage({ id })` fabrique la page demandée :
 * textes du site (histoire, soutiens, mentions…), listes (lieux, lieux de convivialité, zones),
 * réglages (notifications, carte, accessibilité, préférences, avatar), aide et commentaires.
 */
const BACK_MENU = { to: "menu" };

const emit = (el, name, detail) => el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
const normalize = (text) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const page = (id, title, body, { back = BACK_MENU, bodyClass = "screen__body--page", above } = {}) =>
  createScreen({ id: `page-${id}`, title, body, above, back, softLine: true, bodyClass });

// ---- Composants ----------------------------------------------------------------------
const card = (...children) => h("div", { class: "page-card" }, children);

/** Ligne de liste : pastille ou icône, titre, sous-titre, flèche. */
function listRow({ badge, kind, title, sub, onClick }) {
  return h(
    "button",
    { class: "list-row", type: "button", onclick: onClick },
    badge != null && h("span", { class: "badge", dataset: { kind: kind ?? "spectacle" } }, String(badge)),
    h("span", { class: "list-row__text" }, h("span", { class: "list-row__title" }, title), sub && h("span", { class: "list-row__sub" }, sub)),
    img("assets/chevron.png", { class: "list-row__chevron" })
  );
}

/** Ligne de réglage avec interrupteur (même composant que « Compagnies émergentes »). */
function switchRow(label, checked, onChange) {
  const toggle = h("button", { class: "switch", type: "button", role: "switch", "aria-checked": String(checked), "aria-label": label });
  toggle.addEventListener("click", () => {
    const next = toggle.getAttribute("aria-checked") !== "true";
    toggle.setAttribute("aria-checked", String(next));
    onChange(next);
  });
  return h("div", { class: "setting-row" }, h("span", { class: "setting-row__label" }, label), toggle);
}

const note = (text) => h("p", { class: "prose__p prose__p--note" }, text);

// ---- Pages de texte --------------------------------------------------------------------
const TEXT_PAGES = {
  histoire: { title: "Le festival", sources: ["histoire", "selection-in", "selection-off", "tandem"] },
  soutiens: { title: "Ils nous soutiennent", sources: ["soutiens", "commercants"] },
  mentions: { title: "Mentions légales", sources: ["mentions"] },
};

async function renderText(id) {
  const { title, sources } = TEXT_PAGES[id];
  const pages = await loadJSON("data/pages.json");
  return page(id, title, sources.map((source) => card(createBlocks(pages[source].blocks))));
}

// ---- Lieux du festival -----------------------------------------------------------------
async function renderVenues() {
  const [venues, shows] = await Promise.all([loadJSON("data/venues.json"), loadShows()]);
  const counts = new Map();
  for (const show of shows) for (const spot of new Set(show.reps.map((rep) => rep.spot))) counts.set(spot, (counts.get(spot) ?? 0) + 1);

  const list = h("div", { class: "list" });
  const empty = h("p", { class: "empty-results", hidden: true }, "Aucun lieu ne correspond à votre recherche.");
  const rows = venues.map((venue) => {
    const count = counts.get(venue.spot) ?? 0;
    const sub = count ? `${count} spectacle${count > 1 ? "s" : ""}` : "Aucun spectacle";
    return {
      venue,
      el: listRow({
        badge: venue.spot,
        kind: venue.kind,
        title: venue.name,
        sub,
        onClick: (event) => emit(event.currentTarget, "show-on-map", { spot: venue.spot }),
      }),
    };
  });
  list.append(...rows.map(({ el }) => el));

  const input = h("input", { class: "search__input", type: "search", placeholder: "Rechercher un lieu…", "aria-label": "Rechercher un lieu", autocomplete: "off" });
  input.addEventListener("input", () => {
    const query = normalize(input.value.trim());
    let visible = 0;
    for (const { venue, el } of rows) {
      el.hidden = Boolean(query) && !normalize(`${venue.name} ${venue.spot}`).includes(query);
      if (!el.hidden) visible += 1;
    }
    empty.hidden = visible > 0;
  });

  return page("lieux", "Lieux du festival", [list, empty], { above: h("div", { class: "page-search" }, h("div", { class: "search" }, img("assets/icon-search.svg", { class: "search__icon" }), input)) });
}

// ---- Lieux de convivialité -------------------------------------------------------------
const convivialiteIds = (pages) => Object.keys(pages).filter((key) => key.startsWith("conv-"));
const heading = (blocks) => (blocks.find((block) => block.type === "h1")?.text ?? "").split("\n").map((line) => line.trim());
const placeOf = (blocks) => {
  const at = blocks.findIndex((block) => block.type === "h2" && block.text === "Lieu");
  const text = at >= 0 ? (blocks[at + 1]?.text ?? "") : "";
  const match = text.match(/Pastille\s+(\d+)\s*:\s*(.*)/i);
  return { spot: match ? Number(match[1]) : null, name: match ? match[2].trim() : text };
};

async function renderConvivialite() {
  const pages = await loadJSON("data/pages.json");
  const rows = convivialiteIds(pages).map((key) => {
    const [name, tagline] = heading(pages[key].blocks);
    const place = placeOf(pages[key].blocks);
    return listRow({
      badge: place.spot,
      kind: place.spot === 13 ? "festival" : "convivialite",
      title: name,
      sub: [tagline, place.name].filter(Boolean).join(" · "),
      onClick: (event) => emit(event.currentTarget, "navigate", { to: "page", params: { id: key } }),
    });
  });
  return page("convivialite", "Lieux de convivialité", h("div", { class: "list" }, rows));
}

async function renderConvivialiteDetail(id) {
  const pages = await loadJSON("data/pages.json");
  const blocks = pages[id].blocks;
  const [name, tagline] = heading(blocks);
  const place = placeOf(blocks);
  const showOnMap = place.spot
    ? h("button", { class: "button-outline page-action", type: "button", onclick: (event) => emit(event.currentTarget, "show-on-map", { spot: place.spot }) }, "Voir sur la carte")
    : null;
  return page(id, name, [card(tagline && h("p", { class: "prose__p prose__p--note" }, tagline), createBlocks(blocks, { skipFirstH1: true }), showOnMap)], {
    back: { to: "page", params: { id: "convivialite" } },
  });
}

// ---- Zones -----------------------------------------------------------------------------
async function renderZones() {
  const [config, shows] = await Promise.all([loadJSON("data/filters.json"), loadShows()]);
  const rows = config.zones.map((zone) => {
    const count = shows.filter((show) => inZone(show, zone)).length;
    return listRow({
      title: zone,
      sub: count ? `${count} spectacle${count > 1 ? "s" : ""}` : "Aucun spectacle",
      onClick: (event) => {
        store.resetFilters();
        store.setFilters({ zones: [zone] });
        emit(event.currentTarget, "navigate", { to: "decouvrir", options: { restore: false } });
      },
    });
  });
  return page("zones", "Zones du festival", [h("p", { class: "prose__p prose__p--note" }, "Touchez une zone pour voir les spectacles qui s’y jouent."), h("div", { class: "list" }, rows)]);
}

// ---- Réglages --------------------------------------------------------------------------
const SWITCH_PAGES = {
  notifications: {
    title: "Notifications",
    items: [
      { key: "notifyReminder", label: "Rappel avant un spectacle de mon planning", fallback: true },
      { key: "notifyNews", label: "Actualités du festival", fallback: false },
    ],
    note: "Dans ce prototype, les notifications ne sont pas envoyées : le réglage est seulement mémorisé.",
  },
  accessibilite: {
    title: "Accessibilité",
    items: [
      { key: "reduceMotion", label: "Réduire les animations", fallback: false },
      { key: "highContrast", label: "Renforcer le contraste", fallback: false },
    ],
  },
  preferences: {
    title: "Préférences",
    items: [
      { key: "startOnMap", label: "Ouvrir l’appli sur la carte", fallback: true },
      { key: "keepFilters", label: "Garder mes filtres entre deux visites", fallback: true },
    ],
  },
};

function renderSwitches(id) {
  const { title, items, note: text } = SWITCH_PAGES[id];
  return page(id, title, [card(items.map((item) => switchRow(item.label, store.getSetting(item.key, item.fallback), (value) => store.setSetting(item.key, value)))), text && note(text)]);
}

async function renderAvatar() {
  const { avatars } = await loadJSON("data/menu.json");
  const current = store.getSetting("avatar", avatars[0].src);
  const buttons = avatars.map((avatar) =>
    h(
      "button",
      { class: "avatar", type: "button", "aria-pressed": String(avatar.src === current), "aria-label": avatar.label, onclick: () => store.setSetting("avatar", avatar.src) },
      img(avatar.src),
      h("span", { class: "avatar__label" }, avatar.label)
    )
  );
  const sync = () => {
    const selected = store.getSetting("avatar", avatars[0].src);
    avatars.forEach((avatar, i) => buttons[i].setAttribute("aria-pressed", String(avatar.src === selected)));
  };
  const unsubscribe = store.subscribe(() => (grid.isConnected ? sync() : unsubscribe()));
  const grid = h("div", { class: "avatar-grid" }, buttons);
  return page("avatar", "Changer d’avatar", [note("Votre avatar marque votre position sur la carte."), grid]);
}

// ---- Aide, conditions, commentaires ----------------------------------------------------
async function renderHelp() {
  const [help, pages] = await Promise.all([loadJSON("data/help.json"), loadJSON("data/pages.json")]);
  const faq = help.aide.map((item) => h("details", { class: "faq" }, h("summary", { class: "faq__q" }, item.q), h("p", { class: "prose__p" }, item.a)));
  return page("aide", "Aide", [card(faq), card(h("h2", { class: "prose__h2" }, "Une question sur le festival ?"), createBlocks(pages.contact.blocks))]);
}

async function renderTerms() {
  const [help, pages] = await Promise.all([loadJSON("data/help.json"), loadJSON("data/pages.json")]);
  return page("cgu", "Conditions d’utilisation", [
    card(h("div", { class: "prose" }, help.cgu.map((text) => h("p", { class: "prose__p" }, text)))),
    card(h("h2", { class: "prose__h2" }, "Politique de confidentialité du festival"), createBlocks(pages.confidentialite.blocks)),
  ]);
}

function renderFeedback() {
  const field = h("textarea", { class: "field", rows: "6", placeholder: "Votre message", "aria-label": "Votre message" });
  const thanks = h("p", { class: "prose__p prose__p--note", hidden: true, role: "status" }, "Merci ! Votre message a été enregistré sur cet appareil.");
  const send = h(
    "button",
    {
      class: "cta cta--centered",
      type: "button",
      onclick: () => {
        if (!field.value.trim()) {
          field.focus();
          return;
        }
        store.setSetting("lastFeedback", field.value.trim());
        field.value = "";
        thanks.hidden = false;
      },
    },
    "Envoyer"
  );
  return page("commentaires", "Vos commentaires", [note("Une idée, un souci, une envie ? Dites-nous tout."), field, send, thanks]);
}

// ---- Entrée ----------------------------------------------------------------------------
const RENDERERS = {
  lieux: renderVenues,
  convivialite: renderConvivialite,
  zones: renderZones,
  avatar: renderAvatar,
  aide: renderHelp,
  cgu: renderTerms,
  commentaires: renderFeedback,
};

export async function renderPage({ id }) {
  if (id in TEXT_PAGES) return renderText(id);
  if (id in SWITCH_PAGES) return renderSwitches(id);
  if (id in RENDERERS) return RENDERERS[id]();
  if (id.startsWith("conv-")) return renderConvivialiteDetail(id);
  return page(id, "Page introuvable", note("Cette page n’existe pas."));
}
