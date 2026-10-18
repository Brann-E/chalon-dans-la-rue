import { h, img } from "../dom.js";
import { loadShows } from "../shows.js";
import * as store from "../store.js";
import { matchesFilters } from "../filtering.js";
import { createScreen } from "../ui/screen.js";
import { createShowCard } from "../ui/show-card.js";

/** Pastilles du haut : chacune ouvre la feuille « Filtres » sur sa section et s'allume si elle est active. */
const CHIPS = [
  { label: "Horaire", section: "hours", active: (f) => Boolean(f.from || f.to) },
  { label: "Date", section: "days", active: (f) => f.days.length > 0 },
  { label: "IN/OFF", section: "programme", active: (f) => f.programme.length > 0 },
  { label: "Catégorie", section: "categories", active: (f) => f.categories.length > 0 },
  { label: "Compagnie émergente", section: "emerging", active: (f) => f.emerging },
  { label: "Zone", section: "zones", active: (f) => f.zones.length > 0 },
];

const normalize = (text) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export async function renderDecouvrir() {
  const shows = await loadShows();
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

  const chipEls = CHIPS.map((chip) =>
    h(
      "button",
      {
        class: "chip",
        type: "button",
        "aria-pressed": "false",
        onclick: (event) => event.currentTarget.dispatchEvent(new CustomEvent("open-filters", { bubbles: true, detail: { section: chip.section } })),
      },
      chip.label
    )
  );

  const apply = () => {
    const filters = store.getFilters();
    const query = normalize(input.value.trim());
    let visible = 0;
    for (const { show, el } of entries) {
      const haystack = normalize([show.title, show.company, show.category, show.location].join(" "));
      const match = (!query || haystack.includes(query)) && matchesFilters(show, filters);
      el.hidden = !match;
      if (match) visible += 1;
    }
    empty.hidden = visible > 0;
    CHIPS.forEach((chip, i) => chipEls[i].setAttribute("aria-pressed", String(chip.active(filters))));
  };

  input.addEventListener("input", apply);
  apply();
  const unsubscribe = store.subscribe(() => (cards.isConnected ? apply() : unsubscribe()));

  const filterbar = h(
    "div",
    { class: "filterbar" },
    h("div", { class: "search" }, img("assets/icon-search.svg", { class: "search__icon" }), input),
    h("hr", { class: "rule rule--strong" }),
    h("div", { class: "chips" }, chipEls),
    h(
      "button",
      {
        class: "filters-link",
        type: "button",
        onclick: (event) => event.currentTarget.dispatchEvent(new CustomEvent("open-filters", { bubbles: true, detail: { section: "" } })),
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
