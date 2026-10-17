---
name: lancement-serveur
description: Consignes obligatoires avant de lancer, créer ou modifier le launcher (.claude/launch.json) de ce projet. À charger avant toute action sur le serveur de dev, pour ne jamais relancer le mauvais serveur d'un autre projet.
---

# Lancement du serveur — Chalon dans la rue

Ce fichier existe parce que ce projet a déjà été confondu avec un autre (le Portfolio 2026, servi sur le port 8777) après avoir été créé par erreur dans son dossier. Sept règles pour que ça n'arrive plus.

## 1. Racine unique de ce projet

`P:\0 - En cours\DEV\chalon-dans-la-rue` — et rien d'autre. Ce dossier ne doit jamais être imbriqué dans un autre projet (Portfolio, ou tout autre). Si la session Claude Code n'est pas ouverte sur ce chemin exact, le dire immédiatement et changer de dossier **avant** de toucher au launcher.

## 2. Le `launch.json` de ce projet ne contient QUE ce projet

`.claude/launch.json` à cette racine ne doit lister que des configurations pour **chalon-dans-la-rue**. Ne jamais y coller l'entrée d'un autre projet, ne jamais aller modifier le `launch.json` d'un autre dossier (notamment celui du Portfolio, à ne plus toucher).

## 3. Vérifier avant de créer

Avant de lancer quoi que ce soit :
- `preview_list` pour voir ce qui tourne déjà.
- Lire le `launch.json` de ce dossier — une config utilisable existe peut-être déjà.
- Si oui, la réutiliser telle quelle. Ne pas en créer une seconde par réflexe.

## 4. Port automatique, jamais codé en dur

Toujours `"autoPort": true`. Ne jamais fixer un port en dur dans les arguments — et surtout jamais réutiliser 8777 (port du Portfolio).

## 5. Serveur multi-thread obligatoire

Un serveur mono-thread (`socketserver.TCPServer`, `http.server.HTTPServer`) se fige dès que le navigateur ouvre plusieurs connexions en parallèle — symptôme trompeur de « serveur qui ne répond pas ». Utiliser :

```
import os,http.server;p=int(os.environ.get('PORT','8000'));http.server.ThreadingHTTPServer(('127.0.0.1',p),http.server.SimpleHTTPRequestHandler).serve_forever()
```

## 6. Vérifier avant d'annoncer que ça marche

`status: running` ne prouve rien. Charger une vraie page et un asset, vérifier les codes 200, checker `preview_logs`. Sinon c'est une affirmation en l'air.

## 7. Après tout déplacement de ce dossier

Si ce projet est encore déplacé un jour : le dire tout de suite (anciens chemins invalides, nouveau chemin à rouvrir), et ne jamais choisir soi-même la destination — c'est à l'utilisateur de la donner.
