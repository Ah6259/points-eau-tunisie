# -*- coding: utf-8 -*-
"""Majels (citernes) de Djerba recensés par l'association AJEM — projet « Fesguietna » (https://www.ajem.tn/fesguietna).
Ajoutés sur la carte avec la décision d'Ahmed du 09/10/2026 (usage non commercial : on ne vend pas d'eau) ;
chaque point garde le lien vers sa fiche AJEM et la source est citée sous la carte et dans « À propos ».

Import fait UNE fois (décision d'Ahmed : pas de relecture automatique de leur site). Pour rafraîchir un jour, à la main :
python tools/points_ajem.py puis python tools/signalements_points.py. Réponse suspecte (moins de MINIMUM points) :
l'ancien fichier est gardé (code 1).
Sortie : donnees/points_ajem.json, fusionné par tools/points_eau.py.
Usage : python tools/points_ajem.py [fichier.html local pour les tests]"""
import html, json, re, sys, urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SORTIE = ROOT / "donnees" / "points_ajem.json"
URL = "https://www.ajem.tn/fesguietna/maps/state"
UA = {"User-Agent": "points-eau-tunisie/1.0 (+https://ah6259.github.io/points-eau-tunisie/)"}
MINIMUM = 150
ETATS = {"bonne": "bon", "moyenne": "moyen", "mauvaise": "mauvais", "tres-mauvaise": "tres-mauvais"}
DJERBA = (33.55, 33.98, 10.65, 11.10)           # lat min, lat max, lon min, lon max (île + Ajim / El Kantara)


def lire(texte):
    points, vus = [], set()
    morceaux = texte.split("map.addMarker(")
    for i, bloc in enumerate(morceaux[1:], 1):
        lat = re.search(r"lat:\s*'\s*(-?\d+\.\d+)\s*'", bloc)
        lon = re.search(r"lng:\s*'\s*(-?\d+\.\d+)\s*'", bloc)
        lien = re.search(r'href="(https://www\.ajem\.tn/fesguietna/citerne/([\w-]+))"', bloc)
        if not (lat and lon and lien):
            continue
        la, lo = round(float(lat.group(1)), 6), round(float(lon.group(1)), 6)
        if not (DJERBA[0] <= la <= DJERBA[1] and DJERBA[2] <= lo <= DJERBA[3]) or (lien.group(2), la, lo) in vus:
            continue
        vus.add((lien.group(2), la, lo))
        pid = "ajem-" + lien.group(2)[:50]
        while any(q["id"] == pid for q in points):          # deux fiches AJEM au même nom (ex. « citerne publique 2 »)
            pid += "-b"
        titre = re.search(r"title:\s*'((?:[^'\\]|\\.)*)'", bloc)
        nom = html.unescape(titre.group(1).replace("\\'", "'")) if titre else ""
        nom = re.sub(r"[<>\"`]", "", re.sub(r"\s+", " ", nom)).strip()[:60]
        nom = nom[:1].upper() + nom[1:]
        # l'icône du marqueur précédent ce bloc donne l'état (bonne / moyenne / mauvaise / na)
        etat = None
        m = re.findall(r"fesguietna_photo_([\w-]+)\.png", morceaux[i - 1][-600:])
        if m:
            etat = ETATS.get(m[-1])
        points.append({"id": pid, "type": "majel", "lat": la, "lon": lo, "nom": nom,
                       "potable": None, "src": "ajem", "etat": etat, "lien": lien.group(1)})
    return sorted(points, key=lambda p: p["id"])


def main(fichier=None):
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    try:
        if fichier:
            texte = Path(fichier).read_text(encoding="utf-8", errors="replace")
        else:
            texte = urllib.request.urlopen(urllib.request.Request(URL, headers=UA), timeout=90).read().decode("utf-8", "replace")
        points = lire(texte)
    except Exception as e:
        print(f"! Carte AJEM illisible ({e}) : anciens points gardés.")
        return 1
    if len(points) < MINIMUM:
        print(f"! Carte AJEM suspecte ({len(points)} points, minimum {MINIMUM}) : anciens points gardés.")
        return 1
    SORTIE.write_text(json.dumps({"maj": date.today().isoformat(), "source": "AJEM — Fesguietna", "url": "https://www.ajem.tn/fesguietna",
                                  "points": points}, ensure_ascii=False, indent=0) + "\n", encoding="utf-8", newline="\n")
    print(f"AJEM Fesguietna : {len(points)} majels de Djerba")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else None))
