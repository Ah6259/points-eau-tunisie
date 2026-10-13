# -*- coding: utf-8 -*-
"""Fabrique les pages du site à partir de leur contenu (tools/gabarits/<page>.html) :
même en-tête technique partout (sécurité CSP, iPhone, aperçu de partage, polices, version ?v= des fichiers).
  python tools/construire.py            → écrit <page>/index.html pour chaque gabarit
Un gabarit commence par des lignes « clé: valeur » (titre, description, og_titre, og_description, tete, scripts, corps, faq),
puis une ligne « --- », puis le contenu de <body> (sans l'en-tête ni le pied, ajoutés par assets/page.js).
L'accueil (index.html) est écrit à la main ; sa version ?v= est remplacée ici aussi pour garder UNE version pour tout le site."""
import json, os, re, shutil, sys

ICI = os.path.dirname(os.path.abspath(__file__)); RACINE = os.path.dirname(ICI)
VERSION = "20261013a"           # à changer à chaque modification des fichiers assets/ (le test vérifie une seule version)
BASE = "https://eau.clicvia.com/"
sys.path.insert(0, ICI)
import pages_langues as PL  # noqa: E402
import langues_plus  # noqa: E402
LANGUES = PL.LANGUES            # une vraie page par langue : ar/, en/, tr/, id/, ur/, de/, es/ (tools/pages_langues.py, 12/10/2026)
CSP = ("default-src 'self'; script-src 'self' https://gc.zgo.at https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; "
       "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://cdnjs.cloudflare.com https://prix-eaux-tunisie.goatcounter.com; "
       "connect-src 'self' https://data.waterpointdata.org https://overpass-api.de https://maps.mail.ru https://overpass.kumi.systems https://overpass.private.coffee https://overpass.openstreetmap.fr https://prix-eaux-tunisie.goatcounter.com https://formspree.io https://docs.google.com; object-src 'none'; base-uri 'self'; "
       "form-action 'self' https://formspree.io https://docs.google.com")


def lire_gabarit(chemin):
    texte = open(chemin, encoding="utf-8").read()
    tete, corps = texte.split("\n---\n", 1)
    meta = {}
    for ligne in tete.splitlines():
        if ":" in ligne and not ligne.startswith("#"):
            k, v = ligne.split(":", 1)
            meta[k.strip()] = v.strip()
    return meta, corps


def page(chemin_page, meta, corps):
    profondeur = chemin_page.count("/")
    r = "../" * profondeur
    dossier = chemin_page.rsplit("index.html", 1)[0]
    alt = PL.liens_hreflang(BASE, dossier, LANGUES)
    # en-tête : traductions (langues.js, avant page.js), règles, page commune (+ « tete », ex. pass.js) ; bas de page : les scripts propres à la page (« scripts »)
    tete = ["langues.js", "page.js"] + [s.strip() for s in meta.get("tete", "").split(",") if s.strip()]
    bas = [s.strip() for s in meta.get("scripts", "").split(",") if s.strip()]
    faq = ""
    if meta.get("faq"):
        q = json.load(open(os.path.join(ICI, "gabarits", meta["faq"]), encoding="utf-8"))
        faq = ('<script type="application/ld+json">\n' + json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": a, "acceptedAnswer": {"@type": "Answer", "text": b}} for a, b in q]}, ensure_ascii=False) + "\n</script>\n")
    attr_corps = (" " + meta["corps"]) if meta.get("corps") else ""
    robots = '<meta name="robots" content="noai, noimageai">' if meta.get("index", "oui") == "oui" else '<meta name="robots" content="noindex, noai, noimageai">'
    return f"""<!doctype html>
<html lang="fr" dir="ltr" translate="no" data-racine="{r}" data-chemin="{dossier}" data-fixe>
<head>
<meta charset="utf-8">
<meta name="google" content="notranslate">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<meta name="referrer" content="strict-origin-when-cross-origin">
{robots}
<title>{meta['titre']}</title>
<meta name="description" content="{meta['description']}">
<link rel="canonical" href="{BASE}{chemin_page.rsplit('index.html', 1)[0]}">
{alt}<link rel="icon" href="{r}assets/logo.svg" type="image/svg+xml">
<link rel="manifest" href="{r}manifest.webmanifest">
<link rel="apple-touch-icon" href="{r}assets/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Points d'eau">
<meta name="theme-color" content="#0B6E78">
<meta property="og:title" content="{meta.get('og_titre', meta['titre'])}">
<meta property="og:description" content="{meta.get('og_description', meta['description'])}">
<meta property="og:image" content="{BASE}assets/og-image-v2.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:type" content="website">
<meta property="og:url" content="{BASE}{chemin_page.rsplit('index.html', 1)[0]}">
<meta property="og:site_name" content="Points d'eau Tunisie">
<meta property="og:locale" content="fr_TN">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700;800&family=Noto+Kufi+Arabic:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{r}assets/style.css?v={VERSION}">
{faq}{chr(10).join(f'<script src="{r}assets/{s}?v={VERSION}"></script>' for s in tete)}
</head>
<body{attr_corps}>
<header class="entete" id="entete"></header>
{corps.strip()}
<footer id="pied"></footer>
{"".join(f'<script src="{r}assets/{s}?v={VERSION}"></script>' + chr(10) for s in bas)}<script data-goatcounter="https://prix-eaux-tunisie.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
</body>
</html>
"""


def main():
    dossier = os.path.join(ICI, "gabarits")
    n = 0
    chemins = [""]                # pages proposées à Google (dossier depuis la racine ; « » = accueil)
    for nom in sorted(os.listdir(dossier)):
        if not nom.endswith(".html"):
            continue
        meta, corps = lire_gabarit(os.path.join(dossier, nom))
        chemin = nom[:-5].replace("__", "/") + "/index.html"      # « pass__conditions.html » → pass/conditions/index.html
        dest = os.path.join(RACINE, chemin)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        open(dest, "w", encoding="utf-8", newline="\n").write(page(chemin, meta, corps))
        n += 1
        if meta.get("index", "oui") == "oui":
            chemins.append(chemin.rsplit("index.html", 1)[0])
    # une seule version ?v= pour tout le site (accueil écrit à la main compris) ; même en-tête de langue que les autres pages
    acc = os.path.join(RACINE, "index.html")
    t = open(acc, encoding="utf-8").read()
    t2 = re.sub(r"\?v=\d{8}[a-z]", "?v=" + VERSION, t)
    t2 = re.sub(r'<html lang="fr" dir="ltr" translate="no"[^>]*>', '<html lang="fr" dir="ltr" translate="no" data-racine="" data-chemin="" data-fixe>', t2, count=1)
    t2 = re.sub(r'(?:<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n)+', lambda m: PL.liens_hreflang(BASE, "", LANGUES), t2, count=1)
    if t2 != t:
        open(acc, "w", encoding="utf-8", newline="\n").write(t2)
    # une vraie page par langue, tirée de chaque page française ; plan du site avec toutes les adresses
    trads = PL.lire_traductions(os.path.join(RACINE, "assets", "langues.js"))
    # les 7 langues ajoutées le 13/10/2026 (it, pt, nl, zh, ja, ko, hi) : tools/langues_plus/ ; mêmes textes que assets/langues.js
    plus, ui = langues_plus.charger()
    if set(ui) != set(trads["tr"]):
        raise SystemExit("tools/langues_plus/_francais.json n'a pas les mêmes textes que assets/langues.js : "
                         + " | ".join(sorted(set(trads["tr"]) ^ set(ui))[:5]))
    trads.update(plus)
    # un dictionnaire d'interface PAR langue (assets/l/<langue>.js) : une page de langue ne charge que le sien
    os.makedirs(os.path.join(RACINE, "assets", "l"), exist_ok=True)
    for l in PL.NOUVELLES:
        open(os.path.join(RACINE, "assets", "l", l + ".js"), "w", encoding="utf-8", newline="\n").write(
            "/* GÉNÉRÉ par tools/construire.py (assets/langues.js et tools/langues_plus/) — textes de cette langue, chargés\n"
            "   seulement par les pages de cette langue ; clé = texte français exact. */\n"
            f"window.TRADUCTIONS = window.TRADUCTIONS || {{}};\nwindow.TRADUCTIONS.{l} = "
            + json.dumps(trads[l], ensure_ascii=False, indent=0, sort_keys=True) + ";\n")
    for l in LANGUES[1:]:
        if os.path.isdir(os.path.join(RACINE, l)):
            shutil.rmtree(os.path.join(RACINE, l))
    adresses, manque = [], 0
    for c in chemins:
        fr = open(os.path.join(RACINE, c, "index.html"), encoding="utf-8").read()
        adresses.append(c)
        for l in LANGUES[1:]:
            texte, m = PL.variante(fr, BASE, c, l, LANGUES, trads.get(l, {}))
            dest = os.path.join(RACINE, l, c, "index.html")
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            open(dest, "w", encoding="utf-8", newline="\n").write(texte)
            manque += m
            adresses.append(f"{l}/{c}")
    maj = f"{VERSION[:4]}-{VERSION[4:6]}-{VERSION[6:8]}"        # date de la dernière modification (tirée de VERSION)
    sm = os.path.join(RACINE, "sitemap.xml")
    video = "".join(re.findall(r"  <url><loc>[^<]*/video/[^<]*</loc>.*?</url>\n", open(sm, encoding="utf-8").read())) if os.path.exists(sm) else ""
    open(sm, "w", encoding="utf-8", newline="\n").write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{BASE}{a}</loc><lastmod>{maj}</lastmod></url>\n" for a in adresses) + video + "</urlset>\n")
    print(f"{n} page(s) écrite(s) en {len(LANGUES)} langues ({len(adresses)} adresses), {manque} texte(s) resté(s) en anglais, version {VERSION}")


if __name__ == "__main__":
    sys.exit(main())
