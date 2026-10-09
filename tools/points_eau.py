# -*- coding: utf-8 -*-
"""Points d'eau signalés par les visiteurs (site Points d'eau Tunisie, idée d'Ahmed du 09/10/2026) — appelé par
tools/signalements.py à chaque passage (toutes les 2 h), comme les prix signalés : publication AUTOMATIQUE avec garde-fous.

Même Google Forms que les prix (aucun nouveau formulaire) :
  - nouveau point  : format = POINT,    marque = « type|nom »,     lieu = « lat,lon|jeton »
  - c'est vrai     : format = POINT-OK, marque = id du point,      lieu = « |jeton »
  - n'existe plus  : format = POINT-KO, marque = id du point,      lieu = « |jeton »
  (jeton = identifiant anonyme du navigateur « pt:… » : une voix par navigateur et par point, la dernière compte)

Garde-fous (un robot ne peut pas prouver qu'un point d'eau existe, il écarte l'invraisemblable) :
  - type connu, position DANS la Tunisie, jeton présent ;
  - nom nettoyé : 60 caractères, sans lien internet ni numéro de téléphone (pas de publicité, pas de données personnelles) ;
  - 10 points au plus par navigateur ;
  - un point du même type à moins de 40 m d'un point connu = une confirmation de celui-ci (pas de doublon) ;
  - statut : « signalé » (1 personne), « confirmé » (2 personnes ou plus) ; retiré de la carte si au moins 2 personnes
    disent « n'existe plus » et qu'elles sont plus nombreuses que les confirmations (3 pour un point OpenStreetMap).
Sortie : donnees/points_eau.js (window.EAUX_POINTS), lu par la page points-d-eau/."""
import hashlib, json, math, re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OSM = ROOT / "donnees" / "points_osm.json"
AJEM = ROOT / "donnees" / "points_ajem.json"          # majels de Djerba recensés par l'association AJEM (tools/points_ajem.py)
SORTIE = ROOT / "donnees" / "points_eau.js"
TYPES = ("source", "fontaine", "robinet", "majel", "puits")
TUNISIE = (30.2, 37.6, 7.5, 11.7)          # lat min, lat max, lon min, lon max
MAX_PAR_JETON = 10
RAYON_M = 40


def distance_m(a, b):
    r = 6371000
    p1, p2 = math.radians(a["lat"]), math.radians(b["lat"])
    dp, dl = p2 - p1, math.radians(b["lon"] - a["lon"])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def nettoyer_nom(s):
    s = re.sub(r"https?://\S+|www\.\S+|\S+@\S+", "", s or "")
    s = re.sub(r"(?:\+?216)?[\s.-]*\d(?:[\s.-]*\d){5,}", "", s)        # numéros de téléphone (6 chiffres ou plus)
    s = re.sub(r"[<>\"`]", "", s)
    return re.sub(r"\s+", " ", s).strip()[:60]


def lire_point(r):
    """Ligne POINT → dict, ou (None, raison)."""
    t, _, nom = (r.get("marque") or "").partition("|")
    pos, _, jeton = (r.get("lieu") or "").partition("|")
    t = t.strip().lower()
    if t not in TYPES:
        return None, f"type inconnu « {t} »"
    if not jeton.startswith("pt:"):
        return None, "jeton absent"
    m = re.fullmatch(r"\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,2}\.\d+)\s*", pos)
    if not m:
        return None, "position illisible"
    lat, lon = float(m.group(1)), float(m.group(2))
    if not (TUNISIE[0] <= lat <= TUNISIE[1] and TUNISIE[2] <= lon <= TUNISIE[3]):
        return None, "position hors de Tunisie"
    pid = "sig-" + hashlib.sha1(f"{t}|{lat:.5f}|{lon:.5f}".encode()).hexdigest()[:10]
    return {"id": pid, "type": t, "lat": round(lat, 6), "lon": round(lon, 6), "nom": nettoyer_nom(nom), "src": "visiteur",
            "date": (r.get("date") or r.get("horodateur") or "")[:10], "jeton": jeton}, None


def calculer(reponses, osm_points):
    points = {p["id"]: dict(p, ok=set(), ko=set()) for p in osm_points}
    par_jeton, rejets = {}, []
    # 1. nouveaux points (dans l'ordre d'arrivée)
    for r in reponses:
        if (r.get("format") or "").strip().upper() != "POINT":
            continue
        p, raison = lire_point(r)
        if not p:
            rejets.append(raison); continue
        j = p.pop("jeton")
        if par_jeton.get(j, 0) >= MAX_PAR_JETON:
            rejets.append("trop de points pour ce navigateur"); continue
        proche = next((q for q in points.values() if q["type"] == p["type"] and distance_m(p, q) <= RAYON_M), None)
        if proche:
            proche["ok"].add(j); proche["ko"].discard(j)
            if not proche.get("nom") and p["nom"]:
                proche["nom"] = p["nom"]
            continue
        par_jeton[j] = par_jeton.get(j, 0) + 1
        points[p["id"]] = dict(p, ok={j}, ko=set())
    # 2. confirmations / « n'existe plus » (la dernière voix d'un navigateur compte)
    for r in reponses:
        f = (r.get("format") or "").strip().upper()
        if f not in ("POINT-OK", "POINT-KO"):
            continue
        q = points.get((r.get("marque") or "").strip())
        j = (r.get("lieu") or "").partition("|")[2]
        if not q or not j.startswith("pt:"):
            continue
        (q["ok"] if f == "POINT-OK" else q["ko"]).add(j)
        (q["ko"] if f == "POINT-OK" else q["ok"]).discard(j)
    # 3. statut
    sortie = []
    for q in points.values():
        ok, ko = len(q.pop("ok")), len(q.pop("ko"))
        externe = q["src"] in ("osm", "ajem")          # point venu d'un recensement (OpenStreetMap, AJEM)
        seuil = 3 if externe else 2
        if ko >= seuil and ko > ok:
            continue
        q["ok"], q["ko"] = ok, ko
        q["statut"] = q["src"] if externe and ok < 1 else ("confirme" if ok >= 2 or (externe and ok >= 1) else "signale")
        sortie.append(q)
    return sorted(sortie, key=lambda p: p["id"]), rejets


def ecrire_points(reponses):
    osm = json.loads(OSM.read_text(encoding="utf-8")) if OSM.exists() else {"points": []}
    ajem = json.loads(AJEM.read_text(encoding="utf-8")).get("points", []) if AJEM.exists() else []
    # un majel AJEM et un puits/majel OpenStreetMap à moins de RAYON_M : le même ouvrage, on garde la fiche AJEM (plus riche)
    base = [p for p in osm.get("points", []) if not (p["type"] in ("majel", "puits") and any(distance_m(p, a) <= RAYON_M for a in ajem))]
    points, rejets = calculer(reponses, base + ajem)
    SORTIE.write_text("// GÉNÉRÉ par tools/points_eau.py (via signalements.py) — points d'eau : OpenStreetMap + AJEM (majels de Djerba) + visiteurs\n"
                      "window.EAUX_POINTS = " + json.dumps({"maj": datetime.now().isoformat(timespec="minutes"),
                                                            "osm_maj": osm.get("maj", ""), "points": points},
                                                           ensure_ascii=False, separators=(",", ":")) + ";\n",
                      encoding="utf-8", newline="\n")
    nb_v = sum(1 for p in points if p["src"] == "visiteur")
    print(f"Points d'eau : {len(points)} sur la carte ({nb_v} signalés par les visiteurs), {len(rejets)} rejet(s)")
    return points
