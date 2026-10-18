import { h, img } from "../dom.js";
import { loadJSON } from "../data.js";
import { createScreen } from "../ui/screen.js";
import { createShowCard } from "../ui/show-card.js";

const CHIPS = ["Horaire", "Date", "IN/OFF", "Catégorie", "Compagnie émergente", "Zone"];

const normalize = (text) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export async function renderDecouvrir() {
  const shows = await loadJSON("data/shows.json");
  const cards = h("div", { class: "cards" });
  const empty = h("p", { class: "empty-results", hidden: true }, "Aucun spectacle ne correspond à votre recherche.");
  const entries = shows.map((show) => ({ show, el: createShowCard(show) }));
  entries.forEach(({ el }) => cards.append(el));

  const input = h("input", {
    class: "search__input",
    type: "search",
    placeholder: "Quel spectacle recherchez-vous ?",
    "aria-label": "Rechercher un spectacle",
    autocomplete: "off",
  });

  input.addEventListener("input", () => {
    const query = normalize(input.value.trim());
    let visible = 0;
    for (const { show, el } of entries) {
      const haystack = normalize([show.title, show.company, show.category, show.location].join(" "));
      const match = !query || haystack.includes(query);
      el.hidden = !match;
      if (match) visible += 1;
    }
    empty.hidden = visible > 0;
  });

  const filterbar = h(
    "div",
    { class: "filterbar" },
    h("div", { class: "search" }, img("assets/icon-search.svg", { class: "search__icon" }), input),
    h("hr", { class: "rule rule--strong" }),
    h("div", { class: "chips" }, CHIPS.map((label) => h("button", { class: "chip", type: "button", dataset: { chip: label } }, label))),
    h(
      "button",
      {
        class: "filters-link",
        type: "button",
        onclick: (event) => event.currentTarget.dispatchEvent(new CustomEvent("open-filters", { bubbles: true })),
      },
      "Tous les filtres"
    ),
    h("hr", { class: "rule rule--medium" })
  );

  return createScreen({
    id: "decouvrir",
    title: "Découvrir",
    above: filterbar,
    body: [cards, empty],
    bodyClass: "screen__body--cards",
    softLine: true,
  });
}
