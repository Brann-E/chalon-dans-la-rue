/**
 * Défilement horizontal « au glissé » à la souris (au doigt, le navigateur le fait déjà).
 * Utilisé par les rangées de représentations et le carrousel de photos : on attrape, on tire.
 * Un glissé n'est pas un clic : le bouton sous le pointeur ne se déclenche pas à la fin du geste.
 */
const DRAG_THRESHOLD = 5; // px avant de considérer le geste comme un glissé

export function enableDragScroll(el) {
  let moved = false;

  el.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    moved = false;
    const startX = event.clientX;
    const startLeft = el.scrollLeft;

    const onMove = (move) => {
      const delta = move.clientX - startX;
      if (!moved && Math.abs(delta) > DRAG_THRESHOLD) {
        moved = true;
        el.classList.add("is-dragging"); // coupe l'aimantation et le texte sélectionnable pendant le geste
      }
      if (moved) el.scrollLeft = startLeft - delta;
    };
    const onEnd = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      el.classList.remove("is-dragging"); // l'aimantation reprend et recale sur la carte la plus proche
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  });

  // Le clic qui suit un glissé est annulé.
  el.addEventListener(
    "click",
    (event) => {
      if (!moved) return;
      moved = false;
      event.preventDefault();
      event.stopPropagation();
    },
    true
  );
}
