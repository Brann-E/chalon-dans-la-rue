import { h, img } from "../dom.js";
import { loadJSON } from "../data.js";
import * as store from "../store.js";
import { loadShows } from "../shows.js";
import { matchesFilters, inZone } from "../filtering.js";

/**
 * Feuille « Filtres » : horaire, date, programmation IN/OFF, catégorie, compagnies émergentes,
 * zone et région. Chaque changement met à jour l'état partagé ; la liste Découvrir suit en direct.
 * @param {{section?: string}} [options] section : groupe vers lequel défiler à l'ouverture
 */
export async function createFiltersPanel({ section = "" } = {}) {
  const [config, event, shows] = await Promise.all([loadJSON("data/filters.json"), loadJSON("data/event.json"), loadShows()]);

  // Un choix qu'aucun spectacle ne propose reste affiché mais inactif, pour ne pas mener à une liste vide.
  const available = {
    categories: (value) => shows.some((show) => show.category === value),
    zones: (value) => shows.some((show) => inZone(show, value)),
    regions: (value) => shows.some((show) => show.region === value),
  };

  // « IN » et « OFF » s'affichent tous deux enfoncés tant qu'aucun filtre n'est posé (état de la maquette).
  const ALL_PROGRAMMES = config.programme;
  const selected = (group) => {
    const current = store.getFilters()[group];
    return group === "programme" && current.length === 0 ? ALL_PROGRAMMES : current;
  };
  const toggleIn = (group, value) => {
    const current = selected(group);
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    const unfiltered = group === "programme" && (next.length === 0 || next.length === ALL_PROGRAMMES.length);
    store.setFilters({ [group]: unfiltered ? [] : next });
  };

  const chip = (group, value, label, token = null) => {
    const el = h(
      "button",
      { class: "chip", type: "button", "aria-pressed": "false", disabled: available[group] ? !available[group](value) : false, dataset: { group, value }, onclick: () => toggleIn(group, value) },
      token && h("span", { class: "chip__dot" }),
      label
    );
    if (token) el.querySelector(".chip__dot").style.setProperty("--dot", `var(--color-cat-${token})`);
    return el;
  };

  const chips = (group, items) => h("div", { class: "filters__chips" }, items.map((item) => chip(group, item.value, item.label, item.token)));
  const plain = (values) => values.map((value) => ({ value, label: value }));

  const hourSelect = (key) => {
    const select = h(
      "select",
      { class: "select", "aria-label": key === "from" ? "Heure de début" : "Heure de fin", dataset: { hour: key } },
      h("option", { value: "" }, "9h"),
      config.hours.map((hour) => h("option", { value: hour }, hour))
    );
    select.addEventListener("change", () => store.setFilters({ [key]: select.value }));
    return select;
  };

  const emergingSwitch = h("button", {
    class: "switch",
    type: "button",
    role: "switch",
    "aria-checked": "false",
    "aria-label": "Compagnies émergentes",
    disabled: !shows.some((show) => show.emerging === true),
  });
  emergingSwitch.addEventListener("click", () => store.setFilters({ emerging: !store.getFilters().emerging }));

  const THIN_RULE = new Set(["categories", "zones"]);
  const section_ = (key, title, ...content) =>
    h(
      "section",
      { class: THIN_RULE.has(key) ? "filters__section filters__section--thin" : "filters__section", dataset: { section: key } },
      h("h3", { class: "filters__section-title" }, title),
      ...content
    );

  const sections = [
    section_("hours", "Horaire", h("div", { class: "filters__hours" }, hourSelect("from"), "à", hourSelect("to"))),
    section_("days", "Date", chips("days", event.days.map((day) => ({ value: day.id, label: day.label })))),
    section_(
      "programme",
      "Programmation IN/OFF",
      chips("programme", plain(config.programme)),
      h("p", { class: "filters__hint" }, "IN : projets sélectionnés par le festival. OFF : projets programmés.")
    ),
    section_("categories", "Catégorie", chips("categories", config.categories.map((c) => ({ value: c.label, label: c.label, token: c.token })))),
    section_("emerging", "Compagnies émergentes", emergingSwitch),
    section_("zones", "Zone (autour de)", chips("zones", plain(config.zones)), h("button", { class: "filters__link", type: "button" }, "Découvrir les zones")),
    section_("regions", "Région (des compagnies)", chips("regions", plain(config.regions))),
  ];

  const body = h("div", { class: "filters__body" }, sections);

  const cta = h("button", {
    class: "filters__cta",
    type: "button",
    onclick: (event_) => event_.currentTarget.dispatchEvent(new CustomEvent("apply-filters", { bubbles: true })),
  });

  const close = (event_) => event_.currentTarget.dispatchEvent(new CustomEvent("close-overlay", { bubbles: true }));
  const panel = h(
    "section",
    { class: "filters", "aria-label": "Filtres" },
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
      el.setAttribute("aria-pressed", String(selected(el.dataset.group).includes(el.dataset.value)));
    });
    panel.querySelectorAll("select[data-hour]").forEach((select) => {
      select.value = filters[select.dataset.hour];
      select.classList.toggle("select--empty", select.value === "");
    });
    emergingSwitch.setAttribute("aria-checked", String(filters.emerging));

    // Le bouton annonce le nombre de spectacles avant d'y aller.
    const count = shows.filter((show) => matchesFilters(show, filters)).length;
    cta.disabled = count === 0;
    cta.textContent = count === 0 ? "Aucun résultat" : `Afficher ${count} résultat${count > 1 ? "s" : ""}`;
  };
  sync();
  const unsubscribe = store.subscribe(() => (panel.isConnected || !panel.__opened ? sync() : unsubscribe()));
  requestAnimationFrame(() => {
    panel.__opened = true;
    const target = section && sections.find((s) => s.dataset.section === section);
    if (target) body.scrollTo({ top: target.offsetTop, behavior: "smooth" });
  });
  return panel;
}
