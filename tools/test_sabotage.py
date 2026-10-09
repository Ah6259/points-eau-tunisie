# -*- coding: utf-8 -*-
"""Sabotage volontaire (règle commune) : on abîme une COPIE du site de plusieurs façons ; chaque fois, tools/test_site.mjs doit échouer.
  python tools/test_sabotage.py      (lancé aussi par .github/workflows/tests.yml)
Ancres courtes et stables (règle du 08/10/2026) : si une ancre n'est plus trouvée, le test le dit (à adapter dans le même commit)."""
import os, shutil, subprocess, sys, tempfile

ICI = os.path.dirname(os.path.abspath(__file__)); RACINE = os.path.dirname(ICI)
SABOTAGES = [
    ("assets/points-eau.js", 'corps.append(CH.format, format);', 'corps.append(CH.format, "PRIX");', "le signalement part avec un mauvais format"),
    ("assets/points-eau.js", 'if (!TYPES[type]) {', 'if (false) {', "un signalement sans type est envoyé"),
    ("assets/page.js", '<button class="partager"', '<button class="x-partager"', "bouton Partager retiré"),
    ("index.html", "Eau non contrôlée.", "Eau.", "avertissement « eau non contrôlée » retiré"),
    ("coran-et-eau/index.html", "سورة الأنبياء", "سورة", "un verset du Coran perdu"),
    ("assets/langues.js", '"Accueil": "Ana sayfa"', '"Accueil": ""', "une traduction turque manquante"),
    ("coran-et-eau/index.html", 'data-t="de" lang="de" dir="ltr">… und aus', 'data-t="xx" lang="de" dir="ltr">… und aus', "traduction allemande d'un verset perdue"),
    (".github/workflows/osm.yml", '"17 2 1 1,4,7,10 *"', '"17 2 * * 1"', "robot OpenStreetMap remis chaque semaine"),
    ("index.html", "photo-type-puits.jpg", "photo-type-absente.jpg", "photo d'un type de point d'eau manquante"),
]
IGNORER = shutil.ignore_patterns("node_modules", ".git", "_icone", "__pycache__")


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    rate = 0
    for f, avant, apres, quoi in SABOTAGES:
        with tempfile.TemporaryDirectory() as tmp:
            copie = os.path.join(tmp, "site")
            shutil.copytree(RACINE, copie, ignore=IGNORER)
            p = os.path.join(copie, f)
            s = open(p, encoding="utf-8").read()
            if avant not in s:
                print(f"FAIL ancre introuvable dans {f} : {avant!r} (adapter ce sabotage)"); rate += 1; continue
            open(p, "w", encoding="utf-8", newline="\n").write(s.replace(avant, apres, 1))
            r = subprocess.run(["node", os.path.join(ICI, "test_site.mjs"), copie], capture_output=True, text=True, encoding="utf-8", stdin=subprocess.DEVNULL)
            if r.returncode == 0:
                print(f"FAIL sabotage NON détecté : {quoi}"); rate += 1
            else:
                print(f"OK   sabotage détecté : {quoi}")
    print("\nTOUT PASSE" if not rate else f"\n{rate} PROBLÈME(S)")
    return 1 if rate else 0


if __name__ == "__main__":
    sys.exit(main())
