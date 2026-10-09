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
  check("accueil ?lang=en : anglais, de gauche à droite, nom « Water points of Tunisia and the world », menu « Majels and wells in Tunisia », aucune erreur",
    d.documentElement.lang === "en" && d.documentElement.dir === "ltr" && /Water points of Tunisia and the world/.test(d.querySelector(".logo-nom").textContent)
    && [...d.querySelectorAll(".menu a")].some(a => a.textContent === "Majels and wells in Tunisia") && js.length === 0);
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
// ---- 6. huit langues (09/10/2026) : turc, indonésien, ourdou, allemand, espagnol traduits dans assets/langues.js (clé = texte français)
{
  const NOUVELLES = ["tr", "id", "ur", "de", "es"];
  const TR = (() => { const w = {}; new Function("window", lire("assets/langues.js"))(w); return w.TRADUCTIONS || {}; })();
  const cle = s => String(s).replace(/\s+/g, " ").trim();
  const textes = new Map(), structure = [];
  const ajouter = (fr, ou) => { fr = cle(fr || ""); if (fr && !textes.has(fr)) textes.set(fr, ou); };
  for (const p of PAGES) {
    const d = new JSDOM(lire(p)).window.document;
    d.querySelectorAll('[data-l="fr"]').forEach(f => f.tagName === "UL" ? [...f.children].forEach(li => ajouter(li.innerHTML, p)) : ajouter(f.innerHTML, p));
    d.querySelectorAll('[data-l="en"]').forEach(e => { const f = e.previousElementSibling && e.previousElementSibling.previousElementSibling;
      if (!f || f.dataset.l !== "fr" || e.previousElementSibling.dataset.l !== "ar") structure.push(p + " : " + cle(e.textContent).slice(0, 30)); });
    d.querySelectorAll("[data-fr]").forEach(o => ajouter(o.dataset.fr, p));
    d.querySelectorAll("[data-ph-fr]").forEach(o => ajouter(o.dataset.phFr, p));
    d.querySelectorAll("img[data-alt-ar]").forEach(o => ajouter(o.dataset.altFr || o.alt, p));
    d.querySelectorAll("[data-vfr]").forEach(o => ajouter(o.dataset.vfr, p));
  }
  // JS : 1er argument de T() / L2() / dire() et tableaux [fr, ar, en] (texte suivi d'un texte arabe), et { fr: …, en: … }
  const lit = s => JSON.parse('"' + s + '"');
  for (const f of readdirSync(join(root, "assets")).filter(f => f.endsWith(".js") && f !== "langues.js")) {
    const js = lire("assets/" + f);
    for (const m of js.matchAll(/"((?:[^"\\]|\\.)*)"\s*,\s*"(?:[^"\\]|\\.)*[؀-ۿ](?:[^"\\]|\\.)*"/g)) {
      const fr = lit(m[1]); if (fr.length > 2 && /[A-Za-zÀ-ÿ]/.test(fr) && !/[؀-ۿ]/.test(fr)) ajouter(fr, f);
    }
    for (const m of js.matchAll(/\bfr:\s*"((?:[^"\\]|\\.)*)"[^}]*?\ben:\s*"/g)) ajouter(lit(m[1]), f);
  }
  const manque = [];
  for (const [fr, ou] of textes) for (const l of NOUVELLES) if (!String((TR[l] || {})[fr] || "").trim()) manque.push(`${l} « ${fr.slice(0, 50)} » (${ou})`);
  check(`(a) 8 langues : les ${textes.size} textes français (pages + T()/L2() des scripts) ont une traduction non vide en ${NOUVELLES.join(", ")}`
    + (manque.length ? ` — MANQUE ${manque.length} : ${manque.slice(0, 8).join(" | ")}` : ""), textes.size >= 150 && !manque.length);
  check("(a) chaque texte « en » suit ses textes « fr » et « ar » (page.js y trouve le français) " + structure.join(" | "), !structure.length);
  const balises = []; for (const l of NOUVELLES) for (const [fr, t] of Object.entries(TR[l] || {})) if ((fr.match(/</g) || []).length !== (t.match(/</g) || []).length || (/\{n\}/.test(fr) && !/\{n\}/.test(t))) balises.push(l + " « " + fr.slice(0, 30) + " »");
  check("(a) traductions : mêmes balises HTML (gras, liens) et même « {n} » que le français " + balises.join(" | "), !balises.length);
  const css = lire("assets/style.css");
  check("CSS : les éléments « en » sont montrés pour tr, id, ur, de, es (ils reçoivent la traduction)", NOUVELLES.every(l => css.includes(`html[lang="${l}"] [data-l="en"]`)));
  check("hreflang des 8 langues sur toutes les pages (sauf video/)", PAGES.filter(p => !p.startsWith("video/")).every(p => ["fr", "ar", "en", ...NOUVELLES, "x-default"].every(l => lire(p).includes(`hreflang="${l}"`))));
}
{
  const { w, d, js } = await page("index.html", { lang: "tr", stockage: {} });
  const h1 = d.querySelector('h1 [data-l="en"]');
  check("(b) ?lang=tr : html lang tr, de gauche à droite, titre h1 en turc, menu et filtres en turc, aucune erreur JS",
    d.documentElement.lang === "tr" && d.documentElement.dir === "ltr" && h1.textContent === "Su nerede bulunur: kaynaklar, çeşmeler ve majeller"
    && [...d.querySelectorAll(".menu a")].some(a => a.textContent === "Harita") && /Doğal kaynak/.test(d.getElementById("pe-filtres").textContent) && js.length === 0);
  check("(b) turc : bulle AJEM, liste des types, placeholder et texte de remplacement de la photo (page Majels) traduits",
    /AJEM derneği tarafından kaydedildi/.test(w.EAUX_BULLE(w.EAUX_POINTS.points.find(p => p.src === "ajem")))
    && d.querySelector('#pe-type option[value="puits"]').textContent === "Kuyu" && d.getElementById("pe-nom").placeholder === "İsteğe bağlı"
    && (await page("majels-et-puits/index.html", { lang: "tr" })).d.querySelector(".hero .illus img").alt.startsWith("Cerbe'de"));
  check("(b) turc : la mémoire partagée « langue » n'est pas touchée (ni tr, ni rien)", w.localStorage.getItem("langue") === null && w.localStorage.getItem("langue-points-eau") === "tr");
}
{
  const { d, js } = await page("index.html", { lang: "ur" });
  check("(b) ?lang=ur : ourdou, de droite à gauche, nom du site en ourdou, aucune erreur JS", d.documentElement.lang === "ur" && d.documentElement.dir === "rtl"
    && /تیونس اور دنیا کے پانی کے مقامات/.test(d.querySelector(".logo-nom").textContent) && js.length === 0);
  const { d: d2, js: js2 } = await page("coran-et-eau/index.html", { lang: "es" });
  check("page Coran en espagnol : titre traduit, versets et hadiths restés en arabe", d2.querySelector('h1 [data-l="en"]').textContent === "El agua en el Corán y la Sunna"
    && /سورة الأنبياء/.test(d2.querySelector(".coran-page").textContent) && js2.length === 0);
  const { d: d3 } = await page("a-propos/index.html", { lang: "id" });
  check("page À propos en indonésien : listes traduites élément par élément (liens gardés)", /Asosiasi AJEM/.test(d3.querySelector('ul[data-l="en"]').textContent)
    && !!d3.querySelector('ul[data-l="en"] a[href="https://www.ajem.tn/fesguietna"]'));
}
{
  const { w, d, js } = await page("index.html");          // français (mémoire « langue » = fr)
  const bouton = () => d.querySelector(".langues-bouton"), liste = () => d.getElementById("langues-liste");
  check("(c) sélecteur compact : un bouton « FR » fermé, liste des 8 langues écrites dans leur langue",
    !!bouton() && /FR/.test(bouton().textContent) && bouton().getAttribute("aria-expanded") === "false" && liste().hidden
    && [...liste().querySelectorAll("[data-lang]")].map(b => b.textContent).join("|") === "Français|العربية|English|Türkçe|Bahasa Indonesia|اردو|Deutsch|Español");
  bouton().click();
  const ouverte = bouton().getAttribute("aria-expanded") === "true" && !liste().hidden;
  d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape" }));
  const echap = liste().hidden && bouton().getAttribute("aria-expanded") === "false";
  bouton().click(); d.querySelector("main").click();
  check("(c) le bouton ouvre la liste (aria-expanded), Échap la ferme, un clic dehors la ferme", ouverte && echap && liste().hidden);
  bouton().click(); [...liste().querySelectorAll("[data-lang]")].find(b => b.textContent === "Deutsch").click();
  check("(c) choisir Deutsch : page en allemand, « langue-points-eau » = de, « langue » partagée inchangée (fr), bouton « DE »",
    d.documentElement.lang === "de" && d.documentElement.dir === "ltr" && w.localStorage.getItem("langue-points-eau") === "de" && w.localStorage.getItem("langue") === "fr"
    && /DE/.test(bouton().textContent) && d.querySelector('h1 [data-l="en"]').textContent === "Wo man Wasser findet: Quellen, Brunnen und Majels"
    && /Natürliche Quelle/.test(d.getElementById("pe-filtres").textContent) && js.length === 0);
  bouton().click(); liste().querySelector('[data-lang="fr"]').click();
  const restes = [...d.querySelectorAll('[data-l="en"]')].filter(e => e.innerHTML !== e.dataset.enOrigine).length;
  check("(d) retour en français : textes français, plus aucun texte allemand (les « en » ont retrouvé l'anglais), filtres et menu en français",
    d.documentElement.lang === "fr" && restes === 0 && !/Wasser|Quelle|Karte/.test(d.getElementById("pe-filtres").textContent + d.querySelector(".menu").textContent)
    && d.querySelector('h1 [data-l="en"]').textContent === "Where to find water: springs, fountains and majels" && d.getElementById("pe-nom").placeholder === "Facultatif");
  liste().querySelector('[data-lang="en"]').click();
  check("(d) puis anglais : l'anglais d'origine (pas d'allemand)", d.documentElement.lang === "en" && d.querySelector('h1 [data-l="en"]').textContent === "Where to find water: springs, fountains and majels");
}
// ---- 7. demandes d'Ahmed du 09/10/2026 (soir) : robot trimestriel, Coran traduit, photos des types, menu
{
  const osm = existsSync(join(root, ".github/workflows/osm.yml")) ? lire(".github/workflows/osm.yml") : "";
  const sig = existsSync(join(root, ".github/workflows/signalements.yml")) ? lire(".github/workflows/signalements.yml") : "";
  check("robot OpenStreetMap tous les 3 mois (1er janvier, avril, juillet, octobre) ; signalements toujours toutes les 2 h",
    /cron:\s*"17 2 1 1,4,7,10 \*"/.test(osm) && !/cron:\s*"[^"]*\* \* 1"/.test(osm) && /cron:\s*"5 7-21\/2 \* \* \*"/.test(sig));
  const ap = lire("a-propos/index.html");
  check("page À propos : « relus tous les 3 mois » (FR, AR, EN), plus de « chaque semaine »",
    ap.includes("relus tous les 3 mois") && ap.includes("كل ثلاثة أشهر") && ap.includes("every 3 months") && !/chaque semaine|كل أسبوع|every week/.test(ap));
}
{
  const LANG7 = ["fr", "en", "tr", "id", "ur", "de", "es"];
  const { d, js } = await page("coran-et-eau/index.html");
  const figs = [...d.querySelectorAll("figure.hadith")], manque = [];
  figs.forEach((f, i) => {
    for (const l of LANG7) { const p = f.querySelector(`.sens [data-t="${l}"]`); if (!p || p.textContent.replace(/\s/g, "").length < 15) manque.push(`${i + 1}:${l}`); }
    if (!f.querySelector(".hadith-text") || !/[؀-ۿ]/.test(f.querySelector(".hadith-text").textContent)) manque.push(`${i + 1}: texte arabe`);
    const ayat = f.classList.contains("ayat"), sm = l => (f.querySelector(`.sens [data-t="${l}"] small`) || {}).textContent || "";
    if (ayat && !LANG7.every(l => /QuranEnc/.test(sm(l)))) manque.push(`${i + 1}: QuranEnc`);
    if (!ayat && (!/sunnah\.com/.test(sm("en")) || !/Traduction approximative du sens/.test(sm("fr")))) manque.push(`${i + 1}: source hadith`);
  });
  check(`page Coran : chaque verset et hadith (${figs.length}) garde l'arabe et a la traduction de son sens dans les 7 langues, avec sa source ${manque.join(" | ")}`,
    figs.length >= 9 && !manque.length && js.length === 0);
  const css = lire("assets/style.css");
  check("page Coran : la traduction suit la langue choisie (CSS), rien en plus en arabe", LANG7.every(l => css.includes(`html[lang="${l}"] [data-t="${l}"]`)) && !/html\[lang="ar"\] \[data-t/.test(css));
  check("crédits (À propos) : QuranEnc et sunnah.com cités", /quranenc\.com/.test(lire("a-propos/index.html")) && /sunnah\.com/.test(lire("a-propos/index.html")));
}
{
  const { d } = await page("index.html"), ap = lire("a-propos/index.html");
  const v = [...d.querySelectorAll(".types-eau figure.type-eau")], pb = [];
  for (const f of v) {
    const src = (f.querySelector("img") || {}).getAttribute?.("src") || "", c = f.querySelector("small");
    const fichier = join(root, src);
    if (!src || !existsSync(fichier) || statSync(fichier).size > 120 * 1024) pb.push(f.dataset.type + " photo");
    const lien = c && c.querySelector('a[href^="https://commons.wikimedia.org/wiki/File:"]');
    if (!lien || !/CC BY(-SA)? \d\.\d|CC0|domaine public/i.test(c.textContent)) pb.push(f.dataset.type + " crédit");
    else if (!ap.includes(lien.getAttribute("href"))) pb.push(f.dataset.type + " crédit absent de À propos");
  }
  check(`accueil : 5 photos des types (source, fontaine, robinet, majel, puits), chacune < 120 Ko avec auteur et licence, crédit aussi sur À propos ${pb.join(" | ")}`,
    v.map(f => f.dataset.type).join() === "source,fontaine,robinet,majel,puits" && !pb.length && !d.querySelector('.hero img[src="assets/photo-majel.jpg"]'));
  const { d: m } = await page("majels-et-puits/index.html");
  check("page Majels et puits : la photo du majel blanc de Djerba dans le bandeau, avec son crédit",
    !!m.querySelector('.hero .illus img[src="../assets/photo-majel.jpg"]') && /WikiChallenge 2022/.test(m.querySelector(".hero .illus figcaption").textContent));
  check("menu : « Majels et puits en Tunisie »", [...d.querySelectorAll(".menu a")].some(a => a.textContent === "Majels et puits en Tunisie"));
}
{
  const { d } = await page("index.html", { stockage: {} });
  check("sans choix, téléphone en anglais (faux navigateur en-US) → anglais ; ?lang=xx inconnu ignoré", d.documentElement.lang === "en");
  const { d: d2 } = await page("index.html", { lang: "xx", stockage: { langue: "ar" } });
  check("?lang=xx inconnu : ignoré (choix « ar » des autres sites gardé)", d2.documentElement.lang === "ar");
}
// ---- WaterPoint Data Exchange (WPdx, CC BY 4.0) en direct + zoom région + 2 serveurs en parallèle (09/10/2026)
{
  const { w, d } = await page();
  const M = w.EAUX_MONDE;
  const ok = [
    M.versPointWpdx({ row_id: "1", lat_deg: "0.3", lon_deg: "32.5", water_source_clean: "Borehole/Tubewell", status_id: "Yes" }),
    M.versPointWpdx({ row_id: "2", lat_deg: "0.3", lon_deg: "32.5", water_source_clean: "Protected Spring", status_id: "Unknown" }),
    M.versPointWpdx({ row_id: "3", lat_deg: "0.3", lon_deg: "32.5", water_source_clean: "Rainwater Harvesting" }),
    M.versPointWpdx({ row_id: "4", lat_deg: "0.3", lon_deg: "32.5", water_source_clean: "Piped Water", status_id: "Yes" })];
  const refuses = [
    M.versPointWpdx({ row_id: "5", lat_deg: "0.3", lon_deg: "32.5", water_source_clean: "Borehole/Tubewell", status_id: "No" }),
    M.versPointWpdx({ row_id: "6", lat_deg: "0.3", lon_deg: "32.5", water_source_clean: "Surface Water (River/Stream/Lake/Pond/Dam)" }),
    M.versPointWpdx({ row_id: "7", lat_deg: "x", lon_deg: "32.5", water_source_clean: "Protected Well" })];
  check("WPdx : forage → puits, source, pluie → majel, robinet ; « en panne », eau de surface et position illisible écartés",
    ok.map(p => p && p.type).join(",") === "puits,source,majel,robinet" && ok.every(p => p.src === "wpdx" && p.monde) && refuses.every(p => p === null));
  check("WPdx : bulle avec la source « Water Point Data Exchange (WPdx, CC BY 4.0) »", /Water Point Data Exchange \(WPdx, CC BY 4\.0\)/.test(w.EAUX_BULLE(ok[0])));
  const urls = [];
  w.fetch = async (u, o) => { urls.push(String(u)); return { ok: true, json: async () => [{ row_id: "9", lat_deg: "0.31", lon_deg: "32.58", water_source_clean: "Protected Well", status_id: "Yes" }] }; };
  const l = await M.lireWpdx(0.2, 32.4, 0.4, 32.7);
  const total = d.getElementById("pe-total").textContent;
  const n = M.ajouterWpdx(l), n2 = M.ajouterWpdx(l);
  check("WPdx : zone demandée (within_box nord, ouest, sud, est) sans les points en panne ; ajout sans doublon ; compteur Tunisie inchangé",
    /within_box\(geocoded_column, 0\.4000, 32\.4000, 0\.2000, 32\.7000\)/.test(decodeURIComponent(urls[0].replace(/\+/g, " "))) && /status_id != 'No'/.test(decodeURIComponent(urls[0].replace(/\+/g, " ")))
    && n === 1 && n2 === 0 && d.getElementById("pe-total").textContent === total);
  // 2 premiers serveurs OpenStreetMap EN MÊME TEMPS : le 1er (lent) n'empêche pas le 2e de répondre
  const appels = [];
  w.fetch = (u) => { appels.push(String(u)); return /mail\.ru/.test(u) ? new Promise(() => {}) : Promise.resolve({ ok: true, json: async () => ({ elements: [{ type: "node", id: 77, lat: 36.7, lon: 3.05, tags: { amenity: "drinking_water" } }] }) }); };
  const t0 = Date.now(), els = (await Promise.race([M.lireZone(36.6, 3.0, 36.8, 3.1), new Promise(r => setTimeout(() => r(null), 3000))])) || [];
  check("OpenStreetMap : 2 serveurs interrogés ensemble, le plus rapide gagne (le serveur bloqué ne fait pas attendre)",
    els.length === 1 && appels.length === 2 && Date.now() - t0 < 2000);
  check("CSP : WPdx (data.waterpointdata.org) autorisé ; zoom « région » (9) ; message posé sur la carte",
    /connect-src[^;]*data\.waterpointdata\.org/.test(lire("index.html")) && /ZOOM_MONDE = 9\b/.test(lire("assets/points-eau.js")) && /pe-zone-carte/.test(lire("assets/points-eau.js")));
}
console.log(`\n${erreurs ? erreurs + " PROBLÈME(S)" : "TOUT PASSE"} (${total} vérifications)`);
process.exit(erreurs ? 1 : 0);
