# -*- coding: utf-8 -*-
"""Points d'eau signalés par les visiteurs → donnees/points_eau.js (workflow signalements.yml, toutes les 2 h de 8h à 22h).
Les signalements arrivent dans le MÊME Google Forms que les prix signalés du site Prix des Eaux (aucun nouveau formulaire) :
seules les lignes « format = POINT / POINT-OK / POINT-KO » sont lues ici (le robot du site des Eaux les ignore).
Le tableau des réponses est publié en CSV (lecture seule).
Feuille illisible (23/10/2026, règles communes § 17 et § 38 : aucun robot vert qui ne fait rien) : erreur réseau, page HTML
(connexion Google) au lieu du CSV, réponse vide ou sans les bonnes colonnes. Relue 2 fois (2 min puis 4 min) ; toujours
illisible : la carte n'est pas touchée, le début de la panne est noté dans donnees/signalements_etat.json et le robot passe
au ROUGE (code 1, alerte « alerte-robot ») quand la panne dure plus de 2 jours. Feuille lisible sans nouveau signalement = vert.
Usage : python tools/signalements_points.py"""
import csv, io, json, sys, time, unicodedata, urllib.request
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from points_eau import ecrire_points  # noqa: E402

CSV_URL = ("https://docs.google.com/spreadsheets/d/e/2PACX-1vRI0naKTfS10a5cUe8Fz9lVDlvKaBtz7J56Yk"
           "Bo4oD-Ev2Al78sCw8zAGe3nyjCehhMdJ6c1C-yEXsn/pub?gid=287357703&single=true&output=csv")
UA = {"User-Agent": "points-eau-tunisie/1.0 (+https://eau.clicvia.com/)"}
ETAT = Path(__file__).resolve().parent.parent / "donnees" / "signalements_etat.json"
COLONNES = ("horodateur", "marque", "format", "lieu", "date")   # colonnes sans lesquelles la feuille est inutilisable
ATTENTES = (120, 240)       # § 38 : relire 2 min puis 4 min plus tard
BUDGET_S = 8 * 60           # § 38 : pas de nouvel essai au-delà de 8 min de relectures
JOURS_PANNE = 2             # § 17 : rouge si la feuille est illisible depuis plus de 2 jours


def norm(s):
    s = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in s if unicodedata.category(c) != "Mn").strip().lower()


class FeuilleIllisible(Exception):
    pass


def verifier_csv(brut):
    """Texte du CSV, ou FeuilleIllisible si ce n'est pas le tableau attendu (page HTML, vide, colonnes manquantes)."""
    try:
        txt = brut.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise FeuilleIllisible("réponse qui n'est pas du texte UTF-8")
    debut = txt.lstrip()[:300].lower()
    if not debut:
        raise FeuilleIllisible("réponse vide")
    if debut.startswith("<") or "<html" in debut:
        raise FeuilleIllisible("page web (HTML) reçue au lieu du tableau CSV (feuille dépubliée ou page de connexion Google ?)")
    lignes = list(csv.reader(io.StringIO(txt)))
    entete = {norm(x) for x in (lignes[0] if lignes else [])}
    manque = [c for c in COLONNES if c not in entete]
    if manque:
        raise FeuilleIllisible("colonnes manquantes : " + ", ".join(manque))
    return txt


def lire_feuille(lecteur, attendre=time.sleep, horloge=time.monotonic):
    """Lit et vérifie la feuille ; relit 2 fois (2 min puis 4 min) si elle est illisible (§ 38). FeuilleIllisible sinon."""
    debut = horloge()
    for i in range(len(ATTENTES) + 1):
        try:
            return verifier_csv(lecteur())
        except Exception as e:
            erreur = e
        if i == len(ATTENTES) or horloge() - debut + ATTENTES[i] > BUDGET_S:
            break
        print(f"  Feuille illisible ({erreur}) : nouvel essai dans {ATTENTES[i] // 60} min")
        attendre(ATTENTES[i])
    raise FeuilleIllisible(str(erreur))


def lire_etat(chemin):
    try:
        return json.loads(chemin.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return {}


def ecrire_etat(chemin, etat):
    texte = json.dumps(etat, ensure_ascii=False, indent=1) + "\n"
    if not chemin.exists() or chemin.read_text(encoding="utf-8") != texte:   # écrit seulement si ça change (pas de commit inutile)
        chemin.write_text(texte, encoding="utf-8", newline="\n")


def panne_feuille(etat, erreur, maintenant):
    """Feuille illisible : note le début de la panne dans l'état, renvoie (code de sortie, message)."""
    depuis = etat.get("feuille_illisible_depuis") or maintenant.isoformat(timespec="minutes")
    etat["feuille_illisible_depuis"] = depuis
    jours = (maintenant - datetime.fromisoformat(depuis)).total_seconds() / 86400
    if jours >= JOURS_PANNE:
        return 1, (f"ÉCHEC Feuille des signalements illisible : {erreur} — depuis le {depuis.replace('T', ' à ')} "
                   f"(plus de {JOURS_PANNE} jours). La carte n'est pas modifiée ; vérifier que le tableau Google des "
                   f"réponses est toujours « publié sur le Web » en CSV.")
    return 0, (f"! Feuille des signalements illisible : {erreur} — rien n'est modifié (panne depuis le "
               f"{depuis.replace('T', ' à ')} ; robot rouge si elle dure plus de {JOURS_PANNE} jours).")


def lire_reponses(texte):
    lignes = list(csv.reader(io.StringIO(texte)))
    col = {norm(x): i for i, x in enumerate(lignes[0])}
    out = []
    for l in lignes[1:]:
        g = lambda k: l[col[k]].strip() if col.get(k) is not None and col[k] < len(l) else ""
        out.append({k: g(k) for k in ("horodateur", "marque", "format", "lieu", "date")})
    return out


def main(lecteur=None, attendre=time.sleep, maintenant=None, etat_chemin=None):
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    etat_chemin = etat_chemin or ETAT
    etat = lire_etat(etat_chemin)
    lire = lecteur or (lambda: urllib.request.urlopen(urllib.request.Request(CSV_URL, headers=UA), timeout=60).read())
    try:
        reponses = lire_reponses(lire_feuille(lire, attendre))
    except FeuilleIllisible as e:      # tableau dépublié, Google en panne : la carte n'est pas touchée
        code, texte = panne_feuille(etat, e, maintenant or datetime.now())
        print(texte)
        ecrire_etat(etat_chemin, etat)
        return code
    etat.pop("feuille_illisible_depuis", None)
    ecrire_etat(etat_chemin, etat)
    print(f"Feuille lue : {len(reponses)} réponse(s).")
    ecrire_points(reponses)
    return 0


if __name__ == "__main__":
    sys.exit(main())
