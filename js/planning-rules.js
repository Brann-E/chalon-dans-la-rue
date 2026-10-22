/**
 * Règles du Planning : heures, durées et chevauchement de créneaux.
 * Partagées par l'écran Planning (avertissement sous chaque carte) et par la confirmation qui suit une épingle.
 */
export const toMinutes = (time) => {
  const [, hours, minutes] = /(\d+)h(\d*)/.exec(time) ?? [];
  return Number(hours ?? 0) * 60 + Number(minutes || 0);
};

export const dayOf = (rep) => rep.date;
export const startOf = (rep) => toMinutes(rep.time);
export const durationOf = (show) => toMinutes(show.duration);

/** Titre du premier autre spectacle épinglé dont le créneau chevauche celui de `entry`, sinon null. */
export function conflictFor(entry, entries) {
  const rep = entry.show.reps[entry.index];
  const start = startOf(rep);
  const end = start + durationOf(entry.show);
  const other = entries.find((o) => {
    if (o === entry) return false;
    const otherRep = o.show.reps[o.index];
    const oStart = startOf(otherRep);
    return dayOf(otherRep) === dayOf(rep) && start < oStart + durationOf(o.show) && oStart < end;
  });
  return other ? other.show.title : null;
}

/** Même chose pour un spectacle du planning enregistré (`planning` : [{showId, index}] de la mémoire de l'appli). */
export function findConflict(shows, planning, showId) {
  const byId = new Map(shows.map((show) => [show.id, show]));
  const entries = planning.filter((p) => byId.has(p.showId)).map((p) => ({ show: byId.get(p.showId), index: p.index }));
  const entry = entries.find((e) => e.show.id === showId);
  return entry ? conflictFor(entry, entries) : null;
}
