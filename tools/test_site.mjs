// Tests de Points d'eau Tunisie (faux navigateur jsdom) — node tools/test_site.mjs [dossier]
// (accepte un dossier pour tester une copie sabotée ; jsdom : npm install --no-save --no-package-lock jsdom)
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const require = createRequire(import.meta.url);
let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = require("jsdom")); }
catch (e) { ({ JSDOM, VirtualConsole } = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../../../documents Tunisie/site/package.json"))("jsdom")); }

const root = process.argv[2] ? resolve(process.argv[2]) : join(dirname(fileURLToPath(import.meta.url)), "..");
const lire = f => readFileSync(join(root, f), "utf8");
let erreurs = 0, total = 0;
const check = (d, ok) => { total++; if (ok) console.log("OK   " + d); else { erreurs++; console.log("FAIL " + d); } };
const BASE = "https://ah6259.github.io/points-eau-tunisie/";

const PAGES = [];
(function parcourir(d) {
  for (const n of readdirSync(join(root, d))) {
    const p = d ? d + "/" + n : n;
    if (["node_modules", ".git", "tools"].includes(n)) continue;
    if (statSync(join(root, p)).isDirectory()) parcourir(p); else if (n === "index.html") PAGES.push(p);
  }
})("");

async function page(chemin = "index.html", { stockage = { langue: "fr" }, lang } = {}) {
  const dossier = dirname(chemin);
  const html = lire(chemin).replace(/<script[^>]*gc\.zgo\.at[^>]*><\/script>/, "")
    .replace(/<script( defer)? src="((?:\.\.\/)*(?:assets|donnees)\/[^"?]+)(\?[^"]*)?"><\/script>/g, (_, d, f) => `<script>${lire(join(dossier, f).replace(/\\/g, "/"))}</script>`);
  const vc = new VirtualConsole(), js = [];
  vc.on("jsdomError", e => { if (!/Not implemented/.test(e.message)) js.push(e.message); });
  const url = BASE + (chemin === "index.html" ? "" : chemin.replace(/index\.html$/, "")) + (lang ? "?lang=" + lang : "");
  const dom = new JSDOM(html, { url, runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) { for (const [k, v] of Object.entries(stockage)) w.localStorage.setItem(k, v);
      w.__envois = []; w.IntersectionObserver = class { observe() {} disconnect() {} }; w.open = () => null; } });
  await new Promise(r => setTimeout(r, 60));
  return { w: dom.window, d: dom.window.document, js };
}

// ---- 1. toutes les pages : sécurité, installation
check(`pages : accueil, Majels & puits, Coran et l'eau, À propos (${PAGES.length})`, ["index.html", "majels-et-puits/index.html", "coran-et-eau/index.html", "a-propos/index.html"].every(p => PAGES.includes(p)));
const pb = [], versions = new Set();
for (const p of PAGES) {
  const h = lire(p);
  if (!/http-equiv="Content-Security-Policy"/.test(h) || !/noai, noimageai/.test(h) || !/translate="no"/.test(h) || !/strict-origin-when-cross-origin/.test(h)) pb.push(p + " sécurité");
  if (/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/.test(h) || /\son[a-z]+=/i.test(h)) pb.push(p + " script en ligne");
  if (!/apple-mobile-web-app-capable/.test(h)) pb.push(p + " iPhone");
  [...h.matchAll(/\?v=(\w+)/g)].forEach(m => versions.add(m[1]));
}
check(`toutes les pages : CSP, noai, pas de traduction auto, aucun script en ligne ${pb.join(" | ")}`, !pb.length);
check(`une seule version ?v= (${[...versions].join(", ")})`, versions.size === 1);
check("CSP de l'accueil : carte (cdnjs, tuiles OpenStreetMap) et envoi au formulaire Google autorisés", (() => { const h = lire("index.html");
  return /script-src[^;]*cdnjs\.cloudflare\.com/.test(h) && /img-src[^;]*tile\.openstreetmap\.org/.test(h) && /connect-src[^;]*docs\.google\.com/.test(h); })());
check("installation : manifeste (id unique), icônes, service worker, aperçu < 250 Ko", (() => { const m = JSON.parse(lire("manifest.webmanifest"));
  return m.id === "/points-eau-tunisie/" && ["assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/icon-maskable-512.png", "assets/apple-touch-icon.png", "sw.js", "favicon.ico", "assets/og-image-v1.jpg"]
    .every(f => existsSync(join(root, f))) && statSync(join(root, "assets/og-image-v1.jpg")).size < 250 * 1024; })());
check("robots.txt (IA refusées, sitemap), sitemap avec les pages, LICENSE", /GPTBot/.test(lire("robots.txt")) && /points-eau-tunisie\/sitemap\.xml/.test(lire("robots.txt"))
  && ["", "majels-et-puits/", "coran-et-eau/", "a-propos/"].every(p => lire("sitemap.xml").includes(`<loc>${BASE}${p}</loc>`)) && /Tous droits réservés/.test(lire("LICENSE")));

// ---- 2. accueil : carte, filtres, signalement
{
  const { w, d, js } = await page();
  const P = w.EAUX_POINTS;
  check(`données : au moins 100 points (${P.points.length}), types connus, positions en Tunisie`, P.points.length >= 100
    && P.points.every(p => ["source", "fontaine", "robinet", "majel", "puits"].includes(p.type) && p.lat > 30 && p.lat < 38 && p.lon > 7 && p.lon < 12));
  check("accueil sans erreur ; avertissement « Eau non contrôlée » ; compteur = nombre de points ; un filtre par type présent, jamais à 0", js.length === 0 && /Eau non contrôlée\./.test((d.querySelector(".pe-avert") || {}).textContent || "")
    && d.getElementById("pe-total").textContent === String(P.points.length) && d.querySelectorAll("#pe-filtres [data-type]").length === new Set(P.points.map(p => p.type)).size && ![...d.querySelectorAll("#pe-filtres b")].some(b => b.textContent === "0"));
  d.querySelector('#pe-filtres [data-type="puits"]').click();
  check("filtre : un clic désactive le type", d.querySelector('#pe-filtres [data-type="puits"]').getAttribute("aria-pressed") === "false");
  // fenêtre « Signaler un point d'eau » (comme « Signaler un prix » du site Prix des Eaux)
  const pop = d.getElementById("pe-sig-pop");
  check("signaler : une barre « Signaler un point d'eau » (pas de grand formulaire dans la page), fenêtre fermée au départ, formulaire DANS la fenêtre",
    !!d.querySelector("#signaler .sig-bar#pe-sig-ouvrir") && pop.hidden && !!pop.querySelector("#pe-form") && !d.querySelector("main #pe-form"));
  d.getElementById("pe-sig-ouvrir").click();
  check("barre → fenêtre ouverte, avec carte pour le repère, « Me localiser (GPS) », « Confirmer cette position », liste des derniers signalés",
    !pop.hidden && !!pop.querySelector("#pe-sig-carte") && /Me localiser/.test(d.getElementById("pe-ma-pos").textContent)
    && /Confirmer cette position/.test(d.getElementById("pe-pos-ok").textContent) && /soyez le premier/.test(d.getElementById("pe-derniers").textContent));
  d.getElementById("pe-pos-ok").click();
  check("« Confirmer » sans repère : message « Placez d'abord le repère », aucune position prise",
    /Placez d'abord le repère/.test(d.getElementById("pe-pos-txt").textContent) && d.getElementById("pe-pos").value === "");
  d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape" }));
  check("Échap ferme la fenêtre ; le lien « Signaler un point d'eau » du menu la rouvre", pop.hidden && (() => {
    const m = [...d.querySelectorAll(".menu a")].find(x => /#signaler$/.test(x.getAttribute("href"))); m && m.click(); return !!m && !pop.hidden; })());
  w.EAUX_POINTS.points.push({ id: "sig-test1", type: "source", lat: 36.8, lon: 10.1, nom: "Ain Test", src: "visiteur", date: w.EAUX_POINTS.maj.slice(0, 10), ok: 2, ko: 0, statut: "confirme" },
    { id: "sig-vieux", type: "source", lat: 36.8, lon: 10.1, nom: "Trop vieux", src: "visiteur", date: "2020-01-01", ok: 1, ko: 0, statut: "signale" });
  d.getElementById("pe-sig-fermer").click(); w.EAUX_SIGNALER();
  check("derniers signalés : le point récent (nom, « confirmé par 2 visiteurs », « voir sur la carte »), pas celui de plus de 30 jours",
    /Ain Test/.test(d.getElementById("pe-derniers").textContent) && /confirmé par 2 visiteurs/.test(d.getElementById("pe-derniers").textContent)
    && !!d.querySelector('#pe-derniers [data-voir="sig-test1"]') && !/Trop vieux/.test(d.getElementById("pe-derniers").textContent));
  w.EAUX_POINTS.points.splice(-2);
  d.getElementById("pe-type").value = "source"; d.getElementById("pe-pos").value = "";
  d.getElementById("pe-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  await new Promise(r => setTimeout(r, 20));
  check("sans position confirmée : rien n'est envoyé, message « Placez le repère … Confirmer cette position »",
    w.__envois.length === 0 && /Placez le repère/.test(d.getElementById("pe-statut").textContent));
  d.getElementById("pe-type").value = "majel"; d.getElementById("pe-nom").value = "Majel | près de la mosquée"; d.getElementById("pe-pos").value = "33.80760,10.84510";
  d.getElementById("pe-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  await new Promise(r => setTimeout(r, 20));
  const e = w.__envois[0] || {};
  check("signaler : format POINT, « type|nom » (le « | » du nom remplacé), « position|jeton anonyme », remerciement", e["entry.1939823394"] === "POINT"
    && /^majel\|Majel\s+près de la mosquée$/.test(e["entry.897098257"] || "") && /^33\.80760,10\.84510\|pt:[a-z0-9]+$/.test(e["entry.506707149"] || "") && /Merci/.test(d.getElementById("pe-statut").textContent));
  d.getElementById("pe-type").value = ""; d.getElementById("pe-pos").value = "36.80000,10.18000";
  d.getElementById("pe-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  await new Promise(r => setTimeout(r, 20));
  check("sans type (position donnée) : rien n'est envoyé, message « Choisissez le type »", w.__envois.length === 1 && /type/.test(d.getElementById("pe-statut").textContent));
  const b = d.createElement("div"); b.innerHTML = `<div class="pe-voix"><button type="button" data-ok="osm-n1">✓</button></div>`; d.body.appendChild(b);
  b.querySelector("button").click(); await new Promise(r => setTimeout(r, 20));
  check("« c'est vrai » : format POINT-OK, id du point, jeton", w.__envois[1] && w.__envois[1]["entry.1939823394"] === "POINT-OK" && w.__envois[1]["entry.897098257"] === "osm-n1");
  const aj = P.points.find(p => p.src === "ajem" && p.etat === "mauvais");
  check(`majels AJEM : au moins 150 sur la carte (${P.points.filter(p => p.src === "ajem").length}), crédit « AJEM … Fesguietna » sous la carte`,
    P.points.filter(p => p.src === "ajem").length >= 150 && !!d.querySelector('.pe-credit-ajem a[href="https://www.ajem.tn/fesguietna"]'));
  check("bulle d'un majel AJEM : « Recensé par l'association AJEM », état, lien vers sa fiche AJEM", !!aj && (() => {
    const h = w.EAUX_BULLE(aj); return /Recensé par l'association AJEM/.test(h) && /Mauvais état/.test(h) && h.includes(`href="${aj.lien}"`); })());
  check("bulle : un lien qui n'est pas une fiche AJEM n'est jamais affiché", !/evil/.test(w.EAUX_BULLE({ ...(aj || {}), lien: "https://evil.example/x" })));
  check("accueil : carte « Majels, puits et techniques de l'eau » vers la nouvelle page", !!d.querySelector('main a.outil[href="majels-et-puits/"]'));
  check("menu : Carte, Signaler, Majels & puits, Le Coran et l'eau, À propos ; lien vers Prix des Eaux (carte de l'accueil + pied de page)", d.querySelectorAll(".menu a").length === 5
    && !!d.querySelector('.menu a[href="majels-et-puits/"]')
    && !!d.querySelector('footer a[href="https://ah6259.github.io/prix-eaux-tunisie/"]') && !!d.querySelector('main a.outil[href="https://ah6259.github.io/prix-eaux-tunisie/"]'));
}
{
  const { d, js } = await page("index.html", { lang: "ar", stockage: { langue: "en" } });
  check("accueil en arabe : droite-gauche, nom « نقاط الماء في تونس », filtres en arabe, aucune erreur", d.documentElement.dir === "rtl" && /نقاط الماء في تونس/.test(d.querySelector(".logo-nom").textContent)
    && /عين ماء/.test(d.getElementById("pe-filtres").textContent) && js.length === 0);
}
// ---- 3. Coran et Sunna sur l'eau (repris du site Prix des Eaux)
{
  const { d, js } = await page("coran-et-eau/index.html");
  check("page Coran : 9 textes (versets puis hadiths), dont « سقي الماء » et sourate Al-Anbiya 30", js.length === 0 && d.querySelectorAll("figure.hadith").length >= 9
    && d.querySelectorAll("figure.hadith.ayat").length >= 5 && /سَقْيُ الماءِ/.test(d.body.textContent) && /سورة الأنبياء/.test(d.body.textContent));
}
// ---- 4. toutes les pages : bouton Partager, « Votre avis », menu
{
  const manque = [];
  for (const p of PAGES) {
    const { d } = await page(p);
    if (d.querySelectorAll("header .partager").length !== 1) manque.push(p + " partager");
    if (!d.querySelector('footer a[href$="#avis"]')) manque.push(p + " avis");
    if (d.querySelectorAll(".menu a").length !== 5) manque.push(p + " menu");
  }
  check(`toutes les pages : Partager dans l'en-tête, « Votre avis », menu ${manque.join(" | ")}`, !manque.length);
}
// ---- 5. Majels & puits (demande d'Ahmed du 09/10/2026) et anglais (3e langue, « pour le monde entier »)
{
  const { d, js } = await page("majels-et-puits/index.html");
  const liens = [...d.querySelectorAll(".mp-liens li a")];
  check(`page Majels & puits : explication du majel, au moins 15 liens (${liens.length}) dont AJEM, WOCAT citerne, Bir Barouta ; tous dans un nouvel onglet`,
    js.length === 0 && d.querySelectorAll(".mp-bref li").length >= 4 && liens.length >= 15
    && ["https://www.ajem.tn/fesguietna", "https://wocat.net/en/database/technologies/1413/"].every(h => liens.some(a => a.href === h))
    && liens.some(a => /Barouta/.test(a.textContent)) && liens.every(a => a.target === "_blank" && /noopener/.test(a.rel)));
  check("page Majels & puits : sections puits (#puits) et majels (#majels), lien « Ajoutez-le sur la carte »",
    !!d.getElementById("puits") && !!d.getElementById("majels") && !!d.querySelector('a[href="../#signaler"]'));
}
{
  const manque = [];
  for (const p of PAGES) {
    const h = lire(p), n = l => (h.match(new RegExp(`data-l="${l}"`, "g")) || []).length;
    if (n("fr") !== n("ar") || n("fr") !== n("en")) manque.push(`${p} (fr ${n("fr")}, ar ${n("ar")}, en ${n("en")})`);
  }
  for (const [a, b] of [["data-fr=", "data-en="], ["data-ph-fr=", "data-ph-en="], ["data-alt-ar=", "data-alt-en="], ["data-vfr=", "data-ven="]])
    for (const p of PAGES) { const h = lire(p); if (h.split(a).length !== h.split(b).length) manque.push(p + " " + b); }
  check(`anglais : chaque texte français a sa traduction arabe ET anglaise, sur toutes les pages ${manque.join(" | ")}`, !manque.length);
}
{
  const { w, d, js } = await page("index.html", { lang: "en", stockage: {} });
  check("accueil ?lang=en : anglais, de gauche à droite, nom « Water Points Tunisia », menu « Majels & wells », aucune erreur",
    d.documentElement.lang === "en" && d.documentElement.dir === "ltr" && /Water Points Tunisia/.test(d.querySelector(".logo-nom").textContent)
    && [...d.querySelectorAll(".menu a")].some(a => a.textContent === "Majels & wells") && js.length === 0);
  check("anglais : filtres, bulle AJEM et fenêtre de signalement en anglais",
    /Natural spring/.test(d.getElementById("pe-filtres").textContent) && /Surveyed by the AJEM association/.test(w.EAUX_BULLE(w.EAUX_POINTS.points.find(p => p.src === "ajem")))
    && (w.EAUX_SIGNALER(), /no water point reported|be the first/i.test(d.getElementById("pe-derniers").textContent)) && d.querySelector('#pe-type option[value="well"], #pe-type option[value="puits"]').textContent === "Well");
  d.querySelector('.langues [data-lang="fr"]').click();
  check("choix de langue FR · ع · EN : un clic passe en français, gardé sous « langue-points-eau » ; « langue » partagée = fr",
    d.documentElement.lang === "fr" && w.localStorage.getItem("langue-points-eau") === "fr" && w.localStorage.getItem("langue") === "fr"
    && d.querySelector('.langues [data-lang="fr"]').getAttribute("aria-pressed") === "true");
  d.querySelector('.langues [data-lang="en"]').click();
  check("choisir l'anglais n'écrit PAS « en » dans la mémoire partagée par les autres sites (reste fr)",
    d.documentElement.lang === "en" && w.localStorage.getItem("langue-points-eau") === "en" && w.localStorage.getItem("langue") === "fr");
}
{
  const { d } = await page("index.html", { stockage: {} });
  check("sans choix enregistré, téléphone dans une autre langue (anglais) → site en anglais", d.documentElement.lang === "en");
  const { d: d2 } = await page("index.html", { stockage: { langue: "ar" } });
  check("choix « arabe » fait sur un autre de nos sites → arabe", d2.documentElement.lang === "ar");
}
{
  // monde entier : lecture en direct d'OpenStreetMap hors de Tunisie (faux serveurs : le 1er répond « vide + erreur cachée »)
  const { w, d } = await page();
  const appels = [];
  w.fetch = async (url) => { appels.push(url); return appels.length === 1
    ? { ok: true, json: async () => ({ elements: [], remark: "runtime error: Query timed out" }) }
    : { ok: true, json: async () => ({ elements: [
        { type: "node", id: 1, lat: 48.853, lon: 2.3499, tags: { amenity: "drinking_water", name: "Fontaine Wallace" } },
        { type: "node", id: 2, lat: 48.854, lon: 2.35, tags: { man_made: "water_well", access: "private" } },
        { type: "way", id: 3, center: { lat: 48.855, lon: 2.351 }, tags: { natural: "spring" } },
        { type: "node", id: 4, lat: 48.856, lon: 2.352, tags: { amenity: "drinking_water", drinking_water: "no" } }] }) }; };
  const total = d.getElementById("pe-total").textContent, avant = w.EAUX_POINTS.points.length;
  const els = await w.EAUX_MONDE.lireZone(48.8, 2.3, 48.9, 2.4);
  const n = w.EAUX_MONDE.ajouterZone(els), n2 = w.EAUX_MONDE.ajouterZone(els);
  check("monde : serveur avec erreur cachée → serveur suivant ; fontaine et source de Paris ajoutées, puits privé et eau non potable écartés, pas de doublon",
    appels.length === 2 && n === 2 && n2 === 0 && w.EAUX_POINTS.points.length === avant + 2
    && w.EAUX_POINTS.points.some(p => p.id === "osm-n1" && p.type === "fontaine" && p.nom === "Fontaine Wallace" && p.monde)
    && w.EAUX_POINTS.points.some(p => p.id === "osm-w3" && p.type === "source"));
  w.dispatchEvent(new w.Event("resize")); d.dispatchEvent(new w.Event("langue"));
  check("monde : le compteur du haut reste celui de la Tunisie ; CSP autorise les 5 serveurs OpenStreetMap",
    d.getElementById("pe-total").textContent === total && ["overpass-api.de", "maps.mail.ru", "overpass.kumi.systems", "overpass.private.coffee", "overpass.openstreetmap.fr"]
      .every(h => new RegExp("connect-src[^;]*" + h.replace(/\./g, "\\.")).test(lire("index.html"))));
}
{
  const publics = PAGES.map(lire).join("\n") + lire("assets/page.js");
  check("aucune donnée Google copiée (seulement des liens de recherche / d'itinéraire)", !/maps\.googleapis\.com|AIza/.test(publics + lire("assets/points-eau.js")));
}
console.log(`\n${erreurs ? erreurs + " PROBLÈME(S)" : "TOUT PASSE"} (${total} vérifications)`);
process.exit(erreurs ? 1 : 0);
