import { h, img } from "../dom.js";
import * as store from "../store.js";

/**
 * Carte spectacle (composant « Découvrir » de Figma) : bannière + photo recadrée,
 * informations, résumé, bouton « Lire plus » et défilé des représentations.
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
  wrapper.append(img(photo.src, { class: photo.mode === "cover" ? "photo__img photo__img--cover" : "photo__img", alt: title }));
  return wrapper;
}

function createRep(show, rep, index) {
  return h(
    "div",
    { class: "rep" },
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

export function createShowCard(show) {
  const card = h(
    "article",
    { class: "show-card", dataset: { show: show.id, accent: show.accent } },
    h(
      "div",
      { class: "show-card__main" },
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
            h("span", { class: "meta-item meta-item--place" }, img("assets/icon-location.png"), h("span", {}, show.location))
          ),
          h(
            "div",
            { class: "show-card__genre" },
            h("span", { class: "show-card__category" }, show.category),
            h("span", { class: "meta-item meta-item--programme" }, img("assets/icon-programme.png"), `Programmation ${show.programme}`)
          ),
          h("p", { class: "show-card__summary" }, show.summary),
          h("button", { class: "pill", type: "button", dataset: { open: "" } }, "Lire plus")
        ),
        h("hr", { class: "rule rule--medium rule--thin" }),
        h(
          "div",
          { class: "reps" },
          h("h4", { class: "reps__title" }, "Représentations"),
          h("div", { class: "reps__row" }, show.reps.map((rep, index) => createRep(show, rep, index)))
        )
      )
    )
  );

  card.addEventListener("click", (event) => {
    const target = event.target.closest("button, .show-card__title");
    if (!target) return;
    if (target.classList.contains("like")) store.toggleFavorite(show.id);
    else if (target.classList.contains("pin")) store.togglePin(show.id, Number(target.dataset.pin));
    else if (target.dataset.onMap !== undefined) {
      const rep = show.reps[Number(target.dataset.onMap)];
      emit(card, "show-on-map", { id: show.id, spot: rep.spot, venue: rep.venue });
    } else if (target.dataset.open !== undefined || target.classList.contains("show-card__title")) emit(card, "open-show", { id: show.id });
  });

  syncCard(card);
  return card;
}

/** Met à jour cœur et épingles d'une carte à partir de l'état partagé. */
export function syncCard(card) {
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
}

// Un seul abonnement : toutes les cartes affichées se resynchronisent.
store.subscribe(() => document.querySelectorAll(".show-card").forEach(syncCard));
