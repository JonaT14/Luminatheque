#!/usr/bin/env python3
"""
Luminathèque — envoi des lettres d'alerte personnalisées.

Usage :
  python3 alertes/envoi.py                 envoie à chaque abonné actif dont l'envoi est dû
  python3 alertes/envoi.py --essai DIR     n'envoie rien : écrit les lettres en HTML dans DIR
  python3 alertes/envoi.py --seulement a@b.fr [--forcer]
  python3 alertes/envoi.py --apercu "1;h;5;fne;de,od" --depuis 2026-10-01 > lettre.html

Lancé chaque lundi par GitHub Actions (.github/workflows/alertes.yml), après la veille hebdomadaire.
Contenu d'une lettre : ce qui est arrivé sur le site depuis le dernier envoi à cet abonné (data/suivi.json) :
  • fiches rédigées (f) ;
  • nouvelles publications indexées (n), filtrées par niveau de preuve ;
  • essais cliniques (e) : nouveaux essais déclarés et changements de statut.
Hebdomadaire : chaque lundi. Mensuelle : le premier lundi du mois (ou plus de 27 jours après le dernier envoi).
Aucune lettre n'est envoyée s'il n'y a rien de nouveau.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import commun as C  # noqa: E402

ROOT = C.ROOT
TYPES = {"umbrella": "Revue de revues", "ma": "Méta-analyse", "sr": "Revue systématique", "guideline": "Recommandation",
         "rct": "Essai randomisé", "nrct": "Essai non randomisé", "cohort": "Cohorte", "cases": "Série de cas",
         "review": "Revue narrative", "preclinical": "Préclinique", "protocol": "Protocole", "survey": "Enquête",
         "qualitative": "Qualitative", "biblio": "Bibliométrie", "methodo": "Méthodologie", "letter": "Lettre", "autre": "Publication"}
COUNTRY = {"India": "Inde", "Egypt": "Égypte", "Brazil": "Brésil", "United States": "États-Unis", "China": "Chine", "Iran (Islamic Republic of)": "Iran", "Iran": "Iran",
           "Turkey (Türkiye)": "Turquie", "Turkey": "Turquie", "Italy": "Italie", "Spain": "Espagne", "Germany": "Allemagne", "United Kingdom": "Royaume-Uni",
           "Australia": "Australie", "Korea, Republic of": "Corée du Sud", "South Korea": "Corée du Sud", "Japan": "Japon", "Thailand": "Thaïlande",
           "Saudi Arabia": "Arabie saoudite", "Pakistan": "Pakistan", "Syria": "Syrie", "Belgium": "Belgique", "Netherlands": "Pays-Bas", "Canada": "Canada", "France": "France"}
EFFECT = {"favorable": ("Favorable à la PBM", "#2b8a3e"), "neutre": ("Pas de différence", "#868e96"),
          "mitigé": ("Résultats mitigés", "#e67700"), "défavorable": ("Défavorable", "#c92a2a")}
STATUS = {"RECRUITING": "recrute", "ENROLLING_BY_INVITATION": "inclusions sur invitation", "ACTIVE_NOT_RECRUITING": "en cours, inclusions closes",
          "NOT_YET_RECRUITING": "pas encore ouvert"}


def js_payload(path: pathlib.Path):
    """Lit un fichier généré par build_site.py (« window.X = {…}; » ou « (…)["thème"] = […]; »)."""
    s = path.read_text()
    m = re.search(r"=\s*([\[{])", s)
    return json.loads(s[m.start(1):].rstrip().rstrip(";"))


def load() -> dict:
    data = js_payload(ROOT / "assets/data.js")
    arts = {}
    for t in data["topics"]:
        if not t.get("file"):
            continue
        for a in js_payload(ROOT / t["file"]):
            a.setdefault("title_fr", a["title"]); a.setdefault("curated", False); a.setdefault("ctx", []); a["topic"] = t["id"]
            arts[f"{t['id']}:{a['pmid']}"] = a
    trials = {}
    if data.get("trials_file"):
        for tp, xs in js_payload(ROOT / data["trials_file"])["by_topic"].items():
            for x in xs:
                trials[x["nct"]] = x | {"topic": tp}
    return {"topics": {t["id"]: t for t in data["topics"]}, "arts": arts, "trials": trials,
            "suivi": json.loads((ROOT / "data/suivi.json").read_text())}


def select(db: dict, prefs: dict, since: str) -> dict:
    """Nouveautés arrivées strictement après `since`, selon les préférences, groupées par thème."""
    sv, out = db["suivi"], {}

    def wanted(topic: str, ctx: list) -> bool:
        if topic not in prefs["topics"]:
            return False
        subs = prefs["topics"][topic]
        return not subs or bool(set(subs) & set(ctx or []))

    if "f" in prefs["content"]:
        for k, d in sv["fiches"].items():
            a = db["arts"].get(k)
            if d > since and a and a["curated"] and wanted(a["topic"], a["ctx"]):
                out.setdefault(a["topic"], {"f": [], "n": [], "e": []})["f"].append(a)
    if "n" in prefs["content"]:
        for k, d in sv["notices"].items():
            a = db["arts"].get(k)
            if d > since and a and not a["curated"] and wanted(a["topic"], a["ctx"]) and (prefs["level"] >= 5 or 0 < a.get("level", 0) <= prefs["level"]):
                out.setdefault(a["topic"], {"f": [], "n": [], "e": []})["n"].append(a)
    if "e" in prefs["content"]:
        for k, e in sv["essais"].items():
            x = db["trials"].get(k)
            if not x or not wanted(x["topic"], [x.get("ctx")]):
                continue
            if e["vu"] > since:
                out.setdefault(x["topic"], {"f": [], "n": [], "e": []})["e"].append((x, "nouveau", None))
            elif e["statuts"][-1][0] > since and len(e["statuts"]) > 1:
                out.setdefault(x["topic"], {"f": [], "n": [], "e": []})["e"].append((x, "statut", e["statuts"][-2][1]))
    for v in out.values():
        v["f"].sort(key=lambda a: (a.get("level") or 9, a["date"]))
        v["n"].sort(key=lambda a: (a.get("level") or 9, a["date"]))
    return out


def render(db: dict, email: str, prefs: dict, news: dict, since: str) -> tuple[str, str, str]:
    E = C.E
    nf = sum(len(v["f"]) for v in news.values()); nn = sum(len(v["n"]) for v in news.values()); ne = sum(len(v["e"]) for v in news.values())
    parts = [f"{nf} fiche{'s' * (nf > 1)} rédigée{'s' * (nf > 1)}" if nf else "", f"{nn} publication{'s' * (nn > 1)}" if nn else "",
             f"{ne} essai{'s' * (ne > 1)}" if ne else ""]
    resume = " · ".join(p for p in parts if p)
    period = f"depuis le {dt.date.fromisoformat(since).strftime('%d/%m/%Y')}"
    blocks, text = [], [f"Luminathèque — vos alertes {period}", resume, ""]
    for tp in sorted(news, key=lambda t: db["topics"][t]["label"]):
        v, t = news[tp], db["topics"][tp]
        color = t.get("color") or C.ACCENT
        h = [f'<tr><td style="padding:22px 0 6px"><div style="font:700 19px/1.25 Georgia,serif;border-left:4px solid {color};padding-left:10px">{E(t["label"])}</div></td></tr>']
        text.append(f"== {t['label']} ==")
        if v["f"]:
            h.append(f'<tr><td style="font:600 11px/1.4 Helvetica,Arial;letter-spacing:.12em;text-transform:uppercase;color:{C.MUTED};padding:10px 0 4px">Fiches rédigées</td></tr>')
            for a in v["f"][:25]:
                ef = EFFECT.get(a.get("effect"))
                h.append(f'''<tr><td style="padding:8px 0;border-bottom:1px solid {C.LINE}">
<a href="{C.SITE_URL}/article/{a['pmid']}" style="font:600 15px/1.35 Helvetica,Arial;color:{C.INK};text-decoration:none">{E(a['title_fr'])}</a>
<div style="font:12px/1.5 Helvetica,Arial;color:{C.MUTED};margin-top:3px">{E(TYPES.get(a['type'], a['type']))} · {E(a.get('journal_abbr') or '')} {a['year']}{f' · <span style="color:{ef[1]};font-weight:600">{E(ef[0])}</span>' if ef else ''}</div>
<div style="font:14px/1.5 Helvetica,Arial;color:#3b382f;margin-top:4px">{E(a.get('l1') or '')}</div></td></tr>''')
                text.append(f"- {a['title_fr']} ({TYPES.get(a['type'], a['type'])}) {C.SITE_URL}/article/{a['pmid']}")
            if len(v["f"]) > 25:
                h.append(f'<tr><td style="font:13px Helvetica,Arial;color:{C.MUTED};padding:6px 0">… et {len(v["f"]) - 25} autres fiches sur le site.</td></tr>')
        if v["n"]:
            h.append(f'<tr><td style="font:600 11px/1.4 Helvetica,Arial;letter-spacing:.12em;text-transform:uppercase;color:{C.MUTED};padding:14px 0 4px">Nouvelles publications</td></tr>')
            for a in v["n"][:30]:
                h.append(f'''<tr><td style="padding:6px 0;border-bottom:1px solid {C.LINE}"><a href="{C.SITE_URL}/article/{a['pmid']}" lang="en" style="font:14px/1.4 Helvetica,Arial;color:{C.INK};text-decoration:none">{E(a['title'])}</a>
<div style="font:12px/1.5 Helvetica,Arial;color:{C.MUTED}">{E(TYPES.get(a.get('type'), 'Publication'))} · {E(a.get('journal_abbr') or '')} {a['year']}</div></td></tr>''')
                text.append(f"- {a['title']} {C.SITE_URL}/article/{a['pmid']}")
            if len(v["n"]) > 30:
                h.append(f'<tr><td style="font:13px Helvetica,Arial;color:{C.MUTED};padding:6px 0">… et {len(v["n"]) - 30} autres publications sur le site.</td></tr>')
        if v["e"]:
            h.append(f'<tr><td style="font:600 11px/1.4 Helvetica,Arial;letter-spacing:.12em;text-transform:uppercase;color:{C.MUTED};padding:14px 0 4px">Essais cliniques</td></tr>')
            for x, kind, prev in v["e"][:20]:
                what = "Nouvel essai déclaré" if kind == "nouveau" else f"Statut : {STATUS.get(prev, prev)} → {STATUS.get(x['status'], x['status'])}"
                h.append(f'''<tr><td style="padding:6px 0;border-bottom:1px solid {C.LINE}"><a href="{E(x.get('url') or '')}" style="font:14px/1.4 Helvetica,Arial;color:{C.INK};text-decoration:none">{E(x['titre'])}</a>
<div style="font:12px/1.5 Helvetica,Arial;color:{C.MUTED}">{E(what)} · {E(x.get('registry') or '')} {E(x['nct'])}{' · ' + E(', '.join(COUNTRY.get(c, c) for c in x.get('countries') or [])) if x.get('countries') else ''}</div></td></tr>''')
                text.append(f"- {x['titre']} ({what}) {x.get('url') or ''}")
        blocks.append("".join(h)); text.append("")
    inner = f"""<h1 style="font:700 24px/1.2 Georgia,serif;margin:6px 0 4px">Vos alertes {E(period)}</h1>
<p style="color:{C.MUTED};margin:0 0 6px">{E(resume)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{''.join(blocks)}</table>
<p style="margin:26px 0 4px">{C.button(C.SITE_URL + '/', 'Ouvrir Luminathèque')}</p>"""
    footer = (f'Vous recevez cette lettre car vous êtes abonné aux alertes ({E(C.describe_prefs(prefs))}).<br>'
              f'<a href="{E(C.manage_url(email))}" style="color:{C.MUTED}">Modifier mes alertes</a> · '
              f'<a href="{E(C.unsubscribe_url(email))}" style="color:{C.MUTED}">Me désabonner</a>')
    text += [f"Modifier mes alertes : {C.manage_url(email)}", f"Me désabonner : {C.unsubscribe_url(email)}"]
    subject = f"Luminathèque · {resume}"
    return subject, C.layout(subject, inner, footer, preheader=resume), "\n".join(text)


def due(prefs: dict, last: str | None, today: dt.date) -> bool:
    if not last:
        return True
    gap = (today - dt.date.fromisoformat(last)).days
    return gap >= 6 if prefs["freq"] == "h" else (gap >= 27 or (today.day <= 7 and gap >= 20))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--essai", help="dossier où écrire les lettres sans rien envoyer")
    ap.add_argument("--seulement", help="n'envoyer qu'à cette adresse")
    ap.add_argument("--forcer", action="store_true", help="ignorer la fréquence (envoyer même si l'envoi n'est pas dû)")
    ap.add_argument("--apercu", help="préférences : écrit la lettre correspondante sur la sortie standard")
    ap.add_argument("--depuis", help="date de début (AAAA-MM-JJ) pour --apercu ou un premier envoi")
    args = ap.parse_args()
    db, today = load(), dt.date.today()
    if args.apercu:
        prefs = C.parse_prefs(args.apercu)
        since = args.depuis or (today - dt.timedelta(days=7 if prefs["freq"] == "h" else 30)).isoformat()
        print(render(db, "apercu@example.org", prefs, select(db, prefs, since), since)[1]); return
    st = C.store()
    subs = st.active()
    if args.seulement:
        subs = [s for s in subs if s["email"] == C.norm(args.seulement)]
    sent = skipped = empty = 0
    for s in subs:
        try:
            prefs = C.parse_prefs(s["LUMINA_PREFS"])
        except ValueError:
            print(f"  préférences illisibles : {s['email']}"); continue
        if not args.forcer and not due(prefs, s.get("LUMINA_ENVOI"), today):
            skipped += 1; continue
        since = s.get("LUMINA_ENVOI") or args.depuis or max(s.get("LUMINA_DATE") or "", (today - dt.timedelta(days=7 if prefs["freq"] == "h" else 30)).isoformat())
        news = select(db, prefs, since)
        if not news:
            empty += 1; continue
        subject, html_body, text_body = render(db, s["email"], prefs, news, since)
        if args.essai:
            out = pathlib.Path(args.essai); out.mkdir(parents=True, exist_ok=True)
            (out / (re.sub(r"[^a-z0-9]+", "_", s["email"]) + ".html")).write_text(html_body)
        else:
            C.send(s["email"], subject, html_body, text_body, unsubscribe=C.unsubscribe_url(s["email"]))
            st.put(s["email"], LUMINA_ENVOI=today.isoformat())
        sent += 1
    print(f"{len(subs)} abonnés actifs : {sent} lettre(s) {'écrite(s)' if args.essai else 'envoyée(s)'}, "
          f"{skipped} pas encore dues, {empty} sans nouveauté")


if __name__ == "__main__":
    main()
