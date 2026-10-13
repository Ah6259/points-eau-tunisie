# -*- coding: utf-8 -*-
"""Les 7 langues ajoutées le 13/10/2026 (italien, portugais, néerlandais, chinois, japonais, coréen, hindi), pour avoir les
mêmes langues que notre site The Message. Une seule méthode pour tout (tous les textes du site : ils sont tous dans assets/langues.js) :
  tools/langues_plus/_francais.json : la liste des textes français (« ui » = clés de assets/langues.js ; « contenu » : vide ici), dans l'ordre ;
  tools/langues_plus/<langue>.txt   : une ligne « numéro<TAB>traduction » par texte, même ordre.
Les versets de la page « Le Coran et l'eau » ne sont PAS traduits par nous : ils sont dans tools/gabarits/coran-et-eau.html,
pris dans la traduction officielle de QuranEnc.com de chaque langue (italian_rwwad, portuguese_nasr, dutch_center, chinese_makin,
japanese_saeedsato, korean_hamid, hindi_omari) ; les hadiths y sont donnés en « traduction approximative du sens », comme pour
le français.
Ajouter un texte français : l'ajouter à la fin de la bonne liste de _francais.json et une ligne dans CHAQUE <langue>.txt
(tools/construire.py s'arrête si une traduction manque). Traductions écrites par Claude : à faire relire par quelqu'un dont
c'est la langue."""
import json, os

ICI = os.path.dirname(os.path.abspath(__file__))
PLUS = ["it", "pt", "nl", "zh", "ja", "ko", "hi"]


def charger():
    """({langue: {français: traduction}}, textes d'interface). Arrêt si un fichier est incomplet."""
    d = json.load(open(os.path.join(ICI, "langues_plus", "_francais.json"), encoding="utf-8"))
    fr = d["ui"] + d["contenu"]
    out = {}
    for l in PLUS:
        lignes = [x for x in open(os.path.join(ICI, "langues_plus", l + ".txt"), encoding="utf-8").read().split("\n") if x.strip()]
        if len(lignes) != len(fr):
            raise SystemExit(f"langues_plus/{l}.txt : {len(lignes)} lignes pour {len(fr)} textes français")
        out[l] = {}
        for i, x in enumerate(lignes):
            n, _, tr = x.partition("\t")
            if n != str(i) or not tr.strip():
                raise SystemExit(f"langues_plus/{l}.txt : ligne {i} absente ou vide")
            out[l][fr[i]] = tr
    return out, d["ui"]
