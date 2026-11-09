#!/usr/bin/env python3
"""
Luminathèque — pages pré-remplies pour les adresses partageables (exécuté par Render au déploiement).

Usage : python3 scripts/build_pages.py [--sortie DOSSIER]

Le site est une application d'une seule page (index.html) : toute adresse sans fichier, comme
/mucite-orale/publications, est réécrite vers index.html par Render (render.yaml, routes). Pour que les
liens partagés (WhatsApp, mail, réseaux) et les moteurs de recherche voient le bon titre, la bonne
description et le contenu, ce script écrit une copie d'index.html par adresse importante, avec :
  • <title>, description, balises Open Graph et Twitter, adresse canonique ;
  • un résumé lisible sans JavaScript dans <main> (remplacé par l'application dès son démarrage).
Adresses : /<thème> et /<thème>/{publications,syntheses,essais,parametres}, /article/<PMID> (fiches
rédigées), /appareils[/<id>], /patients[/<id>], /methode, /comparer ; plus sitemap.xml et robots.txt.

Les fichiers produits ne sont pas versionnés (.gitignore) : ils sont recréés à chaque déploiement à partir
d'index.html et des données générées par build_site.py. Compatible Python 3.8+ et sans dépendance.
"""
import argparse
import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://luminatheque.onrender.com"
E = lambda s: html.escape(str(s or ""), quote=True)
TYPES = {"umbrella": "Revue de revues", "ma": "Méta-analyse", "sr": "Revue systématique", "guideline": "Recommandation",
         "rct": "Essai randomisé", "nrct": "Essai non randomisé", "cohort": "Cohorte", "cases": "Série de cas",
         "review": "Revue narrative", "preclinical": "Préclinique", "protocol": "Protocole", "survey": "Enquête",
         "qualitative": "Étude qualitative", "biblio": "Bibliométrie", "methodo": "Méthodologie", "letter": "Lettre"}
EFFECT = {"favorable": "Favorable à la PBM", "neutre": "Pas de différence", "mitigé": "Résultats mitigés", "défavorable": "Défavorable"}
VIEWS = {"publications": "Publications", "syntheses": "Synthèses", "essais": "Études en cours", "parametres": "Paramètres"}


def payload(path):
    s = path.read_text(encoding="utf-8")
    m = re.search(r"=\s*([\[{])", s)
    return json.loads(s[m.start(1):].rstrip().rstrip(";"))


def short(txt, n=200):
    txt = re.sub(r"\s+", " ", str(txt or "")).strip()
    return txt if len(txt) <= n else txt[: n - 1].rsplit(" ", 1)[0] + "…"


class Pages:
    def __init__(self, out):
        self.out = out
        self.tpl = (ROOT / "index.html").read_text(encoding="utf-8")
        m = re.search(r'src="(assets/dist/logo\.[0-9a-f]+\.png)"', self.tpl)
        self.image = SITE + "/" + (m.group(1) if m else "assets/logo.png")
        self.urls = []

    def write(self, path, title, desc, body, kind="website"):
        url = SITE + path
        head = (f"<title>{E(title)}</title>\n<meta name=\"description\" content=\"{E(desc)}\">\n"
                f"<link rel=\"canonical\" href=\"{E(url)}\">\n"
                f"<meta property=\"og:site_name\" content=\"Luminathèque\">\n<meta property=\"og:locale\" content=\"fr_FR\">\n"
                f"<meta property=\"og:type\" content=\"{kind}\">\n<meta property=\"og:title\" content=\"{E(title)}\">\n"
                f"<meta property=\"og:description\" content=\"{E(desc)}\">\n<meta property=\"og:url\" content=\"{E(url)}\">\n"
                f"<meta property=\"og:image\" content=\"{E(self.image)}\">\n<meta name=\"twitter:card\" content=\"summary\">\n"
                f"<meta name=\"twitter:title\" content=\"{E(title)}\">\n<meta name=\"twitter:description\" content=\"{E(desc)}\">")
        base = re.sub(r'<meta (name="description"|property="og:[a-z_]+"|name="twitter:[a-z]+")[^>]*>\n?|<link rel="canonical"[^>]*>\n?', "", self.tpl)
        page = re.sub(r"<title>.*?</title>", lambda _: head, base, count=1, flags=re.S)
        page = re.sub(r'(<main class="wrap" id="app" tabindex="-1">).*?(</main>)',
                      lambda m: m.group(1) + f'<div class="view prerender">{body}</div>' + m.group(2), page, count=1, flags=re.S)
        f = self.out / "p" / path.strip("/") / "index.html"
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(page, encoding="utf-8")
        self.urls.append(url)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sortie", default=str(ROOT))
    out = pathlib.Path(ap.parse_args().sortie)
    D = payload(ROOT / "assets/data.js")
    pg = Pages(out)
    topics = [t for t in D["topics"] if t.get("file")]
    labels = {t["id"]: t["label"] for t in topics}
    n_art = 0
    seen = set()
    for t in topics:
        syn = (D.get("syntheses", {}).get(t["id"]) or {}).get("global") or {}
        intro = f"<p>{E(t.get('description'))}</p>"
        stats = f"<p>{t.get('n', 0)} publications indexées depuis 2000, dont {t.get('n_curated', 0)} fiches rédigées en trois niveaux de lecture.</p>"
        low = t["label"] if t["label"].isupper() else t["label"].lower()
        pg.write(f"/{t['id']}", f"Photobiomodulation et {low} · Luminathèque",
                 short(f"Veille scientifique sur la photobiomodulation en {t['label'].lower()} : {t.get('n', 0)} publications, {t.get('n_curated', 0)} fiches rédigées, synthèses, essais en cours et paramètres."),
                 f"<h1>Photobiomodulation · {E(t['label'])}</h1>{intro}{stats}" + (f"<h2>{E(syn.get('headline'))}</h2><p>{E(syn.get('l1'))}</p>" if syn else ""))
        for v, lab in VIEWS.items():
            desc = {"publications": f"Les {t.get('n', 0)} publications sur la photobiomodulation en {t['label'].lower()}, classées par type d'étude, niveau de preuve et résultat.",
                    "syntheses": syn.get("l1") or f"Synthèses de la littérature sur la photobiomodulation en {t['label'].lower()}.",
                    "essais": f"Essais cliniques de photobiomodulation en cours ou en construction en {t['label'].lower()} : promoteurs, investigateurs, pays.",
                    "parametres": f"Paramètres de photobiomodulation en {t['label'].lower()} : longueur d'onde, dose, zone, séances, recommandations AFSOS, WALT et MASCC."}[v]
            pg.write(f"/{t['id']}/{v}", f"{lab} · {t['label']} · Luminathèque", short(desc), f"<h1>{E(lab)} · {E(t['label'])}</h1><p>{E(desc)}</p>")
        for a in payload(ROOT / t["file"]):
            if a["pmid"] in seen:
                continue
            seen.add(a["pmid"])
            if not a.get("curated"):
                pg.write(f"/article/{a['pmid']}", f"{a['title']} · Luminathèque", short(a.get("l1") or a["title"], 220),
                         f"<p class=\"eyebrow\">{E(labels.get(t['id']))} · {E(a.get('journal_abbr'))} {E(a.get('year'))} · PMID {E(a['pmid'])}</p><h1 lang=\"en\">{E(a['title'])}</h1>"
                         f"<p lang=\"en\">{E(a.get('l1'))}</p><p><a href=\"https://pubmed.ncbi.nlm.nih.gov/{E(a['pmid'])}/\">Voir sur PubMed</a></p>", kind="article")
                continue
            meta = " · ".join(x for x in [TYPES.get(a.get("type"), ""), f"niveau de preuve {a['level']}" if a.get("level") else "",
                                           EFFECT.get(a.get("effect"), ""), f"{a.get('journal_abbr') or ''} {a.get('year', '')}".strip(), f"PMID {a['pmid']}"] if x)
            l2 = "".join(f"<p>{E(p)}</p>" for p in str(a.get("l2") or "").split("\n\n") if p.strip())
            pg.write(f"/article/{a['pmid']}", f"{a.get('title_fr') or a['title']} · Luminathèque", short(a.get("l1") or a.get("title_fr"), 220),
                     f"<p class=\"eyebrow\">{E(labels.get(t['id']))} · {E(meta)}</p><h1>{E(a.get('title_fr'))}</h1><p lang=\"en\"><i>{E(a.get('title'))}</i></p>"
                     f"<p><b>{E(a.get('l1'))}</b></p>{l2}<p><a href=\"https://pubmed.ncbi.nlm.nih.gov/{E(a['pmid'])}/\">Voir sur PubMed</a></p>", kind="article")
            n_art += 1
    # appareils
    if D.get("devices_file"):
        devs = payload(ROOT / D["devices_file"])
        pg.write("/appareils", "Recherche par appareil · Luminathèque", "Études et essais de photobiomodulation par type d'appareil (laser, LED, casque, cabine corps entier…) et par marque.",
                 "<h1>Recherche par appareil</h1><ul>" + "".join(f"<li><a href=\"/appareils/{E(d['id'])}\">{E(d['nom'])}</a></li>" for d in devs) + "</ul>")
        for d in devs:
            pg.write(f"/appareils/{d['id']}", f"{d['nom']} · Appareils · Luminathèque", short(d.get("description")),
                     f"<h1>{E(d['nom'])}</h1><p>{E(d.get('fabricant'))}</p><p>{E(d.get('description'))}</p><p>{E(d.get('lumiere'))} · {d.get('n', 0)} études, {d.get('nc', 0)} fiches.</p>")
    # fiches patients
    pts = D.get("patients") or []
    pg.write("/patients", "Fiches patients · Luminathèque", "Fiches illustrées pour expliquer la photobiomodulation aux patients : séance, calendrier, niveau de preuve, sécurité.",
             "<h1>Fiches patients</h1><ul>" + "".join(f"<li><a href=\"/patients/{E(f['id'])}\">{E(f['titre'])}</a></li>" for f in pts) + "</ul>")
    for f in pts:
        msgs = "".join(f"<li>{E(m[1])}</li>" for m in f.get("messages", []))
        pg.write(f"/patients/{f['id']}", f"{f['titre']} · Fiche patient · Luminathèque", short(f.get("sous_titre") + " — " + " ".join(m[1] for m in f.get("messages", []))),
                 f"<h1>{E(f['titre'])}</h1><p>{E(f.get('sous_titre'))}</p><ul>{msgs}</ul>")
    for v, lab in (("alertes", "Alertes par mail"), ("brouillons", "Brouillons"), ("parametres", "Paramètres"), ("publications", "Publications"), ("syntheses", "Synthèses"), ("essais", "Études en cours")):
        pg.write(f"/{v}", f"{lab} · Luminathèque", "Luminathèque, veille scientifique sur la photobiomodulation.", f"<h1>{E(lab)}</h1>")
    sec = D.get("securite") or {}
    pg.write("/securite", "Sécurité, contre-indications et médicolégal · Luminathèque",
             "Contre-indications de la photobiomodulation, protection oculaire EN 207, médicaments photosensibilisants (risque réel en rouge et infrarouge), cadre médicolégal, consentement et traçabilité.",
             "<h1>Sécurité, contre-indications et médicolégal</h1>" + "".join(f"<h2>{E(c['titre'])}</h2><p>{E(c['regle'])}</p>" for c in sec.get("contre_indications", [])))
    pg.write("/securite/consentement", "Consentement éclairé à la photobiomodulation · Luminathèque", "Modèle de consentement éclairé à la photobiomodulation, avec questionnaire de sécurité, à imprimer ou télécharger.", "<h1>Consentement éclairé à la photobiomodulation</h1>")
    pg.write("/securite/tracabilite", "Fiche de traçabilité des séances de photobiomodulation · Luminathèque", "Modèle de fiche de traçabilité des paramètres délivrés (longueur d'onde, puissance, énergie, fluence), avec calcul automatique.", "<h1>Fiche de traçabilité</h1>")
    pg.write("/methode", "Méthode · Luminathèque", "Sources, sélection des études, niveaux de preuve et rédaction des fiches de Luminathèque.", "<h1>Méthode</h1>")
    pg.write("/comparer", "Comparateur · Luminathèque", "Comparer deux périodes ou une sélection d'études sur la photobiomodulation.", "<h1>Comparateur</h1>")
    (out / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                     + "".join(f"<url><loc>{E(u)}</loc><lastmod>{D['generated']}</lastmod></url>\n" for u in [SITE + "/"] + [u for u in pg.urls if not re.search(r"/(alertes|brouillons|parametres|publications|syntheses|essais)$", u)]) + "</urlset>\n", encoding="utf-8")
    (out / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /alertes\nDisallow: /brouillons\nSitemap: {SITE}/sitemap.xml\n", encoding="utf-8")
    print(f"{len(pg.urls)} pages pré-remplies (dont {n_art} fiches rédigées) et sitemap.xml")


if __name__ == "__main__":
    main()
