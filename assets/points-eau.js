/* Page « Points d'eau » (idée d'Ahmed, 09/10/2026) : carte de la Tunisie des sources, fontaines, robinets publics,
   majels et puits — OpenStreetMap + points signalés par les visiteurs (donnees/points_eau.js, mis à jour toutes les 2 h).
   Signaler / confirmer / « n'existe plus » : envoyé au même Google Forms que les prix (format POINT, POINT-OK, POINT-KO),
   avec un jeton anonyme du navigateur ; tools/points_eau.py décide et publie. Carte : Leaflet + fond OpenStreetMap. */
(function () {
  const FORM = "https://docs.google.com/forms/d/e/1FAIpQLSd7sR4KmzqrCi-Yjw0WV9SmT_3sZfKJtPmkGnDjMRHl4Q78PA/formResponse";
  const CH = { marque: "entry.897098257", format: "entry.1939823394", lieu: "entry.506707149", date: "entry.1622032670" };
  const TYPES = {
    source: { fr: "Source naturelle", ar: "عين ماء", c: "#1797C4" },
    fontaine: { fr: "Fontaine d'eau potable", ar: "حنفية ماء صالح للشرب", c: "#128A52" },
    robinet: { fr: "Robinet / point d'eau public", ar: "حنفية عمومية", c: "#0E7FA8" },
    majel: { fr: "Majel public", ar: "ماجل عمومي", c: "#C27C14" },
    puits: { fr: "Puits", ar: "بئر", c: "#6B5B95" }
  };
  const L2 = (fr, ar) => (window.T ? window.T(fr, ar) : fr);
  const STATUT = { osm: ["OpenStreetMap", "OpenStreetMap"], confirme: ["Confirmé par les visiteurs", "أكّده الزوار"], signale: ["Signalé par un visiteur, à confirmer", "أضافه زائر، في انتظار التأكيد"] };
  const nomT = t => L2(TYPES[t].fr, TYPES[t].ar);
  const D = window.EAUX_POINTS || { points: [] };
  const $ = id => document.getElementById(id);
  const lire = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const ecrire = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  let jeton = lire("point-jeton");
  if (!/^pt:[a-z0-9]{6,40}$/.test(jeton || "")) { jeton = "pt:" + Math.random().toString(36).slice(2) + Date.now().toString(36); ecrire("point-jeton", jeton); }
  const esc = s => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const actifs = new Set(Object.keys(TYPES));
  let carte = null, calque = null, ici = null, nouveau = null;

  function distance(a, b) {
    const R = 6371, r = x => x * Math.PI / 180, dLa = r(b.lat - a.lat), dLo = r(b.lon - a.lon);
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const km = d => d < 1 ? Math.round(d * 1000) + " m" : d.toFixed(d < 10 ? 1 : 0).replace(".", ",") + " km";
  const itineraire = p => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`;

  function envoyer(format, marque, lieu) {
    const corps = new URLSearchParams();
    corps.append(CH.format, format); corps.append(CH.marque, marque); corps.append(CH.lieu, lieu);
    corps.append(CH.date, new Date().toISOString().slice(0, 10));
    if (window.__envois) { window.__envois.push(Object.fromEntries(corps)); return Promise.resolve(); }   // tests
    return fetch(FORM, { method: "POST", mode: "no-cors", body: corps });
  }

  function bulle(p) {
    const t = TYPES[p.type];
    return `<div class="pe-bulle"><b>${esc(p.nom) || nomT(p.type)}</b><br><span>${nomT(p.type)}</span><br>
      <small>${STATUT[p.statut] ? L2(...STATUT[p.statut]) : ""}${p.ok ? ` · ${p.ok} ${L2("confirmation(s)", "تأكيد")}` : ""}</small><br>
      <a href="${itineraire(p)}" target="_blank" rel="noopener">${L2("Itinéraire (Google Maps)", "الطريق (خرائط Google)")}</a>
      <div class="pe-voix"><button type="button" data-ok="${esc(p.id)}">✓ ${L2("C'est vrai", "صحيح")}</button><button type="button" data-ko="${esc(p.id)}">✗ ${L2("N'existe plus", "لم يعد موجودًا")}</button></div></div>`;
  }

  function dessiner() {
    if (!carte) return;
    calque.clearLayers();
    D.points.filter(p => actifs.has(p.type)).forEach(p => {
      L.circleMarker([p.lat, p.lon], { radius: p.src === "visiteur" ? 8 : 6, color: "#fff", weight: 2, fillColor: TYPES[p.type].c,
        fillOpacity: p.statut === "signale" ? .6 : .95 }).bindPopup(bulle(p)).addTo(calque);
    });
  }

  function proches() {
    const box = $("pe-proches");
    if (!ici) { box.innerHTML = ""; return; }
    const l = D.points.filter(p => actifs.has(p.type)).map(p => ({ p, d: distance(ici, p) })).sort((a, b) => a.d - b.d).slice(0, 5);
    box.innerHTML = l.length ? `<h3>${L2("Les plus proches de vous", "الأقرب إليك")}</h3><ol>` + l.map(({ p, d }) =>
      `<li><b>${km(d)}</b> · ${esc(p.nom) || nomT(p.type)} <small>(${nomT(p.type)})</small> · <a href="${itineraire(p)}" target="_blank" rel="noopener">${L2("y aller", "اذهب")}</a></li>`).join("") + "</ol>" : "";
  }

  function filtres() {
    const n = t => D.points.filter(p => p.type === t).length;
    $("pe-filtres").innerHTML = Object.entries(TYPES).filter(([k]) => n(k) > 0).map(([k, t]) =>   // jamais un filtre à 0 (règle commune)
      `<button type="button" class="chipbtn" data-type="${k}" aria-pressed="${actifs.has(k)}"><i style="background:${t.c}"></i>${nomT(k)} <b>${n(k)}</b></button>`).join("");
    $("pe-total").textContent = D.points.length;
  }

  function demarrerCarte() {
    if (carte || !window.L) return;
    carte = L.map("pe-carte", { scrollWheelZoom: false }).setView([34.2, 9.6], 6);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</a>' }).addTo(carte);
    calque = L.layerGroup().addTo(carte);
    carte.on("click", e => placer(e.latlng.lat, e.latlng.lng));
    dessiner();
  }
  function chargerLeaflet() {
    if (window.L) return demarrerCarte();
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);
    const js = document.createElement("script"); js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    js.onload = demarrerCarte; document.head.appendChild(js);
  }

  // position du point à signaler : clic sur la carte ou « ma position »
  function placer(lat, lon) {
    $("pe-pos").value = lat.toFixed(5) + "," + lon.toFixed(5);
    $("pe-pos-txt").textContent = L2("Position choisie : ", "الموقع المختار: ") + lat.toFixed(5) + ", " + lon.toFixed(5);
    if (carte) { if (nouveau) nouveau.setLatLng([lat, lon]); else nouveau = L.marker([lat, lon]).addTo(carte); }
  }
  function maPosition(fin) {
    if (!navigator.geolocation) { fin && fin(null); return; }
    navigator.geolocation.getCurrentPosition(g => fin({ lat: g.coords.latitude, lon: g.coords.longitude }), () => fin(null), { enableHighAccuracy: true, timeout: 15000 });
  }

  document.addEventListener("click", e => {
    const f = e.target.closest("#pe-filtres [data-type]");
    if (f) { const t = f.dataset.type; actifs.has(t) ? actifs.delete(t) : actifs.add(t); filtres(); dessiner(); proches(); return; }
    const v = e.target.closest("[data-ok],[data-ko]");
    if (v) {
      const ok = v.hasAttribute("data-ok"), id = ok ? v.dataset.ok : v.dataset.ko;
      envoyer(ok ? "POINT-OK" : "POINT-KO", id, "|" + jeton).then(() => { v.parentNode.innerHTML = `<small>${L2("Merci ! Pris en compte dans 2 heures environ.", "شكرًا! يُحتسب خلال ساعتين تقريبًا.")}</small>`; }, () => {});
    }
  });
  $("pe-autour").addEventListener("click", () => {
    $("pe-autour-txt").textContent = L2("Recherche de votre position…", "جارٍ تحديد موقعك…");
    maPosition(p => {
      if (!p) { $("pe-autour-txt").textContent = L2("Position indisponible : autorisez la localisation, ou cherchez sur la carte.", "الموقع غير متاح: اسمح بتحديد الموقع، أو ابحث في الخريطة."); return; }
      ici = p; $("pe-autour-txt").textContent = "";
      if (carte) carte.setView([p.lat, p.lon], 11);
      proches();
      $("pe-google").href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("source d'eau")}%20${p.lat},${p.lon}`;
    });
  });
  $("pe-ma-pos").addEventListener("click", () => maPosition(p => p ? (placer(p.lat, p.lon), carte && carte.setView([p.lat, p.lon], 16))
    : ($("pe-pos-txt").textContent = L2("Position indisponible : touchez plutôt l'endroit sur la carte.", "الموقع غير متاح: المس المكان على الخريطة."))));
  $("pe-form").addEventListener("submit", e => {
    e.preventDefault();
    const st = $("pe-statut"), type = $("pe-type").value, pos = $("pe-pos").value, nom = $("pe-nom").value.replace(/\|/g, " ").trim().slice(0, 60);
    if (!TYPES[type]) { st.textContent = L2("Choisissez le type de point d'eau.", "اختر نوع نقطة الماء."); return; }
    if (!/^-?\d+\.\d+,-?\d+\.\d+$/.test(pos)) { st.textContent = L2("Indiquez la position : touchez l'endroit sur la carte ou « Utiliser ma position ».", "حدّد الموقع: المس المكان على الخريطة أو « استعمل موقعي »."); return; }
    if ($("pe-form").querySelector("[name=_gotcha]").value) return;
    envoyer("POINT", type + "|" + nom, pos + "|" + jeton).then(() => {
      st.textContent = L2("Merci ! Le point apparaîtra sur la carte dans 2 heures environ (« à confirmer » jusqu'à ce qu'un autre visiteur le confirme).", "شكرًا! ستظهر النقطة على الخريطة خلال ساعتين تقريبًا (« في انتظار التأكيد » حتى يؤكّدها زائر آخر).");
      $("pe-form").reset(); $("pe-pos").value = ""; $("pe-pos-txt").textContent = "";
    }, () => { st.textContent = L2("Échec de l'envoi — vérifiez votre connexion et réessayez.", "تعذّر الإرسال — تحقّق من الاتصال وأعد المحاولة."); });
  });

  filtres();
  document.addEventListener("langue", () => { filtres(); proches(); dessiner(); });
  if ("IntersectionObserver" in window) {
    const o = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { o.disconnect(); chargerLeaflet(); } });
    o.observe($("pe-carte"));
  } else chargerLeaflet();
})();
