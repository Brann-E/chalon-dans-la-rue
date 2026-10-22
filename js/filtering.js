/** Application des filtres de la feuille « Filtres » à la liste des spectacles. */
const norm = (text) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[’']/g, "'");

const hourOf = (time) => Number(/(\d+)h/.exec(time)?.[1] ?? NaN);

/** Le spectacle joue-t-il « autour de » cette zone (nom de zone contenu dans le nom d'un de ses lieux) ? */
export function inZone(show, zone) {
  const z = norm(zone).replace(/^place g\. de gaulle$/, "place general de gaulle");
  return show.reps.some((rep) => {
    const venue = norm(rep.venue);
    return venue.includes(z) || z.includes(venue);
  });
}

/** Les groupes sont combinés en « et » ; plusieurs valeurs d'un même groupe, en « ou ». */
export function matchesFilters(show, filters) {
  const { from, to, days, programme, categories, zones } = filters;

  if (days.length && !show.reps.some((rep) => days.includes(rep.date))) return false;

  const start = from ? hourOf(from) : null;
  const end = to ? hourOf(to) : null;
  if ((start !== null || end !== null) && !show.reps.some((rep) => {
    const hour = hourOf(rep.time);
    return (start === null || hour >= start) && (end === null || hour <= end);
  })) return false;

  if (programme.length && !programme.includes(show.programme)) return false;
  if (categories.length && !categories.includes(show.category)) return false;
  if (zones.length && !zones.some((zone) => inZone(show, zone))) return false;
  return true;
}
