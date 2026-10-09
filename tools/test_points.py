# -*- coding: utf-8 -*-
"""Tests des points d'eau signalés (tools/points_eau.py) — sans réseau, données factices.  python tools/test_points.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import points_eau as P  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
erreurs = total = 0


def check(desc, ok):
    global erreurs, total
    total += 1
    print(("OK   " if ok else "FAIL ") + desc)
    if not ok:
        erreurs += 1


def point(t, nom, lat, lon, j, d="2026-10-09"):
    return {"format": "POINT", "marque": f"{t}|{nom}", "lieu": f"{lat},{lon}|{j}", "date": d}


def voix(f, pid, j):
    return {"format": f, "marque": pid, "lieu": f"|{j}", "date": "2026-10-09"}


OSM = [{"id": "osm-n1", "type": "source", "lat": 36.8, "lon": 10.18, "nom": "Ain Test", "src": "osm"}]

# 1. un majel signalé à Djerba → publié « signalé » ; nom nettoyé
pts, rej = P.calculer([point("majel", "Majel de la mosquée, appelez 98 765 432 www.pub.tn", 33.8076, 10.8451, "pt:a")], OSM)
m = [p for p in pts if p["src"] == "visiteur"]
check("majel signalé à Djerba : publié, statut « signalé »", len(m) == 1 and m[0]["type"] == "majel" and m[0]["statut"] == "signale")
check("nom nettoyé : sans numéro de téléphone ni lien", m and "98" not in m[0]["nom"] and "www" not in m[0]["nom"] and m[0]["nom"].startswith("Majel de la mosquée"))
check("le point OpenStreetMap reste, statut « osm »", any(p["id"] == "osm-n1" and p["statut"] == "osm" for p in pts))

# 2. rejets
pts, rej = P.calculer([point("majel", "x", 48.85, 2.35, "pt:b"), point("piscine", "x", 36.8, 10.1, "pt:b"),
                       point("source", "x", 36.8, 10.1, "sans-jeton"), {"format": "POINT", "marque": "source|x", "lieu": "abc|pt:b"}], [])
check("rejetés : hors de Tunisie (Paris), type inconnu, sans jeton, position illisible", len(pts) == 0 and len(rej) == 4)

# 3. doublon à moins de 40 m = confirmation ; 2 personnes → « confirmé »
pid = P.lire_point(point("source", "Ain", 36.9, 10.2, "pt:c"))[0]["id"]
pts, _ = P.calculer([point("source", "Ain", 36.9, 10.2, "pt:c"), point("source", "", 36.90015, 10.20015, "pt:d")], [])
check("même source signalée à ~20 m par un 2e visiteur : un seul point, « confirmé »", len(pts) == 1 and pts[0]["id"] == pid and pts[0]["statut"] == "confirme" and pts[0]["ok"] == 2)
pts, _ = P.calculer([point("source", "Ain", 36.9, 10.2, "pt:c"), point("source", "", 36.9010, 10.2, "pt:d")], [])
check("une autre source à ~110 m : deux points distincts", len(pts) == 2)

# 4. confirmations et « n'existe plus »
base = [point("fontaine", "Fontaine du souk", 35.67, 10.1, "pt:e")]
pid = P.lire_point(base[0])[0]["id"]
pts, _ = P.calculer(base + [voix("POINT-OK", pid, "pt:f")], [])
check("« c'est vrai » d'un autre visiteur → confirmé", pts[0]["statut"] == "confirme")
pts, _ = P.calculer(base + [voix("POINT-KO", pid, "pt:f"), voix("POINT-KO", pid, "pt:g")], [])
check("2 « n'existe plus » contre 1 confirmation → retiré de la carte", pts == [])
pts, _ = P.calculer(base + [voix("POINT-KO", pid, "pt:f"), voix("POINT-KO", pid, "pt:f"), voix("POINT-KO", pid, "pt:f")], [])
check("le même navigateur qui répète « n'existe plus » ne compte qu'une fois", len(pts) == 1 and pts[0]["ko"] == 1)
pts, _ = P.calculer(base + [voix("POINT-KO", pid, "pt:f"), voix("POINT-OK", pid, "pt:f")], [])
check("un navigateur qui change d'avis : seule sa dernière voix compte", pts[0]["ko"] == 0 and pts[0]["ok"] == 2)
pts, _ = P.calculer([voix("POINT-KO", "osm-n1", "pt:h"), voix("POINT-KO", "osm-n1", "pt:i")], OSM)
check("point OpenStreetMap : 2 « n'existe plus » ne suffisent pas (il en faut 3)", any(p["id"] == "osm-n1" for p in pts))
pts, _ = P.calculer([voix("POINT-OK", "osm-n1", "pt:h")], OSM)
check("point OpenStreetMap confirmé par un visiteur → « confirmé »", pts[0]["statut"] == "confirme")

# 5. limite par navigateur
pts, rej = P.calculer([point("puits", "", 34 + i / 100, 9.5, "pt:z") for i in range(12)], [])
check("12 points du même navigateur : 10 publiés, 2 refusés", len(pts) == 10 and len(rej) == 2)

# 6. les lignes de prix et de vote sont ignorées
pts, rej = P.calculer([{"format": "VOTE", "marque": "Safia", "lieu": "vote:x"}, {"format": "1,5", "marque": "Safia", "prix": "0.8"}], [])
check("lignes de prix et de vote ignorées", pts == [] and rej == [])

# 7. relevé OpenStreetMap : un serveur qui répond vide avec une erreur cachée (« remark ») est sauté
import json as _j, urllib.request as _u, points_eau_osm as O
_rep = [b'{"elements":[],"remark":"runtime error: open64: No such file /data/areas"}',
        _j.dumps({"elements": [{"type": "node", "id": i, "lat": 36.8, "lon": 10.1, "tags": {"natural": "spring"}} for i in range(60)]}).encode()]
class _R:
    def __init__(self, b): self.b = b
    def __enter__(self): return self
    def __exit__(self, *a): return False
    def read(self): return self.b
_vrai, _sleep = _u.urlopen, O.time.sleep
_u.urlopen = lambda req, timeout=0: _R(_rep.pop(0)); O.time.sleep = lambda s: None
try:
    pts = O.lire()
finally:
    _u.urlopen, O.time.sleep = _vrai, _sleep
check("relevé OSM : réponse vide avec erreur cachée → serveur suivant (60 sources lues)", len(pts) == 60)

print(f"\n{'TOUT PASSE' if not erreurs else str(erreurs) + ' PROBLÈME(S)'} ({total} vérifications)")
sys.exit(1 if erreurs else 0)
