"""Icône du site « Points d'eau Tunisie » — même famille que les autres sites d'Ahmed : un symbole fort en aplats
2-3 tons + accent doré #F2B33D, sans texte ni brillance. Un repère de carte avec une goutte d'eau + un point doré.
  python tools/icone.py   → assets/logo.svg, assets/icons/*.png, assets/apple-touch-icon.png, favicon.ico
Rendu avec Edge sans écran (comme « icones des sites - generateur.py »)."""
import os, subprocess, sys
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__)); RACINE = os.path.dirname(ICI)
EDGE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"  # Chrome : Edge sans écran ne rend plus d'image sur ce PC
GOLD, GOLD_D = "#F2B33D", "#D9952A"
FOND = ("#16A2AE", "#08525A")

GLYPHE = f"""
<!-- repère de carte -->
<path d="M256 74C170 74 104 140 104 226c0 112 152 214 152 214s152-102 152-214C408 140 342 74 256 74Z" fill="#FFFFFF"/>
<path d="M256 74c86 0 152 66 152 152 0 112-152 214-152 214Z" fill="#D7EEF0"/>
<!-- goutte d'eau dans le repère -->
<path d="M256 140s-58 70-58 112a58 58 0 0 0 116 0c0-42-58-112-58-112Z" fill="#1597A3"/>
<path d="M256 140s58 70 58 112a58 58 0 0 1-58 58Z" fill="#0B6E78"/>
<!-- sol doré (le lieu) -->
<ellipse cx="256" cy="452" rx="92" ry="20" fill="{GOLD}"/>
<ellipse cx="300" cy="452" rx="48" ry="14" fill="{GOLD_D}"/>"""


def svg(mode):
    defs = f'<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{FOND[0]}"/><stop offset="1" stop-color="{FOND[1]}"/></linearGradient>'
    if mode == "rounded":
        corps = f'<rect width="512" height="512" rx="112" fill="url(#bg)"/><g transform="translate(0 24)">{GLYPHE}</g>'
    else:  # carré plein, symbole réduit dans la zone sûre des icônes adaptatives (Android)
        corps = f'<rect width="512" height="512" fill="url(#bg)"/><g transform="translate(256 268) scale(.74) translate(-256 -256)">{GLYPHE}</g>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>{defs}</defs>{corps}</svg>'


def rendre(texte, png, taille=1024):
    html = os.path.splitext(png)[0] + "_r.html"
    open(html, "w", encoding="utf-8").write('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent;overflow:hidden}svg{width:%dpx;height:%dpx;display:block}</style></head><body>%s</body></html>' % (taille, taille, texte))
    subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--default-background-color=00000000",
                    f"--window-size={taille},{taille}", f"--screenshot={png}", "file:///" + html.replace("\\", "/")],
                   check=True, capture_output=True, timeout=90)
    os.remove(html)
    Image.open(png).convert("RGBA").crop((0, 0, taille, taille)).save(png)


if __name__ == "__main__":
    a = os.path.join(RACINE, "assets"); ic = os.path.join(a, "icons"); os.makedirs(ic, exist_ok=True)
    open(os.path.join(a, "logo.svg"), "w", encoding="utf-8", newline="\n").write(svg("rounded"))
    tmp = os.path.join(ICI, "_icone")
    os.makedirs(tmp, exist_ok=True)
    r, p = os.path.join(tmp, "r.png"), os.path.join(tmp, "p.png")
    rendre(svg("rounded"), r); rendre(svg("full"), p)
    R, P = Image.open(r), Image.open(p)
    R.resize((192, 192), Image.LANCZOS).save(os.path.join(ic, "icon-192.png"), optimize=True)
    R.resize((512, 512), Image.LANCZOS).save(os.path.join(ic, "icon-512.png"), optimize=True)
    P.resize((512, 512), Image.LANCZOS).save(os.path.join(ic, "icon-maskable-512.png"), optimize=True)
    P.convert("RGB").resize((180, 180), Image.LANCZOS).save(os.path.join(a, "apple-touch-icon.png"), optimize=True)
    R.resize((64, 64), Image.LANCZOS).save(os.path.join(RACINE, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    R.resize((240, 240), Image.LANCZOS).save(os.path.join(tmp, "apercu.png"))
    print("ok", tmp)
