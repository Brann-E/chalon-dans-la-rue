import { h, img } from "../dom.js";
import { loadShows } from "../shows.js";
import * as store from "../store.js";
import { createScreen } from "../ui/screen.js";
import { createRep, createRepsRow, syncCard } from "../ui/show-card.js";
import { enableDragScroll } from "../ui/drag-scroll.js";

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
    track.addEventListener("scroll", () => {
      const index = Math.round(track.scrollLeft / track.clientWidth);
      counter.textContent = `${Math.min(index, photos.length - 1) + 1} / ${photos.length}`;
    });
    wrapper.append(counter);
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
    if (target.classList.contains("like")) store.toggleFavorite(show.id);
    else if (target.classList.contains("pin")) store.togglePin(show.id, Number(target.dataset.pin));
    else if (target.dataset.onMap !== undefined) {
      const rep = show.reps[Number(target.dataset.onMap)];
      body.dispatchEvent(new CustomEvent("show-on-map", { bubbles: true, detail: { id: show.id, spot: rep.spot, venue: rep.venue } }));
    }
  });
  syncCard(body);

  // La flèche ramène à l'écran d'où l'on vient (Découvrir par défaut).
  return createScreen({ id: "spectacle", title: show.title, body, softLine: true, bodyClass: "screen__body--bleed", back: { to: from ?? "decouvrir" } });
}
