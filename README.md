# Points d'eau de Tunisie et du monde (نقاط الماء في تونس والعالم)

Nom affiché sur le site depuis le 09/10/2026 (avant : « Points d'eau Tunisie ») ; l'adresse ne change pas.

Carte gratuite, en français et en arabe, des sources, fontaines d'eau potable, robinets publics, majels et puits de Tunisie, et du monde entier (bandeau « Le monde entier est sur la carte » : recherche d'une ville, villes
d'exemple, « Voir le monde »).
Les visiteurs peuvent signaler un point d'eau, le confirmer ou dire qu'il n'existe plus. Aussi : l'eau dans le Coran et la Sunna.

En ligne : https://ah6259.github.io/points-eau-tunisie/

## Comment il vit tout seul
- `signalements.yml` (toutes les 2 h) publie les points signalés ; `osm.yml` (tous les 3 mois) relit OpenStreetMap.
- `tests.yml` à chaque modification ; `gendarme-tests.yml`, `relance-pages.yml` : kit commun.

## Plan de continuité
1. Sans personne, le site continue : les signalements se publient seuls, OpenStreetMap est relu tous les 3 mois.
2. Alerte « relevé OpenStreetMap en échec » : les anciens points sont gardés ; relancer `osm.yml` plus tard suffit souvent.
3. Si le formulaire Google (celui du site Prix des Eaux) change ou disparaît, les signalements s'arrêtent mais la carte reste.

Données : © contributeurs OpenStreetMap (ODbL) et visiteurs. © 2026 — tous droits réservés (voir LICENSE).
