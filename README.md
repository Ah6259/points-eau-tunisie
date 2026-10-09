# Points d'eau Tunisie

Carte gratuite, en français et en arabe, des sources, fontaines d'eau potable, robinets publics, majels et puits de Tunisie.
Les visiteurs peuvent signaler un point d'eau, le confirmer ou dire qu'il n'existe plus. Aussi : l'eau dans le Coran et la Sunna.

En ligne : https://ah6259.github.io/points-eau-tunisie/

## Comment il vit tout seul
- `signalements.yml` (toutes les 2 h) publie les points signalés ; `osm.yml` (chaque lundi) relit OpenStreetMap.
- `tests.yml` à chaque modification ; `gendarme-tests.yml`, `relance-pages.yml` : kit commun.

## Plan de continuité
1. Sans personne, le site continue : les signalements se publient seuls, OpenStreetMap est relu chaque semaine.
2. Alerte « relevé OpenStreetMap en échec » : les anciens points sont gardés ; relancer `osm.yml` plus tard suffit souvent.
3. Si le formulaire Google (celui du site Prix des Eaux) change ou disparaît, les signalements s'arrêtent mais la carte reste.

Données : © contributeurs OpenStreetMap (ODbL) et visiteurs. © 2026 — tous droits réservés (voir LICENSE).
