# -*- coding: utf-8 -*-
"""Points d'eau de Tunisie connus d'OpenStreetMap (idée d'Ahmed, 09/10/2026 : « où trouver une source d'eau »).
Lit tous les 3 mois (workflow osm.yml : 1er janvier, avril, juillet, octobre) les sources, fontaines d'eau potable, robinets publics, points
d'eau, puits et citernes (majels) de la Tunisie, et écrit donnees/points_osm.json. Les points signalés par les visiteurs
sont ajoutés par tools/signalements.py (même formulaire que les prix, format = POINT).
Données © contributeurs OpenStreetMap, licence ODbL (citée sur la page). Lecture polie (User-Agent, 3 serveurs, essais).
Panne ou réponse absurde (moins de MIN points) : l'ancien fichier est gardé, code de sortie 1.
Usage : python tools/points_eau_osm.py"""
import os
import json, sys, time, urllib.parse, urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SORTIE = ROOT / "donnees" / "points_osm.json"
UA = {"User-Agent": "points-eau-tunisie/1.0 (+https://eau.clicvia.com/)"}
SERVEURS = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter",
            "https://overpass.openstreetmap.fr/api/interpreter"]   # 5 copies du même OpenStreetMap (règle commune § 4)
# étiquette OSM → type affiché sur le site
TYPES = [("natural", "spring", "source"), ("amenity", "drinking_water", "fontaine"), ("man_made", "water_tap", "robinet"),
         ("amenity", "water_point", "robinet"), ("man_made", "cistern", "majel"), ("man_made", "water_well", "puits")]
MIN = 50


# 21/10/2026 (même panne que les annuaires ce jour-là) : serveurs lents -> 10 essais de plusieurs minutes, le robot pouvait être
# COUPÉ par GitHub avant la fin. Budget TOTAL de temps (OSM_BUDGET_S) : ensuite on s'arrête et l'ancien fichier est gardé.
DEBUT_OSM = time.monotonic()
BUDGET_OSM = float(os.environ.get("OSM_BUDGET_S") or 1500)


def reste_osm():
    return BUDGET_OSM - (time.monotonic() - DEBUT_OSM)


def requete(q, essais=10):
    dernier = None
    for i in range(essais):
        if reste_osm() < 30:
            raise RuntimeError(f"OpenStreetMap trop lent : budget de {int(BUDGET_OSM // 60)} min dépassé ({dernier})")
        url = SERVEURS[i % len(SERVEURS)]
        try:
            req = urllib.request.Request(url, data=urllib.parse.urlencode({"data": q}).encode(), headers=UA)
            with urllib.request.urlopen(req, timeout=min(200, max(10, reste_osm()))) as r:
                d = json.loads(r.read())
            remarque = str(d.get("remark", ""))
            if "error" in remarque.lower() or "timed out" in remarque.lower():   # ex. serveur sans « aires » : réponse vide + erreur
                raise RuntimeError(f"{url} : réponse incomplète ({remarque[:80]})")
            if len(d.get("elements", [])) < MIN:                                  # vide ou presque : on essaie le serveur suivant
                raise RuntimeError(f"{url} : seulement {len(d.get('elements', []))} éléments")
            return d
        except Exception as e:
            dernier = e
            print(f"  essai {i + 1} : {str(e)[:120]}", flush=True)
            time.sleep(max(0, min(10 * (i + 1), reste_osm() - 30)))
    raise RuntimeError(f"Overpass indisponible : {dernier}")


def type_de(tags):
    for k, v, t in TYPES:
        if tags.get(k) == v:
            return t
    return None


def lire():
    union = "".join(f'nwr["{k}"="{v}"](area.a);' for k, v, _ in TYPES)
    q = f'[out:json][timeout:180];area["ISO3166-1"="TN"][admin_level=2]->.a;({union});out center tags;'
    d = requete(q)
    points = []
    for e in d.get("elements", []):
        tags = e.get("tags", {})
        t = type_de(tags)
        lat = e.get("lat", (e.get("center") or {}).get("lat"))
        lon = e.get("lon", (e.get("center") or {}).get("lon"))
        if not t or lat is None or lon is None:
            continue
        if tags.get("access") in ("private", "no") or tags.get("disused") == "yes" or tags.get("drinking_water") == "no" and t == "fontaine":
            continue
        points.append({"id": f"osm-{e['type'][0]}{e['id']}", "type": t, "lat": round(lat, 6), "lon": round(lon, 6),
                       "nom": (tags.get("name:fr") or tags.get("name") or tags.get("name:ar") or "")[:60],
                       "potable": {"yes": True, "no": False}.get(tags.get("drinking_water")), "src": "osm"})
    return sorted(points, key=lambda p: p["id"])


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    try:
        points = lire()
    except Exception as e:
        print("Échec, ancien fichier gardé :", e); return 1
    if len(points) < MIN:
        print(f"Réponse suspecte ({len(points)} points), ancien fichier gardé."); return 1
    SORTIE.write_text(json.dumps({"maj": date.today().isoformat(), "licence": "© contributeurs OpenStreetMap (ODbL)",
                                  "points": points}, ensure_ascii=False, indent=0) + "\n", encoding="utf-8", newline="\n")
    from collections import Counter
    print(f"{len(points)} points d'eau :", dict(Counter(p["type"] for p in points)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
