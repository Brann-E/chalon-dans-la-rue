import { h, img } from "../dom.js";
import * as store from "../store.js";

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
    h("button", { class: "button-outline", type: "button", dataset: { onMap: index } }, "Voir sur la carte")
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
            h("div", { class: "reps__row" }, reps.map(({ rep, index }) => createRep(rep, index)))
          )
      )
    )
  );

  card.addEventListener("click", (event) => {
    const target = event.target.closest("button, .show-card__title");
    if (!target) return;
    if (target.classList.contains("like")) store.toggleFavorite(show.id);
    else if (target.classList.contains("pin")) store.togglePin(show.id, Number(target.dataset.pin));
    else if (target.dataset.change !== undefined) {
      const current = store.pinnedIndex(show.id) ?? plannedIndex ?? 0;
      store.setPin(show.id, (current + 1) % show.reps.length);
    } else if (target.dataset.onMap !== undefined) {
      const rep = show.reps[Number(target.dataset.onMap)];
      emit(card, "show-on-map", { id: show.id, spot: rep.spot, venue: rep.venue });
    } else if (target.dataset.open !== undefined || target.classList.contains("show-card__title")) emit(card, "open-show", { id: show.id });
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
    slot.querySelector(".button-outline").dataset.onMap = index;
  }
}

// Un seul abonnement : toutes les cartes affichées se resynchronisent.
store.subscribe(() => document.querySelectorAll("[data-show]").forEach((el) => el.__show && syncCard(el)));
