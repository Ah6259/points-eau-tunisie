# Points d'eau Tunisie (points-eau-tunisie)

Fichier lu par Claude Code au début de chaque session. **Dépôt PUBLIC : rien de personnel ni de secret.** Répondre à Ahmed
**en français**, simplement. Toujours `git pull` avant de modifier, commit + push à la fin (Ahmed travaille aussi du téléphone).
Nouveau PC : `git config user.name Ah6259` et `git config user.email 200752748+Ah6259@users.noreply.github.com`.
Règles communes : `../../regles communes a tous les sites.md`.

## Le site (créé le 09/10/2026, idée d'Ahmed : « où trouver les sources d'eau, robinets publics, majels de Djerba et du Sud »)
- https://ah6259.github.io/points-eau-tunisie/ — 8 langues (09/10/2026) : FR, AR, EN écrits dans les pages ; turc, indonésien,
  ourdou, allemand, espagnol dans `assets/langues.js` (clé = texte français exact ; tout nouveau texte y est traduit, le test le vérifie). Site SÉPARÉ de Prix des Eaux (décision d'Ahmed : sinon les
  visiteurs ne comprennent pas le lien) ; liens dans les deux sens (carte sur l'accueil + pied de page).
- Accueil : carte Leaflet (fond OpenStreetMap, cdnjs) des points (`donnees/points_eau.js`), filtres par type (jamais un filtre
  à 0), « Autour de moi » (5 plus proches, itinéraire Google Maps par lien), signalement, « c'est vrai » / « n'existe plus ».
  Avertissement « Eau non contrôlée » en tête (obligatoire). Google Maps : SEULEMENT des liens (recherche, itinéraire) ;
  jamais de données Google copiées (conditions de Google), la clé Places du dossier dispatch n'est PAS utilisée ici.
- `coran-et-eau/` : versets et hadiths sur l'eau (déplacés du site Prix des Eaux le 09/10/2026, demande d'Ahmed).
- Partie payante : AUCUNE (décision prise sans Ahmed, à lui confirmer : un site d'entraide / sadaqa).

## Données et robots
- `tools/points_eau_osm.py` (robot `osm.yml`, tous les 3 mois : 1er janvier, avril, juillet, octobre) : OpenStreetMap, 5 serveurs Overpass, aire du pays admin_level=2 ;
  sources, fontaines, robinets/points d'eau, citernes, puits (privés exclus) → `donnees/points_osm.json` (ancien gardé en panne).
- `tools/signalements_points.py` (robot `signalements.yml`, toutes les 2 h) : lit le CSV PUBLIC du Google Forms du site Prix des
  Eaux (même formulaire : format POINT / POINT-OK / POINT-KO, marque = « type|nom » ou id, lieu = « lat,lon|jeton »).
  Le robot du site des Eaux ignore ces lignes. Règles dans `tools/points_eau.py` (Tunisie, type, nom nettoyé, 10/navigateur,
  doublon < 40 m = confirmation, statut signalé/confirmé, retiré si « n'existe plus » majoritaire ≥ 2, ≥ 3 pour OSM).

## Fabrication et tests
- Pages : `python tools/construire.py` (gabarits `tools/gabarits/`, une seule version `VERSION`) ; accueil écrit à la main.
- Tests : `node tools/test_site.mjs`, `python tools/test_points.py`, `python tools/test_sabotage.py` (9 sabotages),
  `node tools/test_sw.mjs`, `node tools/test_avis.mjs` ; tous dans `tests.yml`.
- **« Tunisie et monde » (09/10/2026, demande d'Ahmed : que les visiteurs sachent que la carte couvre le monde)** : nom affiché
  (en-tête, pied de page, manifeste) « Points d'eau de Tunisie et du monde / نقاط الماء في تونس والعالم » (adresse du site inchangée)
  + bandeau `.monde-bande` juste au-dessus de la carte : « 🌍 Le monde entier est sur la carte », villes d'exemple (`data-ville-ex`,
  La Mecque, Istanbul, Paris, Le Caire → recherche Nominatim, une requête par appui) et « Voir le monde » (`data-monde-vue`).
  Nom SANS tiret (demande d'Ahmed du 09/10) ; sur téléphone il passe sur 2-3 lignes (`.logo-nom`, media 560 px) ; titre Google
  « Où trouver de l'eau en Tunisie et dans le monde : … » ; recherche de ville : `chercherVille` de points-eau.js (CSP : nominatim).
