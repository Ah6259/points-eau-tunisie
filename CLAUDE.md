# Points d'eau Tunisie (points-eau-tunisie)

## EN TOUT PREMIER (24/11/2026, problème vu par Ahmed)
- La mémoire générale, les « update workflow » et le journal de TOUS les sites sont dans le dépôt PRIVÉ **`Ah6259/projets-ahmed`**
  (le dépôt général), PAS ici. Une session ouverte sur ce seul dépôt ne voit donc pas le dernier travail d'Ahmed (le 24/11, une session
  a répondu « dernier update workflow : 22/11 » alors qu'il y en avait deux le jour même dans projets-ahmed).
- **Au début de CHAQUE session, avant de répondre quoi que ce soit** : si `../projets-ahmed` n'existe pas, le brancher
  (`add_repo` Ah6259/projets-ahmed, puis `git clone --depth 30 https://github.com/Ah6259/projets-ahmed ../projets-ahmed`) ; sinon `git pull` ;
  puis `python3 "debut de session.py" points-eau` dans `../projets-ahmed` et en résumer le résultat à Ahmed.
- « Dernier workflow / dernière mise à jour » = regarder `git log` de projets-ahmed ET de ce dépôt (toutes branches), jamais un seul.

Fichier lu par Claude Code au début de chaque session. **Dépôt PUBLIC : rien de personnel ni de secret.** Répondre à Ahmed
**en français**, simplement. Toujours `git pull` avant de modifier, commit + push à la fin (Ahmed travaille aussi du téléphone).
Nouveau PC : `git config user.name Ah6259` et `git config user.email 200752748+Ah6259@users.noreply.github.com`.
Règles communes : `../../regles communes a tous les sites.md`.

## Le site (créé le 09/10/2026, idée d'Ahmed : « où trouver les sources d'eau, robinets publics, majels de Djerba et du Sud »)
- **https://eau.clicvia.com/** (depuis le 11/10/2026 ; l'ancienne adresse ah6259.github.io/points-eau-tunisie/ redirige seule) —
  **21 langues** depuis le 13/10/2026 (`LANGUES` de `tools/pages_langues.py` : fr, ar, en, tr, id, ur, de, es, it, pt, nl, zh, ja,
  ko, hi, ru, vi, th, tl, sv, ro ; détail plus bas). Au départ (09/10/2026) : FR, AR, EN écrits dans les pages ; turc, indonésien,
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
  **Feuille illisible (23/10/2026, § 17 + § 38)** : erreur réseau, page HTML (connexion Google), réponse vide ou colonnes
  manquantes = relue 2 fois (2 puis 4 min) ; toujours illisible : carte non touchée, début noté dans
  `donnees/signalements_etat.json`, robot ROUGE si la panne dure plus de 2 jours. Feuille lisible sans nouveau signalement = vert.
  Test : `tools/test_signalements_points.py` (sans réseau).
- **Alertes (23/10/2026, comme Mosquées)** : `signalements.yml` et `osm.yml` ouvrent une issue « alerte-robot » en cas d'échec
  (e-mail à Ahmed) et la referment seuls au passage suivant réussi.

## Fabrication et tests
- Pages : `python tools/construire.py` (gabarits `tools/gabarits/`, une seule version `VERSION`) ; accueil écrit à la main.
- Tests : `node tools/test_site.mjs`, `python tools/test_points.py`, `python tools/test_sabotage.py` (9 sabotages),
  `node tools/test_sw.mjs`, `node tools/test_avis.mjs`, `python tools/test_signalements_points.py` ; tous dans `tests.yml`.
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

- **RÈGLE D'AHMED (25/10/2026, règle commune § 44) : la page « Comment fonctionne le site ? » (`a-propos/`, h1 « Comment fonctionne
  le site ? » / « كيف يعمل الموقع؟ », 21 langues) est mise à jour à CHAQUE modification visible, dans le même envoi** ; test `FONCTIONS`
  dans `tools/test_site.mjs` (repère dans le code ou les pages → phrase attendue dans la page : une fonction présente mais non
  expliquée = test rouge = publication bloquée). Nouvelle fonction = une ligne dans `FONCTIONS` + une ligne dans la liste
  « Comment s'en servir » de `tools/gabarits/a-propos.html` (fr, ar, en) + sa traduction dans `assets/langues.js` (5 langues) et à la
  fin de `tools/langues_plus/_francais.json` + chaque `.txt` (13 langues). Liens : sous le titre de l'accueil (`.lien-comment`) et
  dans le pied de page (`assets/page.js`). Version 20261025a.

- **08/11/2026 — plan SEO d'Ahmed appliqué à ce site (phase 2 ; contrôle commun `outils visibilite/controle_seo.mjs` de projets-ahmed ;
  plan : `consignes des taches/seo-eau.md`)** : `titre_seo()` / `desc_seo()` dans `tools/construire.py` et `tools/pages_langues.py`
  (titre <= 70 caractères, le suffixe « | nom du site » est gardé et la base coupée à un séparateur ; description <= 165 coupée en fin de
  phrase) ; accueil : titre « Où trouver de l'eau en Tunisie : sources, fontaines, majels (gratuit) », description 165. Les 84 pages
  des 21 langues refaites ; tests verts (site, points, sabotage, sw, avis, signalements). Page « Le Coran et l'eau » : les deux
  sous-titres passent de h3 à h2 (plus de saut h1 -> h3, contrôle en ligne du 08/11).

## 21/11/2026 — mode sombre lisible (signalé par Ahmed, tous les sites)
- En sombre, la couleur principale `--vert` devient claire (#5CC6CF) : le texte blanc posé dessus (« Carte », « Autour de moi », « Chercher »,
  « Envoyer ») était illisible (contraste 2,0). Nouvelle variable `--sur-vert` (blanc en clair, `--bg` foncé en sombre) dans assets/style.css
  pour tout texte posé sur `--vert` / `--avis-c` / `--p` ; bouton « Partager » de la vidéo sur `--carte` ; boutons « C'est vrai » des bulles
  de la carte avec une couleur de texte fixe. Contrôle : 0 texte sous 3 de contraste (clair et sombre). VERSION 20261121a.
- **21/11/2026 — outil vidéo réparé** : `tools/page_video.mjs` recopiait de la page modèle (À propos, à langue fixe) les liens hreflang et
  `data-fixe` / `data-chemin` : la page vidéo se croyait la page À propos. Il les retire maintenant ; anglais ajouté dans `tools/page_video.json`.
  Test n° 7 de `tools/test_video.mjs` (vérifié par sabotage). `node tools/page_video.mjs` peut de nouveau être relancé.

## 22/11/2026 — Google + IA (demande d'Ahmed : « que Google et les IA indexent nos sites »)
- État Search Console (21/11) : accueil « Crawled - currently not indexed » (dernière visite de Google le 12/10), coran-et-eau/ « Discovered » ;
  requêtes vues : « eau autour de moi », « source eau potable autour de moi » (position 4 à 7).
- Accueil (index.html, recopié dans les 21 langues par pages_langues.py) : JSON-LD WebSite (nom, autres noms, 21 langues) + éditeur
  `Organization` Clicvia (@id https://clicvia.com/#organisation, page Facebook) ; description française « … l'eau potable autour de vous ».
- robots.txt (assistants IA de recherche permis, entraînement refusé) et llms.txt (sans chiffre) déjà bons : inchangés.
  Pas de nouvelle phrase dans « Comment fonctionne le site ? » (21 langues : l'éditeur est dit dans le JSON-LD).

## 25/11/2026 — plan Google (B.2, « fais » d'Ahmed après la chute Google d'octobre)
- **lastmod HONNÊTE** : la fin de tools/construire.py passe le plan du site par `tools/lastmod.py` (outil COMMUN, copié tel quel) : date du
  dernier VRAI changement du contenu de chaque page (empreinte du titre, de la description, du texte et des images, SANS menus, pied,
  scripts, ?v= ni dates) gardée dans `donnees/lastmod.json` (enregistré avec les pages) au lieu de la date de VERSION pour toutes ;
  page noindex = hors du plan. Test : `python tools/test_lastmod.py donnees/lastmod.json` (tests.yml ; données inventées + vrai plan ;
  vérifié par sabotage). Pages maigres : aucune (4 pages × 21 langues, toutes de vraies traductions), rien en noindex.

## 28/11/2026 — « Les points d'eau en chiffres » (plan VIS.3 point 5 d'Ahmed : Google et les IA ne lisent que le TEXTE, pas la carte)
- Sous la carte de l'accueil (21 langues), partie `section#chiffres` repliée au départ (règle § 66 : titre + pastille du total), ÉCRITE
  dans la page par `bloc_chiffres()` de `tools/construire.py` entre les repères `<!--chiffres-->…<!--/chiffres-->` de index.html (ne pas
  l'écrire à la main) : nombre de points de la carte en Tunisie par type (types sans point non montrés, comme les filtres) et par source
  (OpenStreetMap, AJEM = majels de Djerba, visiteurs), total, « Date des chiffres » (`maj` de donnees/points_eau.js) et « Relevé
  OpenStreetMap du » (`osm_maj`) ; le compteur `#pe-total` du haut est lui aussi écrit dans la page (avant : 0 sans JavaScript).
  MÊMES données et même filtre que la carte (points retirés déjà exclus par points_eau.py, points « monde » exclus). Le 28/11 : 357 points
  (43 sources, 18 fontaines, 12 robinets, 212 majels, 72 puits ; 145 OpenStreetMap, 212 AJEM).
- **PAS de chiffre par gouvernorat** (choix du 28/11, règle « on ne devine jamais un chiffre ») : les points n'ont pas de gouvernorat dans
  les données (OpenStreetMap : id, type, position, nom ; AJEM : Djerba seulement) et le dépôt n'a aucun fichier des limites des
  gouvernorats. Pour l'ajouter un jour : faire écrire le gouvernorat par le robot OpenStreetMap (zone admin_level=4 de chaque point,
  « is_in » d'Overpass) ou ajouter un fichier libre des limites + un test point-dans-polygone, avec l'accord d'Ahmed.
- Les chiffres suivent les données : `signalements.yml` et `osm.yml` relancent `python tools/construire.py` avant d'enregistrer
  (pages des 21 langues comprises). Textes : `TEXTES_CHIFFRES` / `TYPES_CHIFFRES` / `SOURCES_CHIFFRES` de construire.py, traduits dans
  assets/langues.js (5 langues) et tools/langues_plus/ (13 langues). « Comment fonctionne le site ? » : ligne « Les points d'eau en
  chiffres » + FONCTIONS. Test test_site.mjs (21 langues, total = carte, sommes, dates, replié, sans NaN) vérifié par 2 sabotages (un
  nombre changé dans en/index.html ; un point retiré des données sans refaire les pages). VERSION 20261128a.
