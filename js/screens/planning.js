import { h } from "../dom.js";
import { loadJSON } from "../data.js";
import { loadShows } from "../shows.js";
import * as store from "../store.js";
import { createScreen } from "../ui/screen.js";
import { createShowCard } from "../ui/show-card.js";
import { createEmptyState, createDemoFill } from "../ui/empty-state.js";
import { dayOf, startOf, conflictFor } from "../planning-rules.js";

/** Créneaux ajoutés par le raccourci « Remplir la page » : [spectacle, index de représentation]. */
// Les deux premiers se chevauchent (vendredi 24/07, 20h20) : de quoi voir l'avertissement.
const DEMO_PLANNING = [
  ["we-want-you", 1],
  ["ce-sera-pire-apres", 1],
  ["madame", 0],
  ["les-romanesques-edmond-rostand", 0],
];

const chronological = (a, b) => {
  const repA = a.show.reps[a.index];
  const repB = b.show.reps[b.index];
  return dayOf(repA).localeCompare(dayOf(repB)) || startOf(repA) - startOf(repB);
};

export async function renderPlanning() {
  const [shows, event] = await Promise.all([loadShows(), loadJSON("data/event.json")]);
  const byId = new Map(shows.map((show) => [show.id, show]));
  const planned = store.getPlanning().filter(({ showId }) => byId.has(showId));

  if (planned.length === 0) {
    const screen = createScreen({
      id: "planning",
      title: "Planning",
      softLine: true,
      bodyClass: "screen__body--empty",
      body: createEmptyState({
        title: "Ah !?",
        lead: "Il semblerait que vous n’avez pas encore mis de spectacle de côté.",
        art: "assets/chapeau.png",
        // Retour à la ligne voulu par la maquette, après « en ».
        hint: ["Remplissez vite votre planning en", h("br"), "cliquant sur l’icône “épingle” d’un spectacle."],
        shortHint: true,
        narrowHighlight: true,
      }),
    });
    screen.append(
      createDemoFill(() => {
        DEMO_PLANNING.forEach(([id, index]) => store.setPin(id, index));
        screen.dispatchEvent(new CustomEvent("navigate", { bubbles: true, detail: { to: "planning" } }));
      })
    );
    return screen;
  }

  const entries = planned.map(({ showId, index }) => ({ show: byId.get(showId), index })).sort(chronological);
  const cards = entries.map((entry) => ({ entry, el: createShowCard(entry.show, { plannedIndex: entry.index }) }));
  const list = h("div", { class: "cards" }, cards.map(({ el }) => el));
  const empty = h("p", { class: "empty-results", hidden: true }, "Rien de prévu ce jour-là.");

  // Avertissement de chevauchement, recalculé à chaque changement d'épingle.
  const refreshConflicts = () => {
    const live = entries.map((entry) => ({ ...entry, index: store.pinnedIndex(entry.show.id) ?? entry.index }));
    cards.forEach(({ el }, i) => {
      el.querySelector(".conflict")?.remove();
      const title = conflictFor(live[i], live);
      if (title) el.querySelector(".change-slot").after(h("p", { class: "conflict" }, `Chevauche « ${title} »`));
    });
  };
  refreshConflicts();
  const unsubscribe = store.subscribe(() => (list.isConnected ? refreshConflicts() : unsubscribe()));

  const selected = new Set();
  const applyFilter = () => {
    let visible = 0;
    cards.forEach(({ entry, el }) => {
      const rep = entry.show.reps[store.pinnedIndex(entry.show.id) ?? entry.index];
      el.hidden = selected.size > 0 && !selected.has(dayOf(rep));
      if (!el.hidden) visible += 1;
    });
    empty.hidden = visible > 0;
  };

  const chips = event.days.map((day) =>
    h(
      "button",
      {
        class: "chip",
        type: "button",
        "aria-pressed": "false",
        onclick: (clickEvent) => {
          const chip = clickEvent.currentTarget;
          const on = chip.getAttribute("aria-pressed") !== "true";
          chip.setAttribute("aria-pressed", String(on));
          if (on) selected.add(day.id);
          else selected.delete(day.id);
          applyFilter();
        },
      },
      day.label
    )
  );

  const daybar = h(
    "div",
    { class: "daybar" },
    h("div", { class: "daybar__main" }, h("h2", { class: "daybar__label" }, "Date"), h("div", { class: "daybar__chips" }, chips)),
    h("hr", { class: "rule" })
  );

  const screen = createScreen({
    id: "planning",
    title: "Planning",
    softLine: true,
    above: daybar,
    bodyClass: "screen__body--lists",
    body: [list, empty],
  });
  // Retour à l'état vide (même emplacement que « Remplir la page »).
  screen.append(
    createDemoFill(() => {
      store.clearPlanning();
      screen.dispatchEvent(new CustomEvent("navigate", { bubbles: true, detail: { to: "planning" } }));
    }, "Vider la page")
  );
  return screen;
}
