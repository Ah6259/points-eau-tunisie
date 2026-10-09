/* Langue (8 langues : français, arabe, anglais + turc, indonésien, ourdou, allemand, espagnol), en-tête, menu et pied de page communs, partage, protections — repris de Ma voiture Tunisie */
const MAJ = "09/10/2026";   // date de création ; les points sont datés par le robot (donnees/points_eau.js)
// Menu de l'en-tête (toutes les pages)
const MENU_SITE = [
  ["", "Carte", "الخريطة", "Map"],
  ["#signaler", "Signaler un point d'eau", "أضف نقطة ماء", "Report a water point"],
  ["majels-et-puits/", "Majels et puits en Tunisie", "المواجل والآبار في تونس", "Majels and wells in Tunisia"],
  ["coran-et-eau/", "Le Coran et l'eau", "الماء في القرآن", "Quran & water"],
  ["a-propos/", "À propos", "من نحن", "About"]
];

// Huit langues (anglais le 09/10/2026, puis turc, indonésien, ourdou, allemand, espagnol : site pour le monde entier).
// fr / ar / en sont écrits dans les pages ; les 5 autres viennent de assets/langues.js (window.TRADUCTIONS, clé = texte français),
// et à défaut l'anglais. La mémoire « langue » est PARTAGÉE par tous les sites d'ah6259.github.io : on n'y lit / écrit que « fr » ou « ar » ;
// le choix complet est gardé sous la clé propre au site « langue-points-eau » (règle commune).
// Sans choix : la langue du téléphone si le site la parle, sinon anglais (visiteurs du monde entier).
(function () {
  const html = document.documentElement;
  const racine = html.dataset.racine || "";
  const LANGUES = [["fr", "FR", "Français"], ["ar", "ع", "العربية"], ["en", "EN", "English"], ["tr", "TR", "Türkçe"],
    ["id", "ID", "Bahasa Indonesia"], ["ur", "UR", "اردو"], ["de", "DE", "Deutsch"], ["es", "ES", "Español"]];
  const CODES = LANGUES.map(x => x[0]), NOUVELLES = ["tr", "id", "ur", "de", "es"], DROITE = ["ar", "ur"];
  const lireCle = k => { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } };
  const nav = (navigator.language || "").slice(0, 2).toLowerCase();
  let langue = [lireCle("langue-points-eau")].find(l => CODES.includes(l))
    || ["fr", "ar"].find(l => l === lireCle("langue")) || (CODES.includes(nav) ? nav : "en");
  const demande = new URLSearchParams(location.search).get("lang");
  if (CODES.includes(demande)) langue = demande;

  const cle = s => String(s).replace(/\s+/g, " ").trim();
  const trad = (l, fr) => { const t = ((window.TRADUCTIONS || {})[l] || {})[cle(fr)]; return t ? t : null; };
  window.T = (fr, ar, en) => {
    const l = html.lang;
    if (l === "ar") return ar;
    if (l === "en" || NOUVELLES.includes(l)) return (l !== "en" && trad(l, fr)) || (en === undefined ? fr : en);
    return fr;
  };

  // textes des pages dans une des 5 nouvelles langues : les éléments data-l="en" sont montrés (CSS) et reçoivent la traduction
  // du texte français voisin ; l'anglais d'origine est gardé dans data-en-origine pour revenir en arrière.
  function traduirePage(l) {
    const nouv = NOUVELLES.includes(l);
    document.querySelectorAll('[data-l="en"]').forEach(en => {
      if (en.dataset.enOrigine === undefined) { if (!nouv) return; en.dataset.enOrigine = en.innerHTML; }
      en.innerHTML = en.dataset.enOrigine;
      const fr = en.previousElementSibling && en.previousElementSibling.previousElementSibling;
      if (!nouv || !fr || fr.dataset.l !== "fr") return;
      if (en.tagName === "UL") [...fr.children].forEach((li, i) => { const t = trad(l, li.innerHTML); if (t && en.children[i]) en.children[i].innerHTML = t; });
      else { const t = trad(l, fr.innerHTML); if (t) en.innerHTML = t; }
    });
  }

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
          <div class="langues">${(([l, c, n]) => `<button type="button" class="langues-bouton" aria-haspopup="true" aria-expanded="false" aria-controls="langues-liste" aria-label="${T("Langue", "اللغة", "Language")} : ${n}" title="${T("Langue", "اللغة", "Language")}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/></svg><span lang="${l}">${c}</span><i aria-hidden="true">▾</i></button>`)(LANGUES.find(x => x[0] === html.lang) || LANGUES[0])}
            <ul class="langues-liste" id="langues-liste" hidden>${LANGUES.map(([l, c, n]) =>
            `<li><button type="button" data-lang="${l}" lang="${l}" dir="${DROITE.includes(l) ? "rtl" : "ltr"}" aria-pressed="${html.lang === l}">${n}</button></li>`).join("")}</ul></div>
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
    // menu défilant (téléphone) : la rubrique de la page reste visible
    const actuel = document.querySelector('.menu [aria-current="page"]');
    if (actuel && actuel.scrollIntoView) try { actuel.scrollIntoView({ block: "nearest", inline: "center" }); } catch (x) {}
    document.querySelectorAll(".langues [data-lang]").forEach(b =>
      b.addEventListener("click", () => { appliquer(b.dataset.lang); const o = document.querySelector(".langues-bouton"); if (o) o.focus(); }));
    document.querySelectorAll(".langues-bouton").forEach(b => b.addEventListener("click", () => liste(b.getAttribute("aria-expanded") !== "true")));
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

  // liste des langues : s'ouvre sous le bouton, se ferme par Échap, un clic dehors ou un choix
  function liste(ouvrir) {
    const b = document.querySelector(".langues-bouton"), u = document.getElementById("langues-liste");
    if (!b || !u) return;
    b.setAttribute("aria-expanded", String(ouvrir)); u.hidden = !ouvrir;
    if (ouvrir) { const c = u.querySelector('[aria-pressed="true"]') || u.querySelector("button"); if (c) c.focus(); }
  }
  document.addEventListener("keydown", e => {
    const u = document.getElementById("langues-liste");
    if (e.key === "Escape" && u && !u.hidden) { liste(false); const b = document.querySelector(".langues-bouton"); if (b) b.focus(); }
  });
  document.addEventListener("click", e => {
    const u = document.getElementById("langues-liste");
    if (u && !u.hidden && !(e.target.closest && e.target.closest(".langues"))) liste(false);
  });

  function appliquer(l) {
    html.lang = l; html.dir = DROITE.includes(l) ? "rtl" : "ltr";
    try { localStorage.setItem("langue-points-eau", l); if (l === "fr" || l === "ar") localStorage.setItem("langue", l); } catch (e) {}
    traduirePage(l);
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
const iso = s => ["ar", "ur"].includes(document.documentElement.lang) ? "⁦" + s + "⁩" : String(s);
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
  function M(o) { return o[langue()] || (window.T && window.T(o.fr, o.ar, o.en)) || o[S.defaut] || o.fr; }
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
    for (var i = 0; i < el.length; i++) { var t = el[i].getAttribute("data-v" + l) || (window.T && window.T(el[i].getAttribute("data-vfr"), el[i].getAttribute("data-var"), el[i].getAttribute("data-ven"))) || el[i].getAttribute("data-v" + S.defaut); if (t && el[i].textContent !== t) el[i].textContent = t; }
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
