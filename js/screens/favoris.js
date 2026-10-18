import { h } from "../dom.js";
import { loadShows } from "../shows.js";
import * as store from "../store.js";
import { createScreen } from "../ui/screen.js";
import { createShowCard } from "../ui/show-card.js";
import { createEmptyState, createDemoFill } from "../ui/empty-state.js";

/** Spectacles ajoutés par le raccourci « Remplir la page » (ordre de la maquette). */
const DEMO_FAVORITES = ["fidji", "clap", "le-p-d", "hypothese"];

/**
 * Favoris : liste des spectacles aimés, ou état vide.
 * Retirer un cœur ne supprime pas la carte tant qu'on reste sur l'écran (comme dans la maquette).
 */
export async function renderFavoris() {
  const shows = await loadShows();
  const ids = store.getFavorites();

  if (ids.length === 0) {
    const screen = createScreen({
      id: "favoris",
      title: "Favoris",
      softLine: true,
      bodyClass: "screen__body--empty",
      body: createEmptyState({
        title: "Oh non !",
        lead: "Vous n’avez pas encore de favoris, et ça rend petit coeur tout triste.",
        art: "assets/coeur-brise.png",
        hint: "Cliquez simplement sur le petit coeur de la page d’un spectacle pour le voir apparaître ici.",
      }),
    });
    screen.append(
      createDemoFill(() => {
        store.addFavorites(DEMO_FAVORITES);
        screen.dispatchEvent(new CustomEvent("navigate", { bubbles: true, detail: { to: "favoris", refresh: true } }));
      })
    );
    return screen;
  }

  const byId = new Map(shows.map((show) => [show.id, show]));
  const cards = ids.filter((id) => byId.has(id)).map((id) => createShowCard(byId.get(id), { compact: true }));
  return createScreen({
    id: "favoris",
    title: "Favoris",
    softLine: true,
    bodyClass: "screen__body--lists",
    body: h("div", { class: "cards" }, cards),
  });
}
