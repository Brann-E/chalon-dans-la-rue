import { h, img } from "../dom.js";
import { loadJSON } from "../data.js";
import { loadShows } from "../shows.js";
import * as store from "../store.js";
import { matchesFilters } from "../filtering.js";
import { createScreen } from "../ui/screen.js";
import { createShowCard, syncCard } from "../ui/show-card.js";

/** Pastilles du haut : chacune ouvre la feuille « Filtres » sur sa section et s'allume si elle est active. */
const CHIPS = [
  // Raccourci : l'appli s'ouvre comme au premier jour du festival ; la pastille filtre directement sur ce jour.
  { label: "Aujourd’hui", quick: true, active: (f, today) => f.days.length === 1 && f.days[0] === today },
  { label: "Horaire", section: "hours", active: (f) => Boolean(f.from || f.to) },
  { label: "Date", section: "days", active: (f) => f.days.length > 0 },
  { label: "IN/OFF", section: "programme", active: (f) => f.programme.length > 0 },
  { label: "Catégorie", section: "categories", active: (f) => f.categories.length > 0 },
  { label: "Zone", section: "zones", active: (f) => f.zones.length > 0 },
];

/** Nombre de cartes ajoutées à chaque fois que la fin de la liste approche (la programmation en compte 147). */
const PAGE_SIZE = 12;
const LOAD_MARGIN = "800px";

const normalize = (text) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// Mémoire de la liste : combien de cartes avaient été affichées pour telle recherche/tels filtres.
// Au retour (ex. depuis une fiche), on les recrée pour que le défilement mémorisé par le routeur retombe au bon endroit.
const remembered = { signature: "", shown: 0, query: "" };

export async function renderDecouvrir() {
  const [shows, event] = await Promise.all([loadShows(), loadJSON("data/event.json")]);
  const previous = { ...remembered };
  const today = event.today;
  const cards = h("div", { class: "cards" });
  const empty = h("p", { class: "empty-results", hidden: true }, "Aucun spectacle ne correspond à votre recherche.");
  const sentinel = h("div", { class: "cards__end", "aria-hidden": "true", hidden: true });

  // Les cartes ne sont construites que lorsqu'on s'en approche, puis gardées pour la suite.
  const built = new Map();
  const cardFor = (show) => {
    if (!built.has(show.id)) built.set(show.id, createShowCard(show));
    const el = built.get(show.id);
    syncCard(el);
    return el;
  };

  let matches = [];
  let shown = 0;
  const showMore = () => {
    const next = matches.slice(shown, shown + PAGE_SIZE);
    cards.append(...next.map(cardFor));
    shown += next.length;
    sentinel.hidden = shown >= matches.length;
    remembered.signature = signature;
    remembered.shown = shown;
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting || sentinel.hidden) return;
      showMore();
      // Si la fin est toujours en vue, on relance l'observation pour charger la suite.
      observer.unobserve(sentinel);
      observer.observe(sentinel);
    },
    { rootMargin: `0px 0px ${LOAD_MARGIN} 0px` }
  );

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
        onclick: (clickEvent) => {
          // « Aujourd'hui » bascule le filtre de date ; les autres ouvrent uniquement leur brique de « Filtres ».
          if (chip.quick) store.setFilters({ days: chip.active(store.getFilters(), today) ? [] : [today] });
          else clickEvent.currentTarget.dispatchEvent(new CustomEvent("open-filters", { bubbles: true, detail: { section: chip.section, only: true } }));
        },
      },
      chip.label
    )
  );

  // La liste n'est reconstruite que si la recherche ou les filtres changent (pas à chaque cœur ou épingle).
  let signature = "";
  const apply = () => {
    const filters = store.getFilters();
    const query = normalize(input.value.trim());
    remembered.query = input.value;
    CHIPS.forEach((chip, i) => chipEls[i].setAttribute("aria-pressed", String(chip.active(filters, today))));

    const next = JSON.stringify([filters, query]);
    if (next === signature) return;
    signature = next;

    matches = shows.filter((show) => {
      const haystack = normalize([show.title, show.company, show.category, show.location, show.tagline ?? ""].join(" "));
      return (!query || haystack.includes(query)) && matchesFilters(show, filters);
    });
    cards.replaceChildren();
    shown = 0;
    showMore();
    empty.hidden = matches.length > 0;
    observer.unobserve(sentinel);
    observer.observe(sentinel);
  };

  input.value = previous.query; // le texte cherché est retrouvé au retour
  input.addEventListener("input", apply);
  apply();
  // Même recherche/mêmes filtres qu'avant de partir : on retrouve autant de cartes qu'on en avait vu.
  if (previous.signature === signature) while (shown < previous.shown && shown < matches.length) showMore();
  const unsubscribe = store.subscribe(() => {
    if (cards.isConnected) apply();
    else {
      observer.disconnect();
      unsubscribe();
    }
  });

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
    body: [cards, sentinel, empty],
    bodyClass: "screen__body--cards",
    softLine: true,
  });
}
