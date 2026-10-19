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
- `tools/signalements_points.py` (robot `signalements.yml`, toutes les 2 h ; depuis le 10/10/2026 commit SEULEMENT si un point change, ou chaque semaine : `doit_ecrire`) : lit le CSV PUBLIC du Google Forms du site Prix des
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

- **Adresse depuis le 11/10/2026 : https://eau.clicvia.com/** (domaine clicvia.com d'Ahmed, ligne DNS `CNAME eau → ah6259.github.io` nuage gris, fichier `CNAME`). L'ancienne adresse ah6259.github.io/points-eau-tunisie/ redirige seule. Site à la racine « / » : `BASE_SITE` de assets/page.js (sw.js, vidéo) ; GoatCounter garde le préfixe `/points-eau-tunisie`. Si l'outil vidéo réécrit le bloc VIDEO_SITE, remettre `"base": BASE_SITE` et l'ORIGINE eau.clicvia.com.

- **11/10/2026 — les 5 photos de l'accueil défilent seules sur téléphone** (demande d'Ahmed : « ça donne une vie au site ») :
  assets/page.js ajoute une copie des 5 photos (`li.copie`, cachée aux lecteurs d'écran) et la classe `.defile` ; style.css les fait
  glisser de droite à gauche (15 s pour les 5, ≈ 3 s par photo ; pause au toucher ; même sens en arabe ; arrêt si « moins d'animations ») ;
  sur ordinateur (≥ 700 px) les 5 restent côte à côte, sans mouvement. Testé par test_site.mjs.
- **11/10/2026 — aperçu WhatsApp** : petite vignette chez un ami → ajout de og:url / og:site_name / og:locale (comme Prix des Eaux) et image renommée `assets/og-image-v2.jpg` (WhatsApp garde l'ancienne en mémoire : nouveau nom à chaque changement).

- **Visibilité Google (12/10/2026, règle commune § 8)** : liens vers nos autres sites en `https://<site>.clicvia.com/` (jamais `ah6259.github.io`), lien « Tous nos services » → https://clicvia.com/ dans le pied de page, `robots.txt` avec ligne Sitemap, `sitemap.xml` daté, JSON-LD sur l'accueil, clé IndexNow `377f054ba9c5ed40d6796adc8d87d1e8.txt` à la racine (ne pas supprimer : robot `indexnow` du portail). Contrôle : `node "outils visibilite/controle.mjs"` (dépôt projets-ahmed). Sitemap envoyé dans Search Console par Ahmed le 12/10/2026.

- **Google + Bing (12/10/2026)** : sitemap envoyé par Ahmed dans Google Search Console et dans Bing Webmaster Tools (site clicvia.com/), indexation de l'accueil demandée. Pour un nouveau site : mêmes gestes, voir `nouveau site - procedure.md` § 4 étape 5 (dépôt projets-ahmed).

- **UNE ADRESSE PAR LANGUE (12/10/2026, visibilité Google — demande d'Ahmed, même méthode que Mosquées)** : chaque page existe en
  français à son adresse d'origine ET dans `ar/`, `en/`, `tr/`, `id/`, `ur/`, `de/`, `es/` (28 pages), déjà écrite dans la langue
  (`<html lang>`, sens, titre = `<h1>` + nom du site, description = introduction, texte, adresse officielle, hreflang, x-default =
  anglais). `tools/construire.py` écrit les pages françaises puis `tools/pages_langues.py` en tire les 7 autres et refait
  `sitemap.xml` (32 adresses + vidéo) — **ne jamais modifier à la main un fichier de `ar/ … es/`**. Liens entre pages : dans le
  dossier de la langue ; `assets/`, `donnees/` : à la racine ; `video/` reste une seule page (`?lang=`).
  `assets/page.js` : la langue est celle de l'ADRESSE ; le bouton de langue ouvre l'autre adresse et garde le choix
  (`langue-points-eau`) ; ancien lien `?lang=ar` ou choix déjà fait → bonne adresse ; jamais de changement d'après la langue du
  téléphone seule (Google lirait de l'anglais sur la page française) : lien « English → » proposé sous le menu.
  Nouveau texte français : le traduire dans `assets/langues.js` ; la construction dit « N texte(s) resté(s) en anglais » (0 attendu).

- **21 LANGUES (13/10/2026, demande d'Ahmed : mêmes langues que Mosquées et The Message)** : it, pt, nl, zh, ja, ko, hi puis ru, vi, th, tl, sv, ro ajoutées
  aux 8 d'origine. 4 pages × 21 langues, 84 adresses dans le plan du site. Textes des 13 nouvelles langues :
  `tools/langues_plus/<langue>.txt` (une ligne « numéro<TAB>traduction » par texte de `_francais.json`, 193 textes), module
  `tools/langues_plus.py`. **Nouveau texte français** : l'ajouter dans `assets/langues.js` (5 langues) ET à la fin de
  `_francais.json` + une ligne dans chacun des 13 `.txt` (la construction s'arrête sinon).
  Page « Le Coran et l'eau » : versets = traduction OFFICIELLE QuranEnc de chaque langue (dans le gabarit, jamais traduits par
  nous) ; hadiths = « traduction approximative du sens », comme en français. Une page de langue ne garde que la traduction de
  sa langue et ne charge que son dictionnaire `assets/l/<langue>.js`. Traductions écrites par Claude, non relues par des natifs.

- **Test CSP des images (18/10/2026, VS.9, tous les sites qui affichent des images d'autres sites)** : test_site.mjs vérifie que
  chaque image d'un autre site (balise `<img>`, fond de carte OpenStreetMap, image citée par un script ou les données) est autorisée
  par la CSP `img-src` de SA page (cas vu sur Mosquées : 144 photos bloquées). Aucune violation ici. Nouveau serveur d'images = l'ajouter à `img-src`.

- **Carte Leaflet isolée (règle commune, 18/10/2026)** : `.leaflet-container{isolation:isolate;z-index:0}` dans assets/style.css (les couches Leaflet, 400+, ne passent plus devant une liste ou une fenêtre) ; listes et fenêtres au-dessus de la carte au z-index ≥ 1000 (`.langues-liste` 1100, `.help-pop` 1000) ; testé dans test_site.mjs. Recherche « au son » (§ 27) : rien à faire ici, la recherche de ville va à Nominatim (service extérieur, pas de filtre local).

- **19/10/2026 — Visiteur simulé : contrôle des ESPACES (§ 29)** : titre de la barre « Signaler » caché SOUS le bouton › dans les langues longues (it, es, ru) → coupé par « … » ; bouton « Envoyer » de la fenêtre centré (24 px au-dessus et au-dessous) ; version 20261019a ; 0 anomalie.
