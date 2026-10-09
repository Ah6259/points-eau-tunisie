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

async function page(chemin = "index.html", { stockage = {}, lang } = {}) {
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
check(`pages : accueil, Coran et l'eau, À propos (${PAGES.length})`, ["index.html", "coran-et-eau/index.html", "a-propos/index.html"].every(p => PAGES.includes(p)));
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
  && ["", "coran-et-eau/", "a-propos/"].every(p => lire("sitemap.xml").includes(`<loc>${BASE}${p}</loc>`)) && /Tous droits réservés/.test(lire("LICENSE")));

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
  check("rubrique « Majels et techniques pour avoir de l'eau » : au moins 5 liens, dont AJEM, tous dans un nouvel onglet",
    d.querySelectorAll("#majels li a").length >= 5 && !!d.querySelector('#majels a[href="https://www.ajem.tn/fesguietna"]') && [...d.querySelectorAll("#majels a")].every(a => a.target === "_blank" && /noopener/.test(a.rel)));
  check("menu : Carte, Signaler, Le Coran et l'eau, À propos ; lien vers Prix des Eaux (carte de l'accueil + pied de page)", d.querySelectorAll(".menu a").length === 4
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
    if (d.querySelectorAll(".menu a").length !== 4) manque.push(p + " menu");
  }
  check(`toutes les pages : Partager dans l'en-tête, « Votre avis », menu ${manque.join(" | ")}`, !manque.length);
}
{
  const publics = PAGES.map(lire).join("\n") + lire("assets/page.js");
  check("aucune donnée Google copiée (seulement des liens de recherche / d'itinéraire)", !/maps\.googleapis\.com|AIza/.test(publics + lire("assets/points-eau.js")));
}
console.log(`\n${erreurs ? erreurs + " PROBLÈME(S)" : "TOUT PASSE"} (${total} vérifications)`);
process.exit(erreurs ? 1 : 0);
