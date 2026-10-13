# -*- coding: utf-8 -*-
"""Une VRAIE page par langue, avec sa propre adresse (visibilité Google, 12/10/2026).

Avant : une seule adresse par page, écrite en français ; les 7 autres langues n'apparaissaient qu'après coup, dans le
navigateur (bouton de langue, « ?lang=ar »). Google ne voyait donc que le français.
Maintenant : tools/construire.py fabrique la page française (adresse d'origine, inchangée), puis ce module en tire
  ar/<page>, en/<page>, tr/<page>, id/<page>, ur/<page>, de/<page>, es/<page>
où tout est DÉJÀ dans la langue : <html lang>, sens d'écriture, titre, description, texte de la page (les éléments
data-l des autres langues sont retirés ; pour tr, id, ur, de, es la traduction — assets/langues.js et assets/trad/*.js,
clé = texte français — est écrite dans la page), adresse officielle (canonical) et liens hreflang entre les 8 versions.
(Module repris du site Mosquées en Tunisie.) Les liens vers les autres pages restent dans le dossier de la langue ; les fichiers communs (assets/, donnees/…)
sont pris à la racine du site. Aucune dépendance : seulement la bibliothèque standard de Python."""
import html, json, os, posixpath, re
from html.parser import HTMLParser

LANGUES = ["fr", "ar", "en", "tr", "id", "ur", "de", "es", "it", "pt", "nl", "zh", "ja", "ko", "hi", "ru", "vi", "th", "tl", "sv", "ro"]
NOUVELLES = ["tr", "id", "ur", "de", "es", "it", "pt", "nl", "zh", "ja", "ko", "hi", "ru", "vi", "th", "tl", "sv", "ro"]
DROITE = ("ar", "ur")
COMMUNS = ("assets/", "donnees/", "manifest.webmanifest", "sw.js", "favicon.ico")      # fichiers pris à la racine du site
SITE = {"fr": "Points d'eau Tunisie", "ar": "نقاط الماء في تونس", "en": "Water Points Tunisia", "tr": "Tunus Su Noktaları", "id": "Titik Air Tunisia",
        "ur": "تیونس کے پانی کے مقامات", "de": "Wasserstellen Tunesien", "es": "Puntos de agua Túnez",
        "it": "Punti d'acqua Tunisia", "pt": "Pontos de água Tunísia", "nl": "Waterpunten Tunesië", "zh": "突尼斯饮水点", "ja": "チュニジアの水場",
        "ko": "튀니지 식수 지점", "hi": "ट्यूनीशिया के जल-स्थल",
        "ru": "Источники воды Туниса", "vi": "Điểm lấy nước ở Tunisia", "th": "แหล่งน้ำในตูนิเซีย",
        "tl": "Mga mapagkukunan ng tubig sa Tunisia", "sv": "Vattenställen i Tunisien", "ro": "Puncte de apă în Tunisia"}
LOCALE = {"ar": "ar_TN", "en": "en_US", "tr": "tr_TR", "id": "id_ID", "ur": "ur_PK", "de": "de_DE", "es": "es_ES",
          "it": "it_IT", "pt": "pt_PT", "nl": "nl_NL", "zh": "zh_CN", "ja": "ja_JP", "ko": "ko_KR", "hi": "hi_IN",
          "ru": "ru_RU", "vi": "vi_VN", "th": "th_TH", "tl": "tl_PH", "sv": "sv_SE", "ro": "ro_RO"}
VIDES = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
ISOLES = re.compile("[⁦-⁩‎‏]")


def adresse(base, chemin, l):
    """Adresse d'une page (chemin = dossier depuis la racine, « » pour l'accueil) dans la langue l."""
    return base + ("" if l == "fr" else l + "/") + chemin


def liens_hreflang(base, chemin, langues):
    """Les mêmes lignes sur les 8 versions d'une page ; x-default = anglais (visiteurs d'une autre langue), sinon français."""
    defaut = "en" if "en" in langues else "fr"
    return ("".join(f'<link rel="alternate" hreflang="{l}" href="{adresse(base, chemin, l)}">\n' for l in LANGUES if l in langues)
            + f'<link rel="alternate" hreflang="x-default" href="{adresse(base, chemin, defaut)}">\n')


# ---------- petit arbre HTML (bibliothèque standard), qui réécrit la page à l'identique sauf ce qu'on change ----------
class Noeud:
    def __init__(self, balise=None, attrs=None, brut="", parent=None):
        self.balise, self.attrs, self.brut, self.parent, self.enfants, self.ferme = balise, list(attrs or []), brut, parent, [], False

    def get(self, nom):
        for k, v in self.attrs:
            if k == nom:
                return v if v is not None else ""
        return None

    def poser(self, nom, valeur):
        if self.get(nom) is None:
            self.attrs.append((nom, valeur))
        else:
            self.attrs = [(k, (valeur if k == nom else v)) for k, v in self.attrs]
        self.brut = "<" + self.balise + "".join(f" {k}" if v is None else f' {k}="{html.escape(v, quote=True)}"' for k, v in self.attrs) + ">"

    def ecrire(self):
        if self.balise is None:
            return self.brut
        return self.brut + "".join(e.ecrire() for e in self.enfants) + (f"</{self.balise}>" if self.ferme else "")

    def dedans(self):
        return "".join(e.ecrire() for e in self.enfants)

    def elements(self):
        return [e for e in self.enfants if e.balise]

    def tous(self):
        for e in self.enfants:
            if e.balise:
                yield e
                yield from e.tous()

    def texte(self):
        if self.balise is None:
            return "" if self.brut.startswith("<!") else html.unescape(self.brut)
        return "".join(e.texte() for e in self.enfants)

    def navigateur(self):
        """Contenu tel que le navigateur le rend (innerHTML) : c'est la clé des traductions de assets/langues.js."""
        out = []
        for e in self.enfants:
            if e.balise is None:
                out.append(e.brut if e.brut.startswith("<!") else html.escape(html.unescape(e.brut), quote=False).replace(" ", "&nbsp;"))
            else:
                out.append("<" + e.balise + "".join(f' {k}="{html.escape(v or "", quote=True).replace(chr(160), "&nbsp;").replace("&#x27;", chr(39))}"' for k, v in e.attrs) + ">")
                if e.balise not in VIDES:
                    out.append(e.navigateur() + f"</{e.balise}>")
        return "".join(out)


class Lecteur(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.racine = Noeud("#racine"); self.ici = self.racine

    def _feuille(self, brut):
        self.ici.enfants.append(Noeud(None, brut=brut, parent=self.ici))

    def handle_starttag(self, tag, attrs):
        n = Noeud(tag, attrs, self.get_starttag_text(), self.ici)
        self.ici.enfants.append(n)
        if tag not in VIDES:
            self.ici = n

    def handle_startendtag(self, tag, attrs):
        self.ici.enfants.append(Noeud(tag, attrs, self.get_starttag_text(), self.ici))

    def handle_endtag(self, tag):
        n = self.ici
        while n is not self.racine and n.balise != tag:
            n = n.parent
        if n is self.racine:
            return                                   # balise fermante sans ouvrante : ignorée
        n.ferme = True
        self.ici = n.parent

    def handle_data(self, data): self._feuille(data)
    def handle_entityref(self, name): self._feuille(f"&{name};")
    def handle_charref(self, name): self._feuille(f"&#{name};")
    def handle_comment(self, data): self._feuille(f"<!--{data}-->")
    def handle_decl(self, decl): self._feuille(f"<!{decl}>")


def lire_arbre(texte):
    p = Lecteur(); p.feed(texte); p.close()
    racine = p.racine; racine.brut = ""; racine.balise = "#racine"
    return racine


def cle(s):
    return re.sub(r"\s+", " ", s).strip()


def lire_traductions(chemin_js):
    """assets/langues.js : { langue: { texte français: traduction } } (une ligne « "clé": "valeur", » par texte)."""
    d, l = {}, None
    ligne = re.compile(r'^\s*("(?:[^"\\]|\\.)*")\s*:\s*("(?:[^"\\]|\\.)*")\s*,?\s*$')
    for t in open(chemin_js, encoding="utf-8").read().splitlines():
        m = re.match(r"\s*window\.TRADUCTIONS\.(\w+)\s*=", t) or re.match(r'\s*"(\w{2})"\s*:\s*\{\s*$', t)
        if m:
            l = m.group(1); d.setdefault(l, {}); continue
        m = ligne.match(t)
        if m and l:
            d[l][json.loads(m.group(1))] = json.loads(m.group(2))
    return d


def filtrer_langue(racine, l, trad):
    """Ne garde que les éléments data-l de la langue (pour tr, id, ur, de, es : l'élément « en », rempli avec la traduction du
    texte français voisin — même règle que traduirePage() de assets/page.js). Renvoie le nombre de textes restés en anglais."""
    garde = l if l in ("fr", "ar", "en") else "en"
    manque = 0
    for parent in [racine] + list(racine.tous()):
        if not any(e.balise and e.get("data-l") is not None for e in parent.enfants):
            continue
        els = parent.elements()
        if l in NOUVELLES:
            for i, en in enumerate(els):
                if en.get("data-l") != "en":
                    continue
                fr = els[i - 2] if i >= 2 else None
                if fr is None or fr.get("data-l") != "fr":
                    continue
                if en.balise == "ul":
                    for li_fr, li_en in zip(fr.elements(), en.elements()):
                        t = trad.get(cle(li_fr.navigateur()))
                        if t:
                            li_en.enfants = [Noeud(None, brut=t, parent=li_en)]
                        else:
                            manque += 1
                else:
                    t = trad.get(cle(fr.navigateur()))
                    if t:
                        en.enfants = [Noeud(None, brut=t, parent=en)]
                    else:
                        manque += 1
        parent.enfants = [e for e in parent.enfants if not (e.balise and e.get("data-l") is not None and e.get("data-l") != garde)]
    return manque


def premier(racine, test):
    for e in racine.tous():
        if test(e):
            return e
    return None


def texte_propre(n, maxi=None):
    t = cle(ISOLES.sub("", n.texte())) if n is not None else ""
    return t[:maxi] if maxi else t


def variante(page_fr, base, chemin, l, langues, trad, meta=None, indexer=True):
    """Page « chemin » (dossier depuis la racine) dans la langue l, tirée de la page française. Renvoie (html, textes sans traduction)."""
    prof = chemin.count("/")                       # « mosquee/kairouan/ » → 2 ; la version de langue est un dossier plus bas
    racine = lire_arbre(page_fr)
    manque = filtrer_langue(racine, l, trad)
    h = premier(racine, lambda e: e.balise == "html")
    h.poser("lang", l); h.poser("dir", "rtl" if l in DROITE else "ltr")
    h.poser("data-racine", "../" * (prof + 1)); h.poser("data-racine-pages", "../" * prof)
    # liens : les fichiers communs à la racine du site, la page vidéo (une seule, avec ?lang=) ; le reste reste dans la langue
    for e in racine.tous():
        for nom in ("href", "src", "poster"):
            u = e.get(nom)
            if not u or re.match(r"^([a-zA-Z][a-zA-Z0-9+.-]*:|//|#|\?)", u) or (e.balise == "link" and e.get("rel") in ("canonical", "alternate")):
                continue
            m = re.match(r"^([^?#]*)(.*)$", u)
            cible = posixpath.normpath(posixpath.join(chemin, m.group(1))) + ("/" if m.group(1).endswith("/") else "")
            cible = "" if cible in (".", "./") else cible
            if cible.startswith(COMMUNS):
                e.poser(nom, "../" * (prof + 1) + cible + m.group(2))
            elif cible.startswith("video/"):
                e.poser(nom, "../" * (prof + 1) + cible + "?lang=" + l + re.sub(r"^\?[^#]*", "", m.group(2)))
    # traductions des versets et hadiths (éléments data-t, une par langue) : on ne garde que celle de la langue de la page
    # (pour l'arabe : aucune, le texte arabe est l'original)
    for parent in [racine] + list(racine.tous()):
        if any(e.balise and e.get("data-t") is not None for e in parent.enfants):
            parent.enfants = [e for e in parent.enfants if not (e.balise and e.get("data-t") is not None and e.get("data-t") != l)]
    # dictionnaires : une page de langue ne charge que le sien (assets/l/<langue>.js) ; l'arabe et l'anglais sont écrits dans la
    # page (aucun dictionnaire)
    for parent in [racine] + list(racine.tous()):
        garder = []
        for e in parent.enfants:
            src = (e.get("src") or "") if e.balise == "script" else ""
            if "assets/langues.js" in src and l not in NOUVELLES:
                if garder and garder[-1].balise is None and not garder[-1].brut.strip():
                    garder.pop()                    # le saut de ligne qui précédait la balise retirée
                continue
            if "assets/langues.js" in src:
                e.poser("src", src.replace("assets/langues.js", f"assets/l/{l}.js"))
            garder.append(e)
        parent.enfants = garder
    # titre, description, aperçu de partage
    tete = premier(racine, lambda e: e.balise == "head")
    h1 = premier(racine, lambda e: e.balise == "h1")
    intro = premier(racine, lambda e: e.balise == "p" and "intro" in (e.get("class") or "").split())
    titre, desc, og = (tuple(meta or ()) + (None, None, None))[:3]
    titre = titre or (texte_propre(h1) + " | " + SITE[l])
    desc = cle(desc or texte_propre(intro) or titre)[:200]
    og = og or titre
    for e in tete.tous():
        if e.balise == "title":
            e.enfants = [Noeud(None, brut=html.escape(titre, quote=False), parent=e)]
        elif e.balise == "meta" and e.get("name") == "description":
            e.poser("content", desc)
        elif e.balise == "meta" and e.get("property") == "og:title":
            e.poser("content", og)
        elif e.balise == "meta" and e.get("property") == "og:description":
            e.poser("content", desc)
        elif e.balise == "meta" and e.get("property") == "og:url":
            e.poser("content", adresse(base, chemin, l))
        elif e.balise == "meta" and e.get("property") == "og:locale":
            e.poser("content", LOCALE.get(l, "fr_TN"))
        elif e.balise == "link" and e.get("rel") == "canonical":
            e.poser("href", adresse(base, chemin, l))
        elif e.balise == "meta" and e.get("name") == "robots" and not indexer:
            e.poser("content", "noindex, " + (e.get("content") or "").replace("noindex, ", ""))
    sortie = racine.ecrire()
    # mêmes liens hreflang que la page française (déjà au bon format) : rien à changer ; version sans contenu propre : pas de lien
    if not indexer:
        sortie = re.sub(r'<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n', "", sortie)
    return sortie, manque
