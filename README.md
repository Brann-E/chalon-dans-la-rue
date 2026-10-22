# Chalon dans la rue — prototype

Prototype cliquable de l'application du festival Chalon dans la rue, reconstruit à partir de la maquette Figma
(HTML, CSS et JavaScript natifs, sans outil de build). Prévu pour être intégré à un portfolio.

- **Écrans** : Carte, Découvrir, Favoris, Planning, Menu et ses sous-pages, fiche spectacle, fiche d'un lieu,
  feuilles « Filtres » et « Filtres carte ».
- **Carte** : MapLibre GL JS (`vendor/maplibre-gl`) sur des tuiles OpenFreeMap, restylée aux couleurs de la maquette.
- **Données** : la programmation (147 spectacles, 60 lieux numérotés) vient du site officiel du festival.
- **Design** : toutes les valeurs de design sont des variables CSS dans `css/tokens.css`.

## Lancer en local

```bash
python tools/dev-server.py
```

Le serveur lit la variable `PORT` (8000 par défaut) et sert le dossier du projet.

## Données

Les fichiers de `data/` sont générés par trois scripts Node (sans dépendance, hors redimensionnement des photos) :

```bash
node tools/scrape-programme.mjs programme.json         # liste + fiches du site
SHARP_DIR=<dossier avec sharp> node tools/fetch-photos.mjs programme.json assets/shows
node tools/build-data.mjs programme.json <ancien-venues.json>   # shows.json, venues.json, event.json
node tools/scrape-pages.mjs data/pages.json            # textes des sous-pages du Menu
```

Les scripts espacent leurs requêtes et s'arrêtent après plusieurs échecs d'affilée.
Les textes, photos et informations appartiennent au festival et aux compagnies.

## Points à connaître

- Les numéros de pastille et les noms de lieux viennent des fiches du site ; les coordonnées sont reprises du plan
  précédent, géocodées avec Nominatim, ou (pour 2 lieux) placées par défaut près du centre.
- Les catégories du site sont rapprochées de celles de la maquette (ex. « Musique de rue » → Concert).
- Les favoris, le planning, les filtres et les réglages sont mémorisés dans le navigateur (`localStorage`).
