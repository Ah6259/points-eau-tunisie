/* Page « Points d'eau » (idée d'Ahmed, 09/10/2026) : carte des sources, fontaines, robinets publics (Tunisie, puis le monde entier),
   majels et puits — OpenStreetMap + points signalés par les visiteurs (donnees/points_eau.js, mis à jour toutes les 2 h).
   Signaler / confirmer / « n'existe plus » : envoyé au même Google Forms que les prix (format POINT, POINT-OK, POINT-KO),
   avec un jeton anonyme du navigateur ; tools/points_eau.py décide et publie. Carte : Leaflet + fond OpenStreetMap. */
(function () {
  const FORM = "https://docs.google.com/forms/d/e/1FAIpQLSd7sR4KmzqrCi-Yjw0WV9SmT_3sZfKJtPmkGnDjMRHl4Q78PA/formResponse";
  const CH = { marque: "entry.897098257", format: "entry.1939823394", lieu: "entry.506707149", date: "entry.1622032670" };
  const TYPES = {
    source: { fr: "Source naturelle", ar: "عين ماء", en: "Natural spring", c: "#1797C4" },
    fontaine: { fr: "Fontaine d'eau potable", ar: "حنفية ماء صالح للشرب", en: "Drinking fountain", c: "#128A52" },
    robinet: { fr: "Robinet / point d'eau public", ar: "حنفية عمومية", en: "Public tap / water point", c: "#0E7FA8" },
    majel: { fr: "Majel public", ar: "ماجل عمومي", en: "Public majel (cistern)", c: "#C27C14" },
    puits: { fr: "Puits", ar: "بئر", en: "Well", c: "#6B5B95" }
  };
  const L2 = (fr, ar, en) => (window.T ? window.T(fr, ar, en) : fr);
  const STATUT = { osm: ["OpenStreetMap", "OpenStreetMap", "OpenStreetMap"], wpdx: ["Relevé de terrain : Water Point Data Exchange (WPdx, CC BY 4.0)", "مسح ميداني: Water Point Data Exchange ‏(WPdx، CC BY 4.0)", "Field survey: Water Point Data Exchange (WPdx, CC BY 4.0)"], ajem: ["Recensé par l'association AJEM (Fesguietna)", "أحصته جمعية AJEM (فسقيتنا)", "Surveyed by the AJEM association (Fesguietna)"],
    confirme: ["Confirmé par les visiteurs", "أكّده الزوار", "Confirmed by visitors"], signale: ["Signalé par un visiteur, à confirmer", "أضافه زائر، في انتظار التأكيد", "Reported by a visitor, to be confirmed"] };
  const nomT = t => L2(TYPES[t].fr, TYPES[t].ar, TYPES[t].en);
  const D = window.EAUX_POINTS || { points: [] };
  const $ = id => document.getElementById(id);
  const lire = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const ecrire = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  let jeton = lire("point-jeton");
  if (!/^pt:[a-z0-9]{6,40}$/.test(jeton || "")) { jeton = "pt:" + Math.random().toString(36).slice(2) + Date.now().toString(36); ecrire("point-jeton", jeton); }
  const esc = s => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const actifs = new Set(Object.keys(TYPES));
  let carte = null, calque = null, ici = null;
  const marqueurs = {};

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

  const ETAT = { bon: ["Bon état", "حالة جيدة", "Good condition"], moyen: ["État moyen", "حالة متوسطة", "Fair condition"], mauvais: ["Mauvais état", "حالة سيئة", "Poor condition"],
    "tres-mauvais": ["Très mauvais état", "حالة سيئة جدًا", "Very poor condition"] };
  const ficheAjem = p => /^https:\/\/www\.ajem\.tn\/fesguietna\/citerne\/[\w-]+$/.test(p.lien || "")
    ? `<br><a href="${esc(p.lien)}" target="_blank" rel="noopener">${L2("Fiche et photos sur le site AJEM", "البطاقة والصور على موقع AJEM", "Record and photos on the AJEM website")}</a>` : "";

  function bulle(p) {
    return `<div class="pe-bulle"><b>${esc(p.nom) || nomT(p.type)}</b><br><span>${nomT(p.type)}</span><br>
      <small>${STATUT[p.statut] ? L2(...STATUT[p.statut]) : ""}${ETAT[p.etat] ? ` · ${L2(...ETAT[p.etat])}` : ""}${p.ok ? ` · ${p.ok} ${L2("confirmation(s)", "تأكيد", "confirmation(s)")}` : ""}</small>${ficheAjem(p)}<br>
      <a href="${itineraire(p)}" target="_blank" rel="noopener">${L2("Itinéraire (Google Maps)", "الطريق (خرائط Google)", "Directions (Google Maps)")}</a>
      <div class="pe-voix"><button type="button" data-ok="${esc(p.id)}">✓ ${L2("C'est vrai", "صحيح", "It's true")}</button><button type="button" data-ko="${esc(p.id)}">✗ ${L2("N'existe plus", "لم يعد موجودًا", "No longer exists")}</button></div></div>`;
  }

  window.EAUX_BULLE = bulle;                // pour les tests

  function dessiner() {
    if (!carte) return;
    calque.clearLayers();
    D.points.filter(p => actifs.has(p.type)).forEach(p => {
      marqueurs[p.id] = L.circleMarker([p.lat, p.lon], { radius: p.src === "visiteur" ? 8 : 6, color: "#fff", weight: 2, fillColor: TYPES[p.type].c,
        fillOpacity: p.statut === "signale" ? .6 : .95 }).bindPopup(bulle(p)).addTo(calque);
    });
  }

  function proches() {
    const box = $("pe-proches");
    if (!ici) { box.innerHTML = ""; return; }
    const l = D.points.filter(p => actifs.has(p.type)).map(p => ({ p, d: distance(ici, p) })).sort((a, b) => a.d - b.d).slice(0, 5);
    box.innerHTML = l.length ? `<h3>${L2("Les plus proches de vous", "الأقرب إليك", "Nearest to you")}</h3><ol>` + l.map(({ p, d }) =>
      `<li><b>${km(d)}</b> · ${esc(p.nom) || nomT(p.type)} <small>(${nomT(p.type)})</small> · <a href="${itineraire(p)}" target="_blank" rel="noopener">${L2("y aller", "اذهب", "go")}</a></li>`).join("") + "</ol>" : "";
  }

  function filtres() {
    const n = t => D.points.filter(p => p.type === t).length;
    $("pe-filtres").innerHTML = Object.entries(TYPES).filter(([k]) => n(k) > 0).map(([k, t]) =>   // jamais un filtre à 0 (règle commune)
      `<button type="button" class="chipbtn" data-type="${k}" aria-pressed="${actifs.has(k)}"><i style="background:${t.c}"></i>${nomT(k)} <b>${n(k)}</b></button>`).join("");
    $("pe-total").textContent = D.points.filter(p => !p.monde).length;
  }


  // ---- Le monde entier (demande d'Ahmed du 09/10/2026 : « toute personne dans le monde doit trouver un point d'eau à côté d'elle »).
  // La Tunisie est déjà chargée (robot trimestriel + AJEM + visiteurs). Ailleurs, les points d'eau d'OpenStreetMap de la zone
  // affichée sont lus EN DIRECT (zoom ≥ 11), auprès des 5 copies d'OpenStreetMap (règle commune), avec les mêmes règles que le robot.
  // les 2 premiers serveurs sont interrogés EN MÊME TEMPS (le plus rapide gagne), puis les autres un par un ; 25 s au plus chacun
  const OVERPASS = ["https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter"];
  const ETIQUETTES = [["natural", "spring", "source"], ["amenity", "drinking_water", "fontaine"], ["man_made", "water_tap", "robinet"],
    ["amenity", "water_point", "robinet"], ["man_made", "cistern", "majel"], ["man_made", "water_well", "puits"]];
  const TUNISIE = { s: 30.2, n: 37.6, o: 7.5, e: 11.7 };
  const ZOOM_MONDE = 9, zonesLues = [];          // 9 = une région (11 = une ville était trop strict : 09/10/2026)
  function versPoint(el) {
    const tags = el.tags || {}, et = ETIQUETTES.find(([k, v]) => tags[k] === v);
    const lat = el.lat !== undefined ? el.lat : (el.center || {}).lat, lon = el.lon !== undefined ? el.lon : (el.center || {}).lon;
    if (!et || lat === undefined || lon === undefined) return null;
    if (["private", "no"].includes(tags.access) || tags.disused === "yes" || (et[2] === "fontaine" && tags.drinking_water === "no")) return null;
    const lg = document.documentElement.lang;
    const nom = (tags["name:" + lg] || tags.name || tags["name:fr"] || tags["name:en"] || tags["name:ar"] || "").slice(0, 60);
    return { id: "osm-" + el.type[0] + el.id, type: et[2], lat: +lat.toFixed(6), lon: +lon.toFixed(6), nom,
      potable: { yes: true, no: false }[tags.drinking_water] ?? null, src: "osm", statut: "osm", ok: 0, ko: 0, monde: true };
  }
  function ajouterZone(elements) {
    const connus = new Set(D.points.map(p => p.id));
    let n = 0;
    elements.forEach(el => { const p = versPoint(el); if (p && !connus.has(p.id)) { D.points.push(p); connus.add(p.id); n++; } });
    return n;
  }
  async function essai(url, q) {
    const arret = window.AbortController ? new AbortController() : null, minuterie = arret && setTimeout(() => arret.abort(), 25000);
    try {
      const r = await fetch(url, { method: "POST", body: new URLSearchParams({ data: q }), signal: arret && arret.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      if (/error|timed out/i.test(String(d.remark || ""))) throw new Error(d.remark);   // erreur cachée : serveur suivant
      return d.elements || [];
    } finally { clearTimeout(minuterie); }
  }
  async function lireZone(s, o, n, e) {
    const bb = [s, o, n, e].map(x => x.toFixed(4)).join(",");
    const q = `[out:json][timeout:25];(${ETIQUETTES.map(([k, v]) => `nwr["${k}"="${v}"](${bb});`).join("")});out center tags 1500;`;
    try { return await Promise.any(OVERPASS.slice(0, 2).map(u => essai(u, q))); } catch (x) { /* les deux ont échoué */ }
    for (const url of OVERPASS.slice(2)) { try { return await essai(url, q); } catch (x) { /* serveur suivant */ } }
    throw new Error("OpenStreetMap injoignable");
  }

  // ---- Water Point Data Exchange (WPdx-Basic, CC BY 4.0, décision d'Ahmed du 09/10/2026) : plus de 800 000 points d'eau relevés
  // sur le terrain dans 84 pays (Afrique, Asie, Amérique latine ; aucun en Tunisie), lus EN DIRECT pour la zone affichée.
  // Les points « en panne » (status_id = No) ne sont pas montrés ; eaux de surface, eau livrée ou en bouteille non plus.
  const WPDX = "https://data.waterpointdata.org/resource/jfkt-jmqa.json";
  const TYPE_WPDX = { "Borehole/Tubewell": "puits", "Protected Well": "puits", "Undefined Well": "puits", "Unprotected Well": "puits",
    "Piped Water": "robinet", "Rainwater Harvesting": "majel", "Protected Spring": "source", "Undefined Spring": "source" };
  function versPointWpdx(r) {
    const t = TYPE_WPDX[r.water_source_clean], lat = parseFloat(r.lat_deg), lon = parseFloat(r.lon_deg);
    if (!t || !isFinite(lat) || !isFinite(lon) || r.status_id === "No" || !/^\d+$/.test(String(r.row_id || ""))) return null;
    return { id: "wpdx-" + r.row_id, type: t, lat: +lat.toFixed(6), lon: +lon.toFixed(6), nom: "", potable: null,
      src: "wpdx", statut: "wpdx", ok: 0, ko: 0, monde: true };
  }
  async function lireWpdx(s, o, n, e) {
    const arret = window.AbortController ? new AbortController() : null, minuterie = arret && setTimeout(() => arret.abort(), 25000);
    const q = new URLSearchParams({ $select: "row_id,lat_deg,lon_deg,water_source_clean,status_id", $limit: "2000",
      $where: `within_box(geocoded_column, ${n.toFixed(4)}, ${o.toFixed(4)}, ${s.toFixed(4)}, ${e.toFixed(4)}) AND status_id != 'No'` });
    try {
      const r = await fetch(WPDX + "?" + q, { signal: arret && arret.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      if (!Array.isArray(d)) throw new Error("réponse inattendue");
      return d;
    } finally { clearTimeout(minuterie); }
  }
  function ajouterWpdx(lignes) {
    const connus = new Set(D.points.map(p => p.id));
    let n = 0;
    lignes.forEach(r => { const p = versPointWpdx(r); if (p && !connus.has(p.id)) { D.points.push(p); connus.add(p.id); n++; } });
    return n;
  }
  let bulleZone = null;                            // le même message, posé SUR la carte (bien visible, 09/10/2026)
  const zoneTxt = (t, err) => {
    const z = $("pe-zone"); if (z) { z.textContent = t; z.className = "aide pe-zone" + (err ? " err" : ""); }
    if (bulleZone) { bulleZone.textContent = t; bulleZone.hidden = !t; bulleZone.classList.toggle("err", !!err); }
  };
  async function chargerMonde() {
    if (!carte) return;
    const b = carte.getBounds(), dedans = b.getSouth() >= TUNISIE.s && b.getNorth() <= TUNISIE.n && b.getWest() >= TUNISIE.o && b.getEast() <= TUNISIE.e;
    if (dedans) { zoneTxt(""); return; }                                   // Tunisie : déjà chargée
    if (carte.getZoom() < ZOOM_MONDE) { zoneTxt(L2("Ailleurs dans le monde : zoomez sur une ville, ou touchez « Autour de moi », pour voir ses points d'eau.", "في باقي العالم: قرّب الخريطة على مدينة، أو المس « حولي »، لرؤية نقاط الماء فيها.", "Elsewhere in the world: zoom in on a town, or tap “Near me”, to see its water points.")); return; }
    if (zonesLues.some(z => z.contains(b))) return;
    const zone = b.pad(0.25);
    zoneTxt(L2("Recherche des points d'eau de cette zone…", "جارٍ البحث عن نقاط الماء في هذه المنطقة…", "Looking for water points in this area…"));
    // OpenStreetMap et WPdx en même temps ; il suffit qu'un des deux réponde
    const [osm, wp] = await Promise.allSettled([lireZone(zone.getSouth(), zone.getWest(), zone.getNorth(), zone.getEast()),
      lireWpdx(zone.getSouth(), zone.getWest(), zone.getNorth(), zone.getEast())]);
    try {
      if (osm.status === "rejected" && wp.status === "rejected") throw osm.reason;
      const n = (osm.status === "fulfilled" ? ajouterZone(osm.value) : 0) + (wp.status === "fulfilled" ? ajouterWpdx(wp.value) : 0);
      zonesLues.push(zone); filtres(); dessiner(); proches();
      const total = D.points.filter(p => zone.contains([p.lat, p.lon])).length;
      zoneTxt(total ? L2("{n} points d'eau dans cette zone.", "{n} نقطة ماء في هذه المنطقة.", "{n} water points in this area.").replace("{n}", total)
        : L2("Aucun point d'eau connu ici : vous en connaissez un ? Signalez-le.", "لا توجد نقطة ماء معروفة هنا: تعرف واحدة؟ أضفها.", "No known water point here: do you know one? Report it."));
      return n;
    } catch (x) {
      zoneTxt(L2("OpenStreetMap ne répond pas pour le moment : réessayez dans un instant.", "OpenStreetMap لا يستجيب الآن: أعد المحاولة بعد قليل.", "OpenStreetMap is not responding right now: try again in a moment."), true);
    }
  }
  // « Chercher une ville du monde » (09/10/2026, comme le site des mosquées) : Nominatim (OpenStreetMap), UNE requête par
  // recherche validée (bouton, touche Entrée ou ville d'exemple), jamais à chaque frappe ; la carte se centre sur la ville et
  // ses points d'eau sont lus en direct (chargerMonde, au déplacement de la carte)
  const NOMINATIM = "https://nominatim.openstreetmap.org/search", villesVues = {};
  let villeEnCours = false;
  async function chercherVille(q) {
    q = String(q || "").trim().slice(0, 60);
    const info = $("pe-monde-info");
    if (!q || villeEnCours || !info) return;
    villeEnCours = true;
    info.textContent = L2("Recherche de la ville dans le monde…", "جارٍ البحث عن المدينة في العالم…", "Looking for the town in the world…");
    try {
      let r = villesVues[q.toLowerCase()];
      if (!r) {
        const rep = await fetch(NOMINATIM + "?" + new URLSearchParams({ format: "json", q, limit: "1", "accept-language": document.documentElement.lang }), { headers: { Accept: "application/json" } });
        if (!rep.ok) throw new Error("HTTP " + rep.status);
        r = villesVues[q.toLowerCase()] = ((await rep.json()) || [])[0] || { vide: true };
      }
      if (r.vide || !isFinite(+r.lat) || !isFinite(+r.lon)) { info.textContent = L2("Aucune ville trouvée dans le monde pour ce nom.", "لم يُعثر على مدينة بهذا الاسم في العالم.", "No town with this name was found in the world."); return; }
      info.textContent = L2("Carte centrée sur : {l} (recherche Nominatim, © contributeurs OpenStreetMap).", "الخريطة متمركزة على: {l} (بحث Nominatim، © مساهمو OpenStreetMap).", "Map centred on: {l} (Nominatim search, © OpenStreetMap contributors).")
        .replace("{l}", String(r.display_name || q).slice(0, 120));
      chargerLeaflet(() => { carte.setView([+r.lat, +r.lon], 12); $("pe-carte").scrollIntoView && $("pe-carte").scrollIntoView({ behavior: "smooth", block: "center" }); });
    } catch (x) {
      info.textContent = L2("La recherche de ville ne répond pas pour le moment : réessayez dans un instant.", "البحث عن المدن لا يستجيب الآن: أعد المحاولة بعد قليل.", "The town search is not responding right now: try again in a moment.");
    } finally { villeEnCours = false; }
  }
  window.EAUX_MONDE = { versPoint, ajouterZone, lireZone, versPointWpdx, ajouterWpdx, lireWpdx, chargerMonde, zoneTxt, chercherVille };   // pour les tests

  function demarrerCarte() {
    if (carte || !window.L) return;
    carte = L.map("pe-carte", { scrollWheelZoom: false, preferCanvas: true }).setView([34.2, 9.6], 6);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</a>' }).addTo(carte);
    calque = L.layerGroup().addTo(carte);
    const message = L.control({ position: "topright" });
    message.onAdd = () => { bulleZone = L.DomUtil.create("div", "pe-zone-carte"); bulleZone.hidden = true; L.DomEvent.disableClickPropagation(bulleZone); return bulleZone; };
    message.addTo(carte);
    let attente = null;
    carte.on("moveend", () => { clearTimeout(attente); attente = setTimeout(chargerMonde, 600); });
    dessiner();
  }
  const apresLeaflet = [];
  function chargerLeaflet(fin) {
    if (fin) apresLeaflet.push(fin);
    const suite = () => { demarrerCarte(); apresLeaflet.splice(0).forEach(f => f()); };
    if (window.L) return suite();
    if (document.getElementById("leaflet-js")) return;          // déjà en cours de chargement
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);
    const js = document.createElement("script"); js.id = "leaflet-js"; js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    js.onload = suite; document.head.appendChild(js);
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
      envoyer(ok ? "POINT-OK" : "POINT-KO", id, "|" + jeton).then(() => { v.parentNode.innerHTML = `<small>${L2("Merci ! Pris en compte dans 2 heures environ.", "شكرًا! يُحتسب خلال ساعتين تقريبًا.", "Thank you! Counted within about 2 hours.")}</small>`; }, () => {});
      return;
    }
    const voir = e.target.closest("[data-voir]");
    if (voir) { voirSurCarte(voir.dataset.voir); return; }
    const lien = e.target.closest('a[href$="#signaler"]');
    if (lien && lien.pathname === location.pathname) { e.preventDefault(); ouvrirSig(); }
  });
  // bandeau « Le monde entier est sur la carte » : recherche d'une ville, villes d'exemple, vue du monde (09/10/2026)
  if ($("pe-monde-f")) $("pe-monde-f").addEventListener("submit", e => { e.preventDefault(); chercherVille($("pe-monde-q").value); });
  document.addEventListener("click", e => {
    const ex = e.target.closest && e.target.closest("[data-ville-ex]");
    if (ex) { chercherVille(ex.dataset.villeEx); return; }
    if (e.target.closest && e.target.closest("[data-monde-vue]")) chargerLeaflet(() => { carte.setView([25, 15], 2); $("pe-carte").scrollIntoView && $("pe-carte").scrollIntoView({ behavior: "smooth", block: "center" }); });
  });
  $("pe-autour").addEventListener("click", () => {
    $("pe-autour-txt").textContent = L2("Recherche de votre position…", "جارٍ تحديد موقعك…", "Finding your position…");
    maPosition(p => {
      if (!p) { $("pe-autour-txt").textContent = L2("Position indisponible : autorisez la localisation, ou cherchez sur la carte.", "الموقع غير متاح: اسمح بتحديد الموقع، أو ابحث في الخريطة.", "Position unavailable: allow location access, or look on the map."); return; }
      ici = p; $("pe-autour-txt").textContent = "";
      if (carte) carte.setView([p.lat, p.lon], 13);
      proches();
      $("pe-google").href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("source d'eau")}%20${p.lat},${p.lon}`;
    });
  });
  // ---- « Signaler un point d'eau » : fenêtre, comme « Signaler un prix » du site Prix des Eaux ----
  // petite carte dans la fenêtre : « Me localiser (GPS) » ou toucher la carte pose un repère déplaçable,
  // puis « Confirmer cette position » (la position n'est prise qu'une fois confirmée).
  const pop = $("pe-sig-pop");
  let mini = null, repere = null;
  const etat = (txt, err) => { const t = $("pe-pos-txt"); t.textContent = txt; t.className = "geo-status" + (err ? " err" : ""); };
  function nonConfirme() {
    $("pe-pos").value = ""; $("pe-pos-ok").classList.remove("fait");
    etat(L2("Repère placé : vérifiez-le, puis « Confirmer cette position ».", "تم وضع العلامة: تحقّق منها ثم « أكّد هذا الموقع ».", "Marker placed: check it, then “Confirm this position”."));
  }
  function placerRepere(lat, lon, zoom) {
    if (!mini) return;
    if (repere) repere.setLatLng([lat, lon]);
    else { repere = L.marker([lat, lon], { draggable: true, autoPan: true }).addTo(mini); repere.on("dragend", nonConfirme); }
    if (zoom) mini.setView([lat, lon], zoom);
    nonConfirme();
  }
  function demarrerMini() {
    if (mini || !window.L) return;
    const c = carte ? carte.getCenter() : { lat: 34.2, lng: 9.6 };
    mini = L.map("pe-sig-carte", { scrollWheelZoom: false }).setView([c.lat, c.lng], carte ? Math.max(carte.getZoom(), 6) : 6);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(mini);
    mini.on("click", e => placerRepere(e.latlng.lat, e.latlng.lng));
  }
  function ouvrirSig() {
    pop.hidden = false;
    $("pe-statut").textContent = ""; $("pe-statut").className = "";
    derniers();
    chargerLeaflet(() => { demarrerMini(); setTimeout(() => mini && mini.invalidateSize(), 60); });
  }
  function fermerSig() {
    pop.hidden = true;
    if (location.hash === "#signaler") history.replaceState(null, "", location.pathname + location.search);
  }
  window.EAUX_SIGNALER = ouvrirSig;           // pour les tests

  // derniers points signalés par les visiteurs (30 jours), comme « Derniers prix signalés »
  function derniers() {
    const box = $("pe-derniers");
    const ref = new Date(String(D.maj || "").slice(0, 10) + "T12:00:00");
    const age = p => (ref - new Date(p.date + "T12:00:00")) / 864e5;
    const l = D.points.filter(p => p.src === "visiteur" && /^\d{4}-\d\d-\d\d$/.test(p.date || "") && (isNaN(ref) || age(p) <= 30))
      .sort((x, y) => y.date.localeCompare(x.date)).slice(0, 10);
    if (!l.length) {
      box.innerHTML = `<p class="sig-vide">${L2("Aucun point d'eau signalé ces 30 derniers jours : soyez le premier !", "لم تُضف أي نقطة ماء خلال الثلاثين يومًا الأخيرة: كن الأول!", "No water point reported in the last 30 days: be the first!")}</p>`;
      return;
    }
    const lg = document.documentElement.lang;
    box.innerHTML = `<p class="sig-titre">${L2("Derniers points d'eau signalés par les visiteurs", "آخر نقاط الماء التي أضافها الزوار", "Latest water points reported by visitors")}</p><ul>` + l.map(p => {
      const vu = new Date(p.date + "T12:00:00").toLocaleDateString({ ar: "ar-TN", en: "en-GB", tr: "tr-TR", id: "id-ID", ur: "ur-PK", de: "de-DE", es: "es-ES" }[lg] || "fr-FR", { day: "numeric", month: "short" });
      const st = p.statut === "confirme" ? L2("confirmé par {n} visiteurs", "أكّده {n} زوار", "confirmed by {n} visitors").replace("{n}", p.ok) : L2("à confirmer", "في انتظار التأكيد", "to be confirmed");
      return `<li><b>${esc(p.nom) || nomT(p.type)}</b> · ${nomT(p.type)} <small>· ${L2("signalé le", "أُضيف في", "reported on")} ${vu} · ${st}</small>
        <button type="button" data-voir="${esc(p.id)}">${L2("voir sur la carte", "اعرض على الخريطة", "see on the map")}</button></li>`;
    }).join("") + `</ul>`;
  }
  function voirSurCarte(id) {
    const p = D.points.find(x => x.id === id);
    if (!p) return;
    fermerSig();
    if (!actifs.has(p.type)) { actifs.add(p.type); filtres(); dessiner(); }
    $("pe-carte").scrollIntoView({ behavior: "smooth", block: "center" });
    chargerLeaflet(() => { carte.setView([p.lat, p.lon], 16); if (marqueurs[p.id]) marqueurs[p.id].openPopup(); });
  }

  $("pe-sig-ouvrir").addEventListener("click", ouvrirSig);
  $("pe-sig-fermer").addEventListener("click", fermerSig);
  pop.addEventListener("click", e => { if (e.target === pop) fermerSig(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !pop.hidden) fermerSig(); });
  if (location.hash === "#signaler") ouvrirSig();            // lien « Signaler un point d'eau » du menu, depuis une autre page

  $("pe-ma-pos").addEventListener("click", () => {
    etat(L2("Recherche de votre position…", "جارٍ تحديد موقعك…", "Finding your position…"));
    maPosition(p => {
      if (!p) { etat(L2("Position indisponible : touchez plutôt l'endroit sur la carte.", "الموقع غير متاح: المس المكان على الخريطة.", "Position unavailable: tap the spot on the map instead."), true); return; }
      chargerLeaflet(() => { demarrerMini(); placerRepere(p.lat, p.lon, 17); });
    });
  });
  $("pe-pos-ok").addEventListener("click", () => {
    if (!repere) { etat(L2("Placez d'abord le repère : « Me localiser (GPS) » ou touchez la carte.", "ضع العلامة أولًا: « حدّد موقعي » أو المس الخريطة.", "Place the marker first: “Locate me (GPS)” or tap the map."), true); return; }
    const g = repere.getLatLng();
    $("pe-pos").value = g.lat.toFixed(5) + "," + g.lng.toFixed(5);
    $("pe-pos-ok").classList.add("fait");
    etat(L2("✔ Position confirmée", "✔ تم تأكيد الموقع", "✔ Position confirmed") + " : " + g.lat.toFixed(5) + ", " + g.lng.toFixed(5));
  });
  $("pe-form").addEventListener("submit", e => {
    e.preventDefault();
    const st = $("pe-statut"), type = $("pe-type").value, pos = $("pe-pos").value, nom = $("pe-nom").value.replace(/\|/g, " ").trim().slice(0, 60);
    const dire = (txt, cls) => { st.textContent = txt; st.className = cls || ""; };
    if (!TYPES[type]) { dire(L2("Choisissez le type de point d'eau.", "اختر نوع نقطة الماء.", "Choose the type of water point."), "err"); return; }
    if (!/^-?\d+\.\d+,-?\d+\.\d+$/.test(pos)) { dire(L2("Placez le repère sur la carte, puis « Confirmer cette position ».", "ضع العلامة على الخريطة، ثم « أكّد هذا الموقع ».", "Place the marker on the map, then “Confirm this position”."), "err"); return; }
    if ($("pe-form").querySelector("[name=_gotcha]").value) return;
    const btn = $("pe-envoyer"); btn.disabled = true; dire(L2("Envoi…", "جارٍ الإرسال…", "Sending…"));
    envoyer("POINT", type + "|" + nom, pos + "|" + jeton).then(() => {
      dire(L2("Merci ! Le point apparaîtra sur la carte dans 2 heures environ (« à confirmer » jusqu'à ce qu'un autre visiteur le confirme).", "شكرًا! ستظهر النقطة على الخريطة خلال ساعتين تقريبًا (« في انتظار التأكيد » حتى يؤكّدها زائر آخر).", "Thank you! The point will appear on the map in about 2 hours (“to be confirmed” until another visitor confirms it)."), "ok");
      $("pe-form").reset(); $("pe-pos").value = ""; $("pe-pos-ok").classList.remove("fait"); etat("");
      if (repere && mini) { mini.removeLayer(repere); repere = null; }
      setTimeout(fermerSig, 3500);
    }, () => dire(L2("Échec de l'envoi — vérifiez votre connexion et réessayez.", "تعذّر الإرسال — تحقّق من الاتصال وأعد المحاولة.", "Sending failed — check your connection and try again."), "err"))
      .then(() => { btn.disabled = false; });
  });

  filtres();
  document.addEventListener("langue", () => { filtres(); proches(); dessiner(); if (!pop.hidden) derniers(); });
  if ("IntersectionObserver" in window) {
    const o = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { o.disconnect(); chargerLeaflet(); } });
    o.observe($("pe-carte"));
  } else chargerLeaflet();
})();
