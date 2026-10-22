import { h, img } from "../dom.js";
import { loadJSON } from "../data.js";
import * as store from "../store.js";
import { loadShows } from "../shows.js";
import { matchesFilters, inZone } from "../filtering.js";

/**
 * Feuille « Filtres » : horaire, date, programmation IN/OFF, catégorie et zone. Chaque changement met à jour
 * l'état partagé ; la liste Découvrir suit en direct. Seuls les choix qui correspondent à au moins un spectacle
 * sont proposés (pas de catégorie ou de zone vide).
 * @param {{section?: string, only?: boolean}} [options] section : groupe visé ; only : n'afficher que ce groupe
 *   (feuille basse, ouverte depuis une pastille de Découvrir), sinon toute la page avec défilement jusqu'au groupe.
 */
export async function createFiltersPanel({ section = "", only = false } = {}) {
  const single = only && Boolean(section);
  const [config, event, shows] = await Promise.all([loadJSON("data/filters.json"), loadJSON("data/event.json"), loadShows()]);

  // ---- Choix multiples (date, catégorie, zone) ---------------------------------------------
  const toggleIn = (group, value) => {
    const current = store.getFilters()[group];
    store.setFilters({ [group]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] });
  };

  const chip = (group, value, label, token = null) => {
    const el = h("button", { class: "chip", type: "button", "aria-pressed": "false", dataset: { group, value }, onclick: () => toggleIn(group, value) }, token && h("span", { class: "chip__dot" }), label);
    if (token) el.querySelector(".chip__dot").style.setProperty("--dot", `var(--color-cat-${token})`);
    return el;
  };
  const chips = (group, items) => h("div", { class: "filters__chips" }, items.map((item) => chip(group, item.value, item.label, item.token)));

  // ---- Programmation : Tous / IN / OFF (boutons radio) --------------------------------------
  // Un seul choix à la fois, toujours un d'actif : « Tous » est l'option qui regroupe les deux. Dans la mémoire de l'appli,
  // « Tous » = aucun filtre de programmation (liste vide), IN et OFF = filtre sur cette valeur.
  const PROGRAMMES = [
    { key: "all", programme: [], label: "Tous", note: "Tous les spectacles" },
    { key: "IN", programme: ["IN"], label: "IN", note: "Projets sélectionnés par le festival" },
    { key: "OFF", programme: ["OFF"], label: "OFF", note: "Projets accueillis par le festival" },
  ];
  const currentProgrammeKey = () => {
    const current = store.getFilters().programme;
    return current.length === 1 ? current[0] : "all";
  };
  const PROGRAMME_TITLE_ID = "filters-programme-title";
  const programmeRows = h(
    "div",
    { class: "filters__programme", role: "radiogroup", "aria-labelledby": PROGRAMME_TITLE_ID },
    PROGRAMMES.map((p) =>
      h(
        "label",
        { class: "radio" },
        h("input", {
          class: "radio__input",
          type: "radio",
          name: "programme",
          value: p.key,
          onchange: () => store.setFilters({ programme: p.programme }),
        }),
        h("span", { class: "radio__mark", "aria-hidden": "true" }),
        h("span", { class: "radio__text" }, h("span", { class: "radio__label" }, p.label), h("span", { class: "radio__note" }, p.note))
      )
    )
  );

  // ---- Horaire : un curseur à deux poignées ------------------------------------------------
  const hourValues = config.hours.map((hour) => parseInt(hour, 10));
  const MIN_HOUR = hourValues[0];
  const MAX_HOUR = hourValues[hourValues.length - 1];
  const toHour = (value) => (value === "" ? null : parseInt(value, 10));

  const rangeInput = (key, label) => h("input", { class: `range__input range__input--${key}`, type: "range", min: MIN_HOUR, max: MAX_HOUR, step: 1, "aria-label": label });
  const fromInput = rangeInput("from", "Heure de début");
  const toInput = rangeInput("to", "Heure de fin");
  const rangeReadout = h("output", { class: "range__readout" });
  const range = h(
    "div",
    { class: "range" },
    h("div", { class: "range__track" }, h("span", { class: "range__fill" })),
    fromInput,
    toInput
  );
  const onRangeInput = (changed) => {
    let from = Number(fromInput.value);
    let to = Number(toInput.value);
    if (from > to) {
      if (changed === "from") from = to;
      else to = from;
    }
    // Aux extrémités, pas de filtre : « Toute la journée ».
    store.setFilters({ from: from === MIN_HOUR ? "" : `${from}h`, to: to === MAX_HOUR ? "" : `${to}h` });
  };
  fromInput.addEventListener("input", () => onRangeInput("from"));
  toInput.addEventListener("input", () => onRangeInput("to"));

  const hoursBlock = h(
    "div",
    { class: "filters__hours" },
    rangeReadout,
    range,
    h(
      "div",
      { class: "range__ends" },
      // Cliquer sur une borne y ramène la poignée correspondante.
      h("button", { class: "range__end", type: "button", "aria-label": `Début à ${MIN_HOUR}h`, onclick: () => { fromInput.value = MIN_HOUR; onRangeInput("from"); } }, `${MIN_HOUR}h`),
      h("button", { class: "range__end", type: "button", "aria-label": `Fin à ${MAX_HOUR}h`, onclick: () => { toInput.value = MAX_HOUR; onRangeInput("to"); } }, `${MAX_HOUR}h`)
    )
  );

  // ---- Sections ----------------------------------------------------------------------------
  const THIN_RULE = new Set(["categories", "zones"]);
  const section_ = (key, title, ...content) =>
    h(
      "section",
      { class: THIN_RULE.has(key) ? "filters__section filters__section--thin" : "filters__section", dataset: { section: key } },
      h("h3", { class: "filters__section-title", id: key === "programme" ? PROGRAMME_TITLE_ID : null }, title),
      ...content
    );

  const categories = config.categories.filter((c) => shows.some((show) => show.category === c.label));
  const zones = config.zones.filter((zone) => shows.some((show) => inZone(show, zone)));

  const sections = [
    section_("hours", "Horaire", hoursBlock),
    section_("days", "Date", chips("days", event.days.map((day) => ({ value: day.id, label: day.label })))),
    section_("programme", "Programmation IN/OFF", programmeRows),
    section_("categories", "Catégorie", chips("categories", categories.map((c) => ({ value: c.label, label: c.label, token: c.token })))),
    section_(
      "zones",
      "Zone (autour de)",
      chips("zones", zones.map((zone) => ({ value: zone, label: zone }))),
      h("button", { class: "filters__link", type: "button", onclick: (event_) => {
        event_.currentTarget.dispatchEvent(new CustomEvent("close-overlay", { bubbles: true }));
        event_.currentTarget.dispatchEvent(new CustomEvent("navigate", { bubbles: true, detail: { to: "page", params: { id: "zones" } } }));
      } }, "Découvrir les zones")
    ),
  ];

  const body = h("div", { class: "filters__body" }, single ? sections.filter((s) => s.dataset.section === section) : sections);

  const cta = h("button", {
    class: "filters__cta",
    type: "button",
    onclick: (event_) => event_.currentTarget.dispatchEvent(new CustomEvent("apply-filters", { bubbles: true })),
  });

  const close = (event_) => event_.currentTarget.dispatchEvent(new CustomEvent("close-overlay", { bubbles: true }));
  const panel = h(
    "section",
    {
      class: single ? "filters filters--single" : "filters",
      "aria-label": "Filtres",
      // Feuille basse : toucher le fond assombri la ferme.
      onclick: (event_) => single && event_.target === event_.currentTarget && event_.currentTarget.dispatchEvent(new CustomEvent("close-overlay", { bubbles: true })),
    },
    h(
      "header",
      { class: "filters__header" },
      h(
        "div",
        { class: "filters__bar" },
        h("button", { class: "filters__close", type: "button", "aria-label": "Fermer", onclick: close }, img("assets/fermer.png")),
        h("h2", { class: "filters__title" }, "Filtres"),
        h("button", { class: "filters__reset", type: "button", onclick: () => store.resetFilters() }, "Réinitialiser")
      )
    ),
    body,
    h("footer", { class: "filters__footer" }, cta)
  );

  const sync = () => {
    const filters = store.getFilters();

    panel.querySelectorAll(".chip[data-group]").forEach((el) => {
      el.setAttribute("aria-pressed", String(filters[el.dataset.group].includes(el.dataset.value)));
    });

    const programmeKey = currentProgrammeKey();
    panel.querySelectorAll('.radio__input[name="programme"]').forEach((input) => {
      input.checked = input.value === programmeKey;
    });

    const from = toHour(filters.from) ?? MIN_HOUR;
    const to = toHour(filters.to) ?? MAX_HOUR;
    fromInput.value = from;
    toInput.value = to;
    const span = MAX_HOUR - MIN_HOUR;
    range.style.setProperty("--from", (from - MIN_HOUR) / span);
    range.style.setProperty("--to", (to - MIN_HOUR) / span);
    // La poignée du dessus est celle qui peut encore bouger quand les deux se rejoignent.
    fromInput.classList.toggle("is-top", from >= (MIN_HOUR + MAX_HOUR) / 2);
    rangeReadout.textContent = from === MIN_HOUR && to === MAX_HOUR ? "Toute la journée" : `De ${from}h à ${to}h`;

    // Le bouton annonce le nombre de spectacles avant d'y aller.
    const count = shows.filter((show) => matchesFilters(show, filters)).length;
    cta.disabled = count === 0;
    cta.textContent = count === 0 ? "Aucun résultat" : `Afficher ${count} résultat${count > 1 ? "s" : ""}`;
  };
  sync();
  const unsubscribe = store.subscribe(() => (panel.isConnected || !panel.__opened ? sync() : unsubscribe()));
  requestAnimationFrame(() => {
    panel.__opened = true;
    const target = !single && section && sections.find((s) => s.dataset.section === section);
    if (target) body.scrollTo({ top: target.offsetTop, behavior: "smooth" });
  });
  return panel;
}
