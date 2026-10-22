/**
 * Itinéraire à pied : calcul par le service public OSRM (profil « foot », données OpenStreetMap, sans clé).
 * Si le service ne répond pas, on retombe sur une ligne droite avec un temps estimé : l'utilisateur voit toujours quelque chose.
 */
const ENDPOINT = "https://routing.openstreetmap.de/routed-foot/route/v1/foot";
const TIMEOUT_MS = 8000;
const WALK_SPEED = 1.25; // m/s (≈ 4,5 km/h)
const DETOUR = 1.3; // rapport entre le chemin réel et la ligne droite, pour l'estimation de secours
const EARTH_RADIUS = 6371000;

/** @param {[number, number]} from [lng, lat] @param {[number, number]} to */
export async function fetchWalkingRoute(from, to) {
  const url = `${ENDPOINT}/${from.join(",")};${to.join(",")}?overview=full&geometries=geojson`;
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const route = data.routes?.[0];
  if (data.code !== "Ok" || !route) throw new Error("Aucun itinéraire");
  return { coordinates: route.geometry.coordinates, distance: route.distance, duration: route.duration, estimated: false };
}

const toRadians = (degrees) => (degrees * Math.PI) / 180;

/** Ligne droite entre deux points, avec distance (majorée) et durée estimées. */
export function straightRoute(from, to) {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  const a = Math.sin(toRadians(lat2 - lat1) / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(toRadians(lng2 - lng1) / 2) ** 2;
  const distance = 2 * EARTH_RADIUS * Math.asin(Math.sqrt(a)) * DETOUR;
  return { coordinates: [from, to], distance, duration: distance / WALK_SPEED, estimated: true };
}

export const formatDuration = (seconds) => `${Math.max(1, Math.round(seconds / 60))} min`;

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}
