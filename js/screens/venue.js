import { h, img } from "../dom.js";
import { loadJSON } from "../data.js";
import { loadShows } from "../shows.js";
import { createShowCard } from "../ui/show-card.js";

/**
 * Fiche d'un repère de la carte (« Détail pastille ») : nom du lieu, numéro, puis les
 * spectacles programmés à cet endroit avec leurs représentations sur ce lieu.
 */
export async function createVenuePanel(spot) {
  const [venues, shows] = await Promise.all([loadJSON("data/venues.json"), loadShows()]);
  const venue = venues.find((v) => v.spot === Number(spot));
  // Ordre de la maquette : par première représentation sur ce lieu (9h30, 15h, 18h…).
  const minutes = (time) => {
    const [hours, mins = 0] = time.split("h").map(Number);
    return hours * 60 + mins;
  };
  const firstRep = (show) => Math.min(...show.reps.filter((rep) => rep.spot === venue.spot).map((rep) => minutes(rep.time)));
  const here = shows.filter((show) => show.reps.some((rep) => rep.spot === venue.spot)).sort((a, b) => firstRep(a) - firstRep(b));

  const body = here.length
    ? here.map((show) => createShowCard(show, { onlySpot: venue.spot }))
    : [h("p", { class: "venue__empty" }, "Aucun spectacle programmé à cet endroit pour le moment.")];

  return h(
    "section",
    { class: "venue", "aria-label": `Lieu : ${venue.name}` },
    h("header", { class: "venue__header" }, h("h2", { class: "venue__title" }, venue.name), h("span", { class: "badge badge--large" }, venue.spot)),
    h("div", { class: "venue__body" }, h("div", { class: "cards" }, body)),
    h(
      "button",
      {
        class: "round-close",
        type: "button",
        "aria-label": "Fermer",
        onclick: (event) => event.currentTarget.dispatchEvent(new CustomEvent("close-overlay", { bubbles: true })),
      },
      img("assets/fermer.png")
    )
  );
}
