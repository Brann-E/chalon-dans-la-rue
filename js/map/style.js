/**
 * Style de fond de plan (schéma OpenMapTiles, tuiles vectorielles OpenFreeMap) reproduisant
 * la carte de la maquette : fond gris-bleu, rues blanches, Saône bleue, parcs verts.
 * Les couleurs viennent des tokens CSS (--map-*), jamais d'une valeur en dur ici.
 */
const SOURCE = "openmaptiles";

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const widthByZoom = (stops) => ["interpolate", ["exponential", 1.5], ["zoom"], ...stops.flat()];

const road = (id, classes, widths) => ({
  id,
  type: "line",
  source: SOURCE,
  "source-layer": "transportation",
  filter: ["all", ["==", ["geometry-type"], "LineString"], ["in", ["get", "class"], ["literal", classes]]],
  layout: { "line-cap": "round", "line-join": "round" },
  paint: { "line-color": token("--map-road"), "line-width": widthByZoom(widths) },
});

export function buildStyle() {
  const label = token("--map-label");
  const halo = token("--map-label-halo");

  return {
    version: 8,
    name: "chalon-dans-la-rue",
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      [SOURCE]: {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
        attribution:
          '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": token("--map-background") } },
      {
        id: "landuse-institution",
        type: "fill",
        source: SOURCE,
        "source-layer": "landuse",
        filter: ["in", ["get", "class"], ["literal", ["school", "hospital", "university", "college", "kindergarten", "retail"]]],
        paint: { "fill-color": token("--map-institution") },
      },
      {
        id: "landuse-grey",
        type: "fill",
        source: SOURCE,
        "source-layer": "landuse",
        filter: ["in", ["get", "class"], ["literal", ["cemetery", "pitch", "playground", "stadium", "railway"]]],
        paint: { "fill-color": token("--map-grey") },
      },
      {
        id: "landcover-green",
        type: "fill",
        source: SOURCE,
        "source-layer": "landcover",
        filter: ["in", ["get", "class"], ["literal", ["grass", "wood"]]],
        paint: { "fill-color": token("--map-park") },
      },
      { id: "park", type: "fill", source: SOURCE, "source-layer": "park", paint: { "fill-color": token("--map-park") } },
      { id: "water", type: "fill", source: SOURCE, "source-layer": "water", paint: { "fill-color": token("--map-water") } },
      {
        id: "waterway",
        type: "line",
        source: SOURCE,
        "source-layer": "waterway",
        paint: { "line-color": token("--map-water"), "line-width": widthByZoom([[13, 1], [16, 6], [19, 20]]) },
      },
      {
        id: "rail",
        type: "line",
        source: SOURCE,
        "source-layer": "transportation",
        filter: ["==", ["get", "class"], "rail"],
        paint: { "line-color": token("--map-rail"), "line-width": widthByZoom([[13, 1], [18, 4]]), "line-dasharray": [3, 2] },
      },
      road("road-path", ["path", "pedestrian"], [[13, 1], [16, 4], [19, 12]]),
      road("road-minor", ["minor", "service", "track"], [[13, 2], [16, 8], [19, 28]]),
      road("road-tertiary", ["tertiary"], [[13, 3], [16, 11], [19, 36]]),
      road("road-major", ["secondary", "primary", "trunk", "motorway"], [[13, 4], [16, 14], [19, 44]]),
      {
        id: "road-label",
        type: "symbol",
        source: SOURCE,
        "source-layer": "transportation_name",
        minzoom: 14.5,
        layout: {
          "symbol-placement": "line",
          "text-field": ["coalesce", ["get", "name:latin"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": widthByZoom([[14, 9], [18, 13]]),
          "text-letter-spacing": 0.02,
        },
        paint: { "text-color": label, "text-halo-color": halo, "text-halo-width": 1.5 },
      },
      {
        id: "water-label",
        type: "symbol",
        source: SOURCE,
        "source-layer": "water_name",
        layout: {
          "text-field": ["coalesce", ["get", "name:latin"], ["get", "name"]],
          "text-font": ["Noto Sans Italic"],
          "text-size": 13,
          "text-letter-spacing": 0.2,
        },
        paint: { "text-color": token("--map-water-label"), "text-halo-color": halo, "text-halo-width": 1.2 },
      },
      {
        id: "place-label",
        type: "symbol",
        source: SOURCE,
        "source-layer": "place",
        filter: ["in", ["get", "class"], ["literal", ["suburb", "neighbourhood", "quarter"]]],
        minzoom: 14,
        layout: {
          "text-field": ["coalesce", ["get", "name:latin"], ["get", "name"]],
          "text-font": ["Noto Sans Bold"],
          "text-size": 11,
          "text-transform": "uppercase",
          "text-letter-spacing": 0.1,
        },
        paint: { "text-color": label, "text-halo-color": halo, "text-halo-width": 1.5 },
      },
    ],
  };
}
