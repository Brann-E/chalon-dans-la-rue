import { h, img } from "../dom.js";
import * as store from "../store.js";
import { enableDragScroll } from "./drag-scroll.js";
import { toggleFavorite, togglePin, handleRepAction } from "./actions.js";

/**
 * Carte spectacle (composant « Découvrir » de Figma) : bannière + photo recadrée,
 * informations, résumé, bouton « Lire plus » et défilé des représentations.
 * Variantes : `compact` (« Carte favoris », sans représentations) et `plannedIndex`
 * (« Carte planning » : créneau épinglé + lien « Changer le créneau » en tête).
 * Événements émis (bubbles) : open-show {id}, show-on-map {id, spot, venue}.
 */

const emit = (el, name, detail) => el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));

function createPhoto(show) {
  const { photo, title } = show;
  const wrapper = h("div", { class: "photo" });
  if (photo.mode === "stretch") {
    wrapper.style.setProperty("--crop-w", photo.sx);
    wrapper.style.setProperty("--crop-h", photo.sy);
    wrapper.style.setProperty("--crop-x", photo.tx);
    wrapper.style.setProperty("--crop-y", photo.ty);
  }
  wrapper.append(img(photo.src, { class: photo.mode === "cover" ? "photo__img photo__img--cover" : "photo__img", alt: title, loading: "lazy", decoding: "async" }));
  return wrapper;
}

/** Rangée de représentations : un slider qu'on fait glisser (la carte suivante dépasse à droite pour le montrer). */
export function createRepsRow(items) {
  const row = h("div", { class: "reps__row" }, items);
  enableDragScroll(row);
  return row;
}

/** Carte de représentation ; `slot` : version pleine largeur du planning. */
export function createRep(rep, index, { slot = false } = {}) {
  return h(
    "div",
    { class: slot ? "rep rep--slot" : "rep", dataset: slot ? { slot: index } : {} },
    h(
      "div",
      { class: "rep__top" },
      h("span", { class: "rep__date" }, `${rep.date} - ${rep.time}`),
      h(
        "button",
        { class: "pin", type: "button", "aria-label": "Ajouter au planning", dataset: { pin: index } },
        img("assets/pin-off.png")
      )
    ),
    h("div", { class: "rep__spot" }, h("span", { class: "badge" }, rep.spot), h("span", { class: "rep__venue" }, rep.venue)),
    // Actions sur ce créneau et ce lieu : voir le lieu sur la carte, s'y rendre, partager.
    h(
      "div",
      { class: "rep__actions" },
      repAction("map", index, "Carte", `Voir ${rep.venue} sur la carte`),
      repAction("route", index, "Itinéraire", `Itinéraire à pied vers ${rep.venue}`),
      repAction("share", index, "Partager", `Partager la représentation du ${rep.date} à ${rep.time}`)
    )
  );
}

/** Pastille ronde d'un créneau : l'icône dans le rond, un seul mot dessous. `label` accessible : plus précis que le mot affiché. */
function repAction(action, index, text, label) {
  return h(
    "button",
    { class: `rep-action rep-action--${action}`, type: "button", "aria-label": label, dataset: { action, rep: index } },
    h("span", { class: "rep-action__disc" }, h("span", { class: "rep-action__icon", "aria-hidden": "true" })),
    h("span", { class: "rep-action__label" }, text)
  );
}

/**
 * @param {object} show
 * @param {{compact?: boolean, plannedIndex?: number}} [options]
 */
export function createShowCard(show, { compact = false, plannedIndex = null, onlySpot = null } = {}) {
  const planned = plannedIndex !== null;
  const venue = onlySpot !== null; // version « Détail pastille » : sans lieu ni programmation
  // `onlySpot` : n'affiche que les représentations d'un lieu (fiche d'un repère de la carte).
  const reps = show.reps.map((rep, index) => ({ rep, index })).filter(({ rep }) => onlySpot === null || rep.spot === onlySpot);
  const card = h(
    "article",
    { class: venue ? "show-card show-card--venue" : "show-card", dataset: { show: show.id, accent: show.accent } },
    h(
      "div",
      { class: "show-card__main" },
      planned && createRep(show.reps[plannedIndex], plannedIndex, { slot: true }),
      planned && h("button", { class: "change-slot", type: "button", dataset: { change: "" } }, "Changer le créneau"),
      h(
        "div",
        { class: "show-card__media" },
        h(
          "div",
          { class: "show-card__banner" },
          h("h3", { class: "show-card__title" }, show.title),
          h("button", { class: "like", type: "button", "aria-label": "Ajouter aux favoris", "aria-pressed": "false" }, img("assets/heart-off.png"))
        ),
        createPhoto(show)
      ),
      h(
        "div",
        { class: "show-card__body" },
        h(
          "div",
          { class: "show-card__info" },
          h("p", { class: "show-card__company" }, show.company),
          h(
            "div",
            { class: "show-card__meta" },
            h(
              "div",
              { class: "meta-group" },
              h("span", { class: "meta-item" }, img("assets/icon-timer.png"), show.duration),
              h("span", { class: "meta-item" }, img("assets/age-user2.png"), show.age)
            ),
            !venue && h("span", { class: "meta-item meta-item--place" }, img("assets/icon-location.png"), h("span", {}, show.location))
          ),
          h(
            "div",
            { class: "show-card__genre" },
            h("span", { class: "show-card__category" }, show.category),
            !venue && h("span", { class: "meta-item meta-item--programme" }, img("assets/icon-programme.png"), `Programmation ${show.programme}`)
          ),
          h("p", { class: "show-card__summary" }, show.summary),
          h("button", { class: "pill", type: "button", dataset: { open: "" } }, "Lire plus")
        ),
        !compact && !planned && h("hr", { class: "rule rule--medium rule--thin" }),
        !compact &&
          !planned &&
          h(
            "div",
            { class: "reps" },
            h("h4", { class: "reps__title" }, "Représentations"),
            createRepsRow(reps.map(({ rep, index }) => createRep(rep, index)))
          ),
        // Favoris : la prochaine représentation, avec son épingle et ses pastilles (voir le lieu, y aller, partager).
        compact &&
          h("div", { class: "reps" }, h("h4", { class: "reps__title" }, "Prochaine représentation"), h("div", { class: "reps__single" }, createRep(show.reps[0], 0, { slot: true })))
      )
    )
  );

  card.addEventListener("click", (event) => {
    const target = event.target.closest("button, .show-card__title");
    if (!target) return;
    if (target.classList.contains("like")) toggleFavorite(show, target);
    else if (target.classList.contains("pin")) togglePin(show, Number(target.dataset.pin), target);
    else if (target.dataset.change !== undefined) emit(card, "change-slot", { id: show.id, fallbackIndex: plannedIndex ?? 0 });
    else if (handleRepAction(target, show, card)) return;
    else if (target.dataset.open !== undefined || target.classList.contains("show-card__title")) emit(card, "open-show", { id: show.id });
  });

  card.__show = show;
  syncCard(card);
  return card;
}

/** Met à jour cœur, épingles et créneau d'une carte à partir de l'état partagé. */
export function syncCard(card) {
  const show = card.__show;
  const id = card.dataset.show;
  const like = card.querySelector(".like");
  const liked = store.isFavorite(id);
  like.setAttribute("aria-pressed", String(liked));
  like.firstElementChild.setAttribute("src", `assets/heart-${liked ? "on" : "off"}.png`);

  card.querySelectorAll(".pin").forEach((pin) => {
    const pinned = store.isPinned(id, Number(pin.dataset.pin));
    pin.setAttribute("aria-pressed", String(pinned));
    pin.firstElementChild.setAttribute("src", `assets/pin-${pinned ? "on" : "off"}.png`);
  });

  // Carte planning : le créneau affiché suit l'épingle (« Changer le créneau »).
  const slot = card.querySelector(".rep--slot");
  const index = store.pinnedIndex(id);
  if (slot && show && index !== null && Number(slot.dataset.slot) !== index) {
    const rep = show.reps[index];
    slot.dataset.slot = index;
    slot.querySelector(".rep__date").textContent = `${rep.date} - ${rep.time}`;
    slot.querySelector(".badge").textContent = rep.spot;
    slot.querySelector(".rep__venue").textContent = rep.venue;
    slot.querySelector(".pin").dataset.pin = index;
    slot.querySelectorAll(".rep-action").forEach((action) => (action.dataset.rep = index));
  }
}

// Un seul abonnement : toutes les cartes affichées se resynchronisent.
store.subscribe(() => document.querySelectorAll("[data-show]").forEach((el) => el.__show && syncCard(el)));
