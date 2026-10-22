import { h, img } from "../dom.js";
import { loadShows } from "../shows.js";
import * as store from "../store.js";
import { createScreen } from "../ui/screen.js";
import { createRep, createRepsRow, syncCard } from "../ui/show-card.js";
import { enableDragScroll } from "../ui/drag-scroll.js";
import { toggleFavorite, togglePin, handleRepAction } from "../ui/actions.js";

/**
 * Fiche d'un spectacle (« Spectacle complet ») : carrousel de photos, bannière avec cœur,
 * informations, texte complet, représentations, liens et rubriques (distribution, technique…).
 * Seuls les spectacles disposant de `detail` dans data/shows.json ont toutes les rubriques.
 */
function createCarousel(show, photos) {
  const track = h("div", { class: "carousel__track" }, photos.map((src, index) => h("div", { class: "carousel__slide" }, img(src, { alt: `${show.title} — photo ${index + 1}` }))));
  enableDragScroll(track);
  const wrapper = h("div", { class: "carousel" }, track);
  if (photos.length > 1) {
    const counter = h("span", { class: "carousel__counter", "aria-live": "polite" }, `1 / ${photos.length}`);
    // Chevrons à gauche et à droite : on peut aussi changer de photo sans glisser.
    const goTo = (step) => track.scrollBy({ left: step * track.clientWidth, behavior: "smooth" });
    const previous = h("button", { class: "carousel__nav carousel__nav--previous", type: "button", "aria-label": "Photo précédente", onclick: () => goTo(-1) }, img("assets/chevron.png"));
    const next = h("button", { class: "carousel__nav carousel__nav--next", type: "button", "aria-label": "Photo suivante", onclick: () => goTo(1) }, img("assets/chevron.png"));
    const update = () => {
      const width = track.clientWidth || 1; // avant l'affichage, la largeur est nulle : on reste sur la première photo
      const index = Math.min(Math.round(track.scrollLeft / width), photos.length - 1);
      counter.textContent = `${index + 1} / ${photos.length}`;
      previous.hidden = index === 0; // pas de chevron là où il n'y a plus de photo
      next.hidden = index === photos.length - 1;
    };
    track.addEventListener("scroll", update);
    update();
    wrapper.append(previous, next, counter);
  }
  return wrapper;
}

const paragraphs = (text) => text.split("\n").map((line) => (line.trim() ? h("p", {}, line) : h("br")));

export async function renderSpectacle({ id, from }) {
  const shows = await loadShows();
  const show = shows.find((s) => s.id === id);
  const detail = show.detail ?? {};
  const photos = detail.photos ?? [show.photo.src];

  const banner = h(
    "div",
    { class: "show-card__banner spectacle__banner" },
    h("h2", { class: "show-card__title" }, show.title),
    h("button", { class: "like", type: "button", "aria-label": "Ajouter aux favoris", "aria-pressed": "false" }, img("assets/heart-off.png"))
  );

  const links = detail.links
    ? h(
        "div",
        { class: "spectacle__links" },
        h("a", { class: "pill pill--bordered", href: detail.links.show ?? "#", target: "_blank", rel: "noopener", "aria-disabled": detail.links.show ? null : "true" }, "Site du spectacle"),
        detail.links.company &&
          h("a", { class: "pill pill--bordered pill--outline", href: detail.links.company, target: "_blank", rel: "noopener" }, "Site de la compagnie")
      )
    : null;

  const body = h(
    "article",
    { class: "spectacle", dataset: { show: show.id, accent: show.accent } },
    createCarousel(show, photos),
    banner,
    h(
      "div",
      { class: "spectacle__content" },
      h(
        "div",
        { class: "show-card__info spectacle__info" },
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
        h("div", { class: "spectacle__text" }, paragraphs(detail.description ?? show.summary))
      ),
      h(
        "div",
        { class: "reps" },
        h("h3", { class: "reps__title" }, "Représentations"),
        createRepsRow(show.reps.map((rep, index) => createRep(rep, index)))
      ),
      links,
      detail.sections && h("hr", { class: "rule spectacle__rule" }),
      ...(detail.sections ?? []).map((section) =>
        h("section", { class: "spectacle__section" }, h("h3", { class: "spectacle__section-title" }, section.title), h("div", { class: "spectacle__text" }, paragraphs(section.text)))
      )
    )
  );

  // Cœur, épingles et « Voir sur la carte » : mêmes comportements que sur la carte spectacle.
  body.__show = show;
  body.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    if (target.classList.contains("like")) toggleFavorite(show, target);
    else if (target.classList.contains("pin")) togglePin(show, Number(target.dataset.pin), target);
    else handleRepAction(target, show, body);
  });
  syncCard(body);

  // La flèche ramène à l'écran d'où l'on vient (Découvrir par défaut).
  return createScreen({ id: "spectacle", title: show.title, body, softLine: true, bodyClass: "screen__body--bleed", back: { to: from ?? "decouvrir" } });
}
