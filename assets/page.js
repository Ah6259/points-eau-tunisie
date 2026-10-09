/* Langue (français / arabe / anglais), en-tête, menu et pied de page communs, partage, protections — repris de Ma voiture Tunisie */
const MAJ = "09/10/2026";   // date de création ; les points sont datés par le robot (donnees/points_eau.js)
// Menu de l'en-tête (toutes les pages)
const MENU_SITE = [
  ["", "Carte", "الخريطة", "Map"],
  ["#signaler", "Signaler un point d'eau", "أضف نقطة ماء", "Report a water point"],
  ["majels-et-puits/", "Majels et puits", "المواجل والآبار", "Majels & wells"],
  ["coran-et-eau/", "Le Coran et l'eau", "الماء في القرآن", "Quran & water"],
  ["a-propos/", "À propos", "من نحن", "About"]
];

// Trois langues (anglais ajouté le 09/10/2026 : site pour le monde entier).
// La mémoire « langue » est PARTAGÉE par tous les sites d'ah6259.github.io : on n'y lit / écrit que « fr » ou « ar » ;
// le choix complet (fr / ar / en) est gardé sous la clé propre au site « langue-points-eau » (règle commune).
// Sans choix : arabe ou français selon le téléphone, sinon anglais (visiteurs du monde entier).
(function () {
  const html = document.documentElement;
  const racine = html.dataset.racine || "";
  const LANGUES = ["fr", "ar", "en"];
  const lireCle = k => { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } };
  const nav = (navigator.language || "").slice(0, 2);
  let langue = [lireCle("langue-points-eau")].find(l => LANGUES.includes(l))
    || ["fr", "ar"].find(l => l === lireCle("langue")) || (nav === "ar" || nav === "fr" ? nav : "en");
  const demande = new URLSearchParams(location.search).get("lang");
  if (LANGUES.includes(demande)) langue = demande;

  window.T = (fr, ar, en) => html.lang === "ar" ? ar : html.lang === "en" ? (en === undefined ? fr : en) : fr;

  function cadre() {
    const ici = location.pathname.replace(/index\.html$/, "");
    const e = document.getElementById("entete");
    if (e) e.innerHTML = `
      <div class="wrap">
        <a class="logo" href="${racine || "./"}">
          <img class="logo-mark" src="${racine}assets/logo.svg" alt="" width="34" height="34">
          <span class="logo-nom">${T("Points d'eau Tunisie", "نقاط الماء في تونس", "Water Points Tunisia")}
            <small>${T("Gratuit · sources, fontaines, majels", "مجاني · عيون، حنفيات، مواجل", "Free · springs, fountains, cisterns")}</small></span>
        </a>
        <div class="entete-boutons">
          <button class="partager" type="button" aria-label="${T("Partager cette page", "شارك هذه الصفحة", "Share this page")}" title="${T("Partager", "شارك", "Share")}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg></button>
          <div class="langues" role="group" aria-label="${T("Langue", "اللغة", "Language")}">${[["fr", "FR", "Français"], ["ar", "ع", "العربية"], ["en", "EN", "English"]].map(([l, c, n]) =>
            `<button type="button" data-lang="${l}" lang="${l}" title="${n}" aria-label="${n}" aria-pressed="${html.lang === l}">${c}</button>`).join("")}</div>
        </div>
      </div>
      <nav class="menu" aria-label="${T("Rubriques", "الأبواب", "Sections")}"><div class="wrap">${MENU_SITE.map(([h, fr, ar, en]) =>
        `<a href="${racine}${h || "./"}"${(h && !h.startsWith("#") ? ici.endsWith("/" + h) : (!h && !racine)) ? ' aria-current="page"' : ""}>${T(fr, ar, en)}</a>`).join("")}</div></nav>`;
    const p = document.getElementById("pied");
    if (p) p.innerHTML = `
      <div class="wrap">
        <div class="pied-logo"><img src="${racine}assets/logo.svg" alt="" width="24" height="24"> ${T("Points d'eau Tunisie", "نقاط الماء في تونس", "Water Points Tunisia")}</div>
        <nav>
          <a href="${racine || "./"}">${T("Carte des points d'eau", "خريطة نقاط الماء", "Water points map")}</a>
          <a href="${racine}#signaler">${T("Signaler un point d'eau", "أضف نقطة ماء", "Report a water point")}</a>
          <a href="${racine}majels-et-puits/">${T("Majels et puits en Tunisie", "المواجل والآبار في تونس", "Majels and wells in Tunisia")}</a>
          <a href="${racine}coran-et-eau/">${T("Le Coran et la Sunna sur l'eau", "الماء في القرآن والسنة", "Water in the Quran and Sunnah")}</a>
          <a href="${racine}a-propos/">${T("À propos et méthode", "من نحن والمنهجية", "About and method")}</a>
          <a href="${racine}#avis">${T("Votre avis", "رأيك", "Your feedback")}</a>
          <a href="https://ah6259.github.io/prix-eaux-tunisie/" target="_blank" rel="noopener" data-compteur="lien-site/prix-eaux">${T("Prix de l'eau en bouteille", "أسعار الماء المعدني", "Bottled water prices (Tunisia)")}</a>
        </nav>
        <p>${T("Eau non contrôlée : les sources, puits et majels ne sont pas analysés. Ce site n'est pas un service officiel.",
               "ماء غير مراقب: العيون والآبار والمواجل غير محلَّلة. هذا الموقع ليس خدمة رسمية.",
               "Untested water: springs, wells and majels are not analysed. This website is not an official service.")}</p>
        <p>${T("Points : © contributeurs OpenStreetMap (ODbL), association AJEM (majels de Djerba) et visiteurs du site. Photo : Wikimedia Commons —",
               "النقاط: © مساهمو OpenStreetMap ‏(ODbL)، جمعية AJEM (مواجل جربة) وزوار الموقع. الصورة: ويكيميديا كومنز —",
               "Points: © OpenStreetMap contributors (ODbL), the AJEM association (Djerba majels) and site visitors. Photo: Wikimedia Commons —")} <a href="${racine}a-propos/#photos">${T("crédits", "الحقوق", "credits")}</a>.</p>
        <p>© 2026 Points d'eau Tunisie — ${T("tous droits réservés.", "جميع الحقوق محفوظة.", "all rights reserved.")}</p>
      </div>`;
    document.querySelectorAll(".langues [data-lang]").forEach(b =>
      b.addEventListener("click", () => appliquer(b.dataset.lang)));
    // bouton Partager (règle commune) : menu de partage du téléphone, sinon WhatsApp, avec la page vidéo + l'adresse du site
    document.querySelectorAll(".partager").forEach(b => b.addEventListener("click", () => {
      try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: "partage" + location.pathname.replace("/points-eau-tunisie/", "/"), title: "Partage", event: true }); } catch (e) {}
      return window.partagerLien();
    }));
    document.querySelectorAll("[data-maj]").forEach(x => x.textContent = MAJ);
    document.querySelectorAll("img[data-alt-ar]").forEach(i => {
      if (!i.dataset.altFr) i.dataset.altFr = i.alt;
      i.alt = T(i.dataset.altFr, i.dataset.altAr, i.dataset.altEn);
    });
    document.querySelectorAll("[data-ph-fr]").forEach(i => { i.placeholder = T(i.dataset.phFr, i.dataset.phAr, i.dataset.phEn); });
    document.querySelectorAll("option[data-fr]").forEach(o => { o.textContent = T(o.dataset.fr, o.dataset.ar, o.dataset.en); });
  }

  function appliquer(l) {
    html.lang = l; html.dir = l === "ar" ? "rtl" : "ltr";
    try { localStorage.setItem("langue-points-eau", l); if (l !== "en") localStorage.setItem("langue", l); } catch (e) {}
    cadre();
    document.dispatchEvent(new Event("langue"));
  }
  document.addEventListener("DOMContentLoaded", () => appliquer(langue));
})();

/* Boutons de choix (un seul actif) : <div class="choix" data-nom="x"><button data-v="..."> */
function choixValeur(nom) {
  const b = document.querySelector(`.choix[data-nom="${nom}"] button.on`);
  return b ? b.dataset.v : null;
}
document.addEventListener("click", e => {
  const b = e.target.closest(".choix button");
  if (!b) return;
  b.parentNode.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
  document.dispatchEvent(new Event("recalcul"));
});

/* Nombres : « 1 234,500 DT », isolés dans un texte arabe (U+2066…U+2069) */
const iso = s => document.documentElement.lang === "ar" ? "⁦" + s + "⁩" : String(s);
function nombre(v, dec) {
  const n = Number(v) || 0, d = dec === undefined ? 3 : dec;
  const [e, f] = Math.abs(n).toFixed(d).split(".");
  return (n < 0 ? "−" : "") + e.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + (f ? "," + f : "");
}
const dt = v => iso(nombre(v) + " DT");
// date lisible « 05/04/2027 » (et jour de la semaine en toutes lettres si demandé)
function dateLisible(d, jour) {
  if (!(d instanceof Date) || isNaN(d)) return "";
  const s = String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
  if (!jour) return iso(s);
  const J = T(["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][d.getDay()],
              ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"][d.getDay()]);
  return J + " " + iso(s);
}

function lienWhatsApp(texte) {
  return "https://wa.me/?text=" + encodeURIComponent(texte + " " + location.href.split("?")[0]);
}
const ICONE_WHATSAPP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.1.1.6-.1 1.2z"/></svg>';

/* ---- Protection légère contre la copie (consigne commune) ----
   Photos : pas de clic droit ni de glisser. Textes de valeur : la source est ajoutée au texte copié.
   Restent copiables : résultats calculés, champs de formulaire et liens. */
const ZONE_COPIABLE = ".resultat, input, select, textarea, a";
const ZONE_PROTEGEE = ".hero, main .carte";
document.addEventListener("contextmenu", e => { if (e.target.closest("img, .illus")) e.preventDefault(); });
document.addEventListener("dragstart", e => { if (e.target.closest("img")) e.preventDefault(); });
document.addEventListener("copy", e => {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !e.clipboardData) return;
  const n = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
  if (!n || n.closest(ZONE_COPIABLE) || !n.closest(ZONE_PROTEGEE)) return;
  e.clipboardData.setData("text/plain", sel.toString() + "\n\nSource : " + location.href.split("?")[0] + " — © " + T("tous droits réservés", "جميع الحقوق محفوظة", "all rights reserved"));
  e.preventDefault();
});
/* Pas d'affichage dans le cadre (iframe) d'un autre site */
(function () {
  if (window.top === window.self || location.protocol === "file:") return;
  let memeSite = false;
  try { memeSite = window.top.location.hostname === location.hostname; } catch (e) { memeSite = false; }
  if (!memeSite) { try { window.top.location.href = location.href; } catch (e) { document.documentElement.style.display = "none"; } }
})();

/* Installation sur le téléphone : service worker PRUDENT (sw.js : réseau d'abord pour les pages et les données). */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => {
    try { navigator.serviceWorker.register("/points-eau-tunisie/sw.js", { scope: "/points-eau-tunisie/" }).catch(() => {}); } catch (e) { /* rien : le site marche sans */ }
  });
}

/* Clics vers nos autres sites, comptés anonymement dans GoatCounter (« lien-site/<nom> ») */
document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest("a[data-compteur]");
  if (!a) return;
  try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: a.dataset.compteur, title: "Lien vers un autre site : " + a.dataset.compteur, event: true }); } catch (x) { /* rien : le lien marche sans */ }
});

/* >>> vidéo de présentation : page video/ partagée par le bouton « Partager » (outil vidéos d'Ahmed) */
window.VIDEO_SITE = {"base": "/points-eau-tunisie/", "defaut": "fr", "nom": {"fr": "Points d'eau Tunisie", "ar": "نقاط الماء في تونس", "en": "Water Points Tunisia"}};
/* Bouton « Partager » : partage un LIEN vers la page vidéo du site (vidéo de présentation + gros bouton « Ouvrir le site »)
   + l'adresse du site dans le texte. Menu de partage du téléphone, sinon WhatsApp. Réglages : window.VIDEO_SITE. */
(function () {
  var S = window.VIDEO_SITE, ORIGINE = "https://ah6259.github.io";
  function langue() { return document.documentElement.lang || S.defaut; }
  function M(o) { return o[langue()] || o[S.defaut] || o.fr; }
  window.pageVideo = function () {
    var l = langue(), q = l !== S.defaut ? "?lang=" + l : "";
    return { page: ORIGINE + S.base + "video/" + q, site: ORIGINE + S.base + q, titre: M(S.nom) };
  };
  window.partagerLien = function (titre, site) {
    var v = window.pageVideo(), t = titre || v.titre;
    if (site) v.site = site;
    var texte = t + "\n" + M({ fr: "Le site : ", ar: "الموقع: ", en: "Website: " }) + v.site + "\n" + M({ fr: "Regardez la vidéo :", ar: "شاهد الفيديو:", en: "Watch the video:" });
    function whatsapp() { window.open("https://wa.me/?text=" + encodeURIComponent(texte + " " + v.page), "_blank", "noopener"); return "whatsapp"; }
    if (navigator.share) {
      return navigator.share({ title: t, text: texte, url: v.page }).then(function () { return "lien"; }, function (e) {
        return e && e.name === "AbortError" ? "annule" : whatsapp();
      });
    }
    return Promise.resolve(whatsapp());
  };
  function traduire() {
    var l = langue();
    var el = document.querySelectorAll("[data-vfr]");
    for (var i = 0; i < el.length; i++) { var t = el[i].getAttribute("data-v" + l) || el[i].getAttribute("data-v" + S.defaut); if (t && el[i].textContent !== t) el[i].textContent = t; }
    var v = document.querySelector(".video-lecteur");
    if (v) {
      var s = v.getAttribute("data-src-" + l) || v.getAttribute("data-src-defaut") || v.getAttribute("src");
      if (!v.getAttribute("data-src-defaut")) v.setAttribute("data-src-defaut", v.getAttribute("src"));
      if (v.getAttribute("src") !== s) v.setAttribute("src", s);
      if (!v.getAttribute("data-poster-defaut")) v.setAttribute("data-poster-defaut", v.getAttribute("poster"));
      var po = v.getAttribute("data-poster-" + l) || v.getAttribute("data-poster-defaut");
      if (v.getAttribute("poster") !== po) v.setAttribute("poster", po);
    }
    var p = location.pathname.replace(/index\.html$/, "");
    if (p === S.base || p === S.base + "a-propos/") {
      var b = document.getElementById("lien-video");
      if (!b) {
        b = document.createElement("p"); b.id = "lien-video"; b.className = "lien-video"; b.appendChild(document.createElement("a"));
        var m = document.querySelector("main"); if (m) m.insertAdjacentElement("afterend", b); else document.body.appendChild(b);
      }
      b.firstChild.href = S.base + "video/" + (l !== S.defaut ? "?lang=" + l : "");
      b.firstChild.textContent = M({ fr: "Vidéo de présentation", ar: "الفيديو التقديمي", en: "Presentation video" });
    }
  }
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest("[data-partager-video]");
    if (!b) return;
    e.preventDefault();
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: "partage" + location.pathname.replace(S.base, "/"), title: "Partage", event: true }); } catch (x) {}
    window.partagerLien();
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(traduire, 0); }); else setTimeout(traduire, 0);
  document.addEventListener("langue", function () { setTimeout(traduire, 0); });
  try { new MutationObserver(function () { setTimeout(traduire, 0); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] }); } catch (x) {}
})();
/* <<< vidéo de présentation */
