import * as store from "../store.js";
import { loadShows } from "../shows.js";
import { findConflict } from "../planning-rules.js";
import { showToast } from "./toast.js";
import { shareRep } from "./share.js";

/**
 * Actions de l'utilisateur sur un spectacle (cœur, épingle) avec leur retour visuel :
 * petit rebond de l'icône, puis confirmation en bas avec « Annuler » (le chevauchement est signalé dès l'épingle).
 */
const pop = (trigger) => {
  if (!trigger) return;
  trigger.classList.add("is-pop");
  trigger.addEventListener("animationend", () => trigger.classList.remove("is-pop"), { once: true });
};

/**
 * Pastilles d'une carte de représentation (Voir sur la carte, Itinéraire, Partager).
 * Renvoie true si le bouton cliqué en fait partie. `host` : élément d'où l'événement part vers l'appli.
 */
export function handleRepAction(button, show, host) {
  const action = button.dataset.action;
  if (!action) return false;
  const rep = show.reps[Number(button.dataset.rep)];
  // Le clic part au relâchement du doigt ; on attend la fin du ressort du bouton pour qu'on voie l'animation avant de changer d'écran.
  const run = () => {
    if (action === "share") shareRep(show, rep);
    else host.dispatchEvent(new CustomEvent(action === "map" ? "show-on-map" : "route-to", { bubbles: true, detail: { id: show.id, spot: rep.spot, venue: rep.venue } }));
  };
  const delay = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--duration-fast")) || 0;
  setTimeout(run, delay);
  return true;
}

export function toggleFavorite(show, trigger) {
  const added = !store.isFavorite(show.id);
  store.toggleFavorite(show.id);
  pop(trigger);
  showToast({
    message: added ? `« ${show.title} » ajouté aux favoris` : `« ${show.title} » retiré des favoris`,
    actionLabel: "Annuler",
    onAction: () => store.toggleFavorite(show.id),
  });
}

export async function togglePin(show, index, trigger) {
  const removing = store.isPinned(show.id, index);
  const previous = store.pinnedIndex(show.id);
  store.togglePin(show.id, index);
  pop(trigger);

  if (removing) {
    showToast({ message: `« ${show.title} » retiré du planning`, actionLabel: "Annuler", onAction: () => store.setPin(show.id, index) });
    return;
  }
  const rep = show.reps[index];
  const clash = findConflict(await loadShows(), store.getPlanning(), show.id);
  showToast({
    message: `Ajouté au planning : ${rep.date} - ${rep.time}${clash ? ` · chevauche « ${clash} »` : ""}`,
    actionLabel: "Annuler",
    onAction: () => (previous === null ? store.togglePin(show.id, index) : store.setPin(show.id, previous)),
  });
}
