# -*- coding: utf-8 -*-
"""Feuille des signalements illisible (23/10/2026, règles communes § 17 et § 38) : relue 2 fois, robot ROUGE seulement si la panne
dure plus de 2 jours ; une feuille lisible SANS nouveau signalement reste VERTE. Sans réseau : fausses réponses, attentes simulées.
python tools/test_signalements_points.py      (lancé aussi par tests.yml et signalements.yml)"""
import json, os, sys, tempfile
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import points_eau as P  # noqa: E402
import signalements_points as S  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
erreurs = 0


def check(desc, ok):
    global erreurs
    print(("OK   " if ok else "FAIL ") + desc)
    erreurs += 0 if ok else 1


TMP = Path(tempfile.mkdtemp())
P.SORTIE = TMP / "points_eau.js"          # la vraie carte n'est jamais touchée par le test
ETAT = TMP / "signalements_etat.json"
ENTETE = b"Horodateur,marque,format,eau,prix,unite,magazin,lieu,date\n"
HTML = b"<!DOCTYPE html><html><head><title>Google Sheets - connexion</title></head><body>Se connecter</body></html>"
NOW = datetime(2026, 10, 23, 10, 5)
attentes = []
att = attentes.append


def lecteur(*reponses):
    it = iter(reponses)

    def lire():
        r = next(it)
        if isinstance(r, Exception):
            raise r
        return r
    return lire


def etat():
    return json.loads(ETAT.read_text(encoding="utf-8")) if ETAT.exists() else {}


for quoi, rep in (("page HTML de connexion", HTML), ("réponse vide", b""), ("erreur réseau", OSError("hôte introuvable")),
                  ("CSV sans les bonnes colonnes", b"Nom,Valeur\nx,1\n")):
    attentes.clear()
    try:
        S.lire_feuille(lecteur(rep, rep, rep), att, horloge=lambda: 0)
        check(f"{quoi} : refusée", False)
    except S.FeuilleIllisible as e:
        check(f"{quoi} : refusée après 3 lectures (attentes 2 puis 4 min) — « {e} »", attentes == [120, 240])
attentes.clear()
check("panne passagère : 1re lecture en échec, 2e bonne -> feuille lue, une seule attente de 2 min",
      S.lire_feuille(lecteur(HTML, ENTETE), att, horloge=lambda: 0) == ENTETE.decode() and attentes == [120])
attentes.clear()
try:
    S.lire_feuille(lecteur(HTML, HTML, HTML), att, horloge=iter([0, 7 * 60, 7 * 60]).__next__)
except S.FeuilleIllisible:
    pass
check("budget de 8 min dépassé : pas de nouvel essai", attentes == [])

# Le robot entier (main)
check("feuille illisible (1er passage) -> robot VERT (code 0), début de la panne noté, carte non touchée",
      S.main(lecteur(HTML, HTML, HTML), att, NOW, ETAT) == 0 and etat().get("feuille_illisible_depuis") == "2026-10-23T10:05"
      and not P.SORTIE.exists())
check("toujours illisible 1 jour après -> encore VERT, date de début gardée",
      S.main(lecteur(HTML, HTML, HTML), att, NOW + timedelta(days=1), ETAT) == 0
      and etat()["feuille_illisible_depuis"] == "2026-10-23T10:05")
check("illisible depuis plus de 2 jours -> robot ROUGE (code 1)",
      S.main(lecteur(HTML, HTML, HTML), att, NOW + timedelta(days=2, hours=1), ETAT) == 1)
check("feuille lisible sans aucun signalement -> robot VERT, panne effacée, carte recalculée",
      S.main(lecteur(ENTETE), att, NOW + timedelta(days=3), ETAT) == 0 and etat() == {} and P.SORTIE.exists())
check("feuille lisible sans nouveau signalement (encore) -> VERT", S.main(lecteur(ENTETE), att, NOW + timedelta(days=3), ETAT) == 0)

print("\nTOUT PASSE" if not erreurs else f"\n{erreurs} PROBLÈME(S)")
sys.exit(1 if erreurs else 0)
