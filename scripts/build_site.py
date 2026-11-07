#!/usr/bin/env python3
"""
Assemble les données du site.

Entrées : data/topics/<thème>.json (requête, sous-groupes), data/raw/<thème>.json (notices PubMed + Europe PMC),
data/curation/<thème>/*.json (fiches rédigées en 3 niveaux, exclusions, synthèses).

Sorties :
  assets/data.js                 thèmes (avec compteurs) + synthèses — petit, chargé au démarrage
  assets/topics/<thème>.js       notices du thème — chargé à la demande par le site
  assets/abs/<thème>/<nn>.json   résumés des notices non encore analysées — chargés à l'ouverture d'une fiche

Deux sortes de notices :
  • fiches rédigées (curated) : analyse en 3 niveaux, niveau de preuve, effet, paramètres ;
  • notices indexées : tout le reste depuis 2000, classées automatiquement (type d'étude d'après PubMed,
    niveau de preuve indicatif, sous-groupe d'après le titre et les mots-clés), avec la conclusion des auteurs.

Usage : python3 scripts/build_site.py [--prune-pdfs]
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
N_CHUNKS = 40

# sous-groupes détectés automatiquement (titre + mots-clés + MeSH, en minuscules)
SUBGROUP_RULES = {
    "mucite-orale": [("ORL", r"head and neck|radiotherap|radiation|nasopharyn|oral cancer|oropharyn"),
                     ("CSH", r"stem cell|hematopoietic|haematopoietic|transplant|bone marrow"),
                     ("chimio", r"chemotherap|methotrexate|leuk|lymphoma|5-fluorouracil|myeloma")],
    "neuropathie-peripherique": [("CIPN", r"chemotherapy-induced|paclitaxel|oxaliplatin|cisplatin|vincristine|bortezomib"),
                                 ("diabète", r"diabet"),
                                 ("compression", r"carpal|cubital|ulnar|entrapment|meralgia|tarsal tunnel"),
                                 ("orofaciale", r"trigemin|alveolar nerve|lingual nerve|facial (nerve|palsy|paralysis)|bell'?s|burning mouth|paresthesia|orofacial"),
                                 ("lésion nerveuse", r"nerve injur|sciatic|crush|nerve regenerat|nerve repair|axonal|neurotmesis|constriction")],
    "gynecologie": [("GSM", r"menopaus|genitourinary|vaginal atrophy|vulvovaginal atrophy|incontinence|overactive bladder|vaginal dryness"),
                    ("onco", r"cancer|radiotherap|carcinoma|mastectomy|breast"),
                    ("vulve", r"vulv|vestibul|lichen|candid|vaginosis|vaginitis|dyspareunia"),
                    ("pelvien", r"dysmenorr|pelvic pain|endometriosis|cystitis|pelvic floor"),
                    ("obstétrique", r"perine|episiotom|nipple|breastfeed|lactat|labou?r|childbirth|postpartum|puerper|cesarean|caesarean|pregnan"),
                    ("fertilité", r"ovar|oocyte|fertil|endometri|polycystic|embryo|follic|uter")],
    "musculo-squelettique": [("tendon", r"tendin|tendon|epicondyl|plantar fasci|achilles|enthes"),
                             ("arthrose", r"osteoarthrit|arthrit|knee|hip|gonarthros|rheumat"),
                             ("rachis", r"back pain|neck pain|lumbar|cervical|radiculopathy|spine|spinal|disc herniation|lumbago|sciatica"),
                             ("ATM", r"temporomandibular|\btmd\b|\btmj\b|bruxism|masticat|orofacial pain"),
                             ("fibro", r"fibromyalg|myofascial|trigger point"),
                             ("épaule", r"shoulder|frozen|adhesive capsulitis|subacromial|rotator cuff"),
                             ("os", r"\bbone|fracture|osteo(?!arthr)|osseointegr|orthodont|implant"),
                             ("muscle", r"muscl|exercise|athlet|fatigue|performance|sport|strength")],
    "dermatologie": [("plaies", r"wound|ulcer|diabetic foot|pressure (injur|sore)|decubitus"),
                     ("cicatrices", r"scar|keloid|burn"),
                     ("radiodermite", r"radiation dermatitis|radiodermatitis|radiation-induced skin|radiotherapy"),
                     ("alopécie", r"alopecia|hair (loss|growth)"),
                     ("inflammatoire", r"acne|psoria|dermatitis|eczema|rosacea|lichen|urticaria|hidradenitis"),
                     ("esthétique", r"aging|ageing|wrinkle|rejuvenat|cellulite|photoag|cosmetic|aesthetic|collagen"),
                     ("infections", r"herpes|onychomycosis|fung|bacteri|infect|leishman|wart"),
                     ("pigmentation", r"vitiligo|melasma|pigment")],
}

TYPE_RULES = [  # (type, niveau) d'après les types de publication PubMed, du plus fort au plus faible
    ({"Practice Guideline", "Guideline", "Consensus Development Conference"}, "guideline", 1),
    ({"Meta-Analysis", "Network Meta-Analysis"}, "ma", 1),
    ({"Systematic Review"}, "sr", 1),
    ({"Randomized Controlled Trial", "Equivalence Trial"}, "rct", 2),
    ({"Clinical Trial Protocol"}, "protocol", 0),
    ({"Controlled Clinical Trial", "Clinical Trial", "Clinical Trial, Phase II", "Clinical Trial, Phase III", "Comparative Study", "Pragmatic Clinical Trial"}, "nrct", 3),
    ({"Observational Study", "Multicenter Study", "Clinical Study"}, "cohort", 4),
    ({"Case Reports"}, "cases", 4),
    ({"Letter", "Editorial", "Comment"}, "letter", 0),
    ({"Review", "Scoping Review"}, "review", 5),
]
ANIMAL = re.compile(r"\b(rats?|mice|murine|mouse|rabbits?|dogs?|canine|equine|horses?|sheep|ovine|bovine|pigs?|porcine|zebrafish|in vitro|cell line|cells)\b", re.I)


def iso_week(d: str) -> str:
    y, w, _ = dt.date.fromisoformat(d).isocalendar()
    return f"{y}-S{w:02d}"


def auto_type(r: dict) -> tuple[str, int]:
    pts = set(r.get("pub_types") or [])
    for names, t, lvl in TYPE_RULES:
        if pts & names:
            if t == "nrct" and ("Animals" in (r.get("mesh") or []) and "Humans" not in (r.get("mesh") or [])):
                return "preclinical", 5
            return t, lvl
    mesh = set(r.get("mesh") or [])
    if ("Animals" in mesh and "Humans" not in mesh) or ANIMAL.search(r.get("title", "")):
        return "preclinical", 5
    return "autre", 0


def auto_subgroups(topic_id: str, r: dict) -> list[str]:
    text = " ".join([r.get("title", ""), " ".join(r.get("keywords") or []), " ".join(r.get("mesh") or [])]).lower()
    return [code for code, rx in SUBGROUP_RULES.get(topic_id, []) if re.search(rx, text)]


def conclusion(r: dict, limit: int = 320) -> str:
    ab = r.get("abstract") or []
    for part in reversed(ab):
        if re.match(r"(conclusion|interpretation|clinical significance|implication)", part.get("label", ""), re.I):
            txt = part["text"]
            break
    else:
        txt = " ".join(p["text"] for p in ab)
        sents = re.split(r"(?<=[.!?])\s+", txt)
        txt = " ".join(sents[-2:]) if len(sents) > 2 else txt
    txt = re.sub(r"\s+", " ", txt).strip()
    return (txt[: limit - 1].rsplit(" ", 1)[0] + "…") if len(txt) > limit else txt


def article_date(r: dict, since: str) -> str:
    date = r.get("date_online") or r.get("date_pub") or "2000-01-01"
    if date[:4] < since[:4] and r.get("date_pub") and r["date_pub"][:4] >= since[:4]:
        date = r["date_pub"]  # mis en ligne avant la période, paru dans un numéro de la période
    return date


def common(r: dict, topic_id: str, date: str) -> dict:
    authors = r.get("authors") or []
    pdf = ROOT / "pdfs" / f"{r['pmid']}.pdf"
    return {
        "pmid": r["pmid"], "topic": topic_id, "title": r["title"], "journal": r.get("journal"),
        "journal_abbr": r.get("journal_abbr"), "authors": authors[:3] + (["et al."] if len(authors) > 3 else []),
        "date": date, "year": int(date[:4]), "week": iso_week(date), "doi": r.get("doi"), "pmcid": r.get("pmcid"),
        "license": r.get("license"), "oa": bool(r.get("open_access")), "pdf": f"pdfs/{r['pmid']}.pdf" if pdf.exists() else None,
        "cited_by": r.get("cited_by", 0), "pub_types": [p for p in r.get("pub_types", []) if p != "Journal Article"],
    }


def build_topic(topic_id: str) -> tuple[dict, list, dict, dict]:
    topic = json.loads((ROOT / "data/topics" / f"{topic_id}.json").read_text())
    since = topic.get("since", "2000-01-01")
    raw_path = ROOT / "data/raw" / f"{topic_id}.json"
    raw = {r["pmid"]: r for r in json.loads(raw_path.read_text())} if raw_path.exists() else {}
    cur_dir = ROOT / "data/curation" / topic_id
    curated: dict[str, dict] = {}
    for f in sorted(cur_dir.glob("[0-9]*.json")):
        for c in json.loads(f.read_text()):
            if c["pmid"] in curated:
                raise SystemExit(f"PMID en double dans la curation : {c['pmid']}")
            curated[c["pmid"]] = c
    excluded = set(json.loads((cur_dir / "exclus.json").read_text())) if (cur_dir / "exclus.json").exists() else set()

    articles, abstracts = [], {}
    for pmid, c in curated.items():
        r = raw.get(pmid)
        if not r:
            raise SystemExit(f"PMID {pmid} curé mais absent de data/raw")
        date = article_date(r, since)
        articles.append({**c, **common(r, topic_id, date), "curated": True,
                         "abstract": r.get("abstract", []), "keywords": r.get("keywords", [])[:10]})
    for pmid, r in raw.items():
        if pmid in curated or pmid in excluded:
            continue
        date = article_date(r, since)
        if date[:4] < since[:4]:
            continue
        t, lvl = auto_type(r)
        articles.append({
            **common(r, topic_id, date), "curated": False, "type": t, "level": lvl, "effect": "—",
            "theme": "Non analysé", "ctx": auto_subgroups(topic_id, r), "pop": "—", "aim": "—", "mode": [], "nm": [], "n": None,
            "title_fr": r["title"], "l1": conclusion(r), "kw": " ".join((r.get("keywords") or [])[:8] + (r.get("mesh") or [])[:8]),
        })
        if r.get("abstract"):
            abstracts[pmid] = r["abstract"]
    articles.sort(key=lambda a: a["date"], reverse=True)

    syn_path = cur_dir / "syntheses.json"
    syntheses = json.loads(syn_path.read_text()) if syn_path.exists() else {}
    meta = {k: topic.get(k) for k in ("id", "label", "short", "color", "description", "cadence", "since", "status",
                                      "hero", "exclusions_note", "subgroups", "pubmed_query")}
    meta.update(n_raw=len(raw), n_excluded=len(excluded), n=len(articles), n_curated=sum(a["curated"] for a in articles))
    return meta, articles, syntheses, abstracts


def write_versioned(path: pathlib.Path, text: str) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    return hashlib.sha1(text.encode()).hexdigest()[:10]


def stamp_assets() -> None:
    """Ajoute une empreinte (?v=…) aux fichiers CSS/JS/images d'index.html : chaque mise à jour change l'adresse,
    le navigateur ne peut donc jamais mélanger une page récente avec une ancienne feuille de style."""
    idx = ROOT / "index.html"
    html = idx.read_text()

    def repl(m):
        path = m.group(2)
        f = ROOT / path
        if not f.exists():
            return m.group(0)
        return f'{m.group(1)}{path}?v={hashlib.sha1(f.read_bytes()).hexdigest()[:10]}"'
    idx.write_text(re.sub(r'((?:src|href)=")(assets/[^"?]+)(?:\?v=[0-9a-f]+)?"', repl, html))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--prune-pdfs", action="store_true", help="supprime les PDF des notices sans fiche rédigée")
    args = ap.parse_args()
    topics, syntheses, all_articles = [], {}, []
    for t in sorted((ROOT / "data/topics").glob("*.json")):
        info = json.loads(t.read_text())
        if info.get("status") == "à venir" or not (ROOT / "data/raw" / f"{t.stem}.json").exists():
            topics.append({k: info.get(k) for k in ("id", "label", "short", "description")} | {"status": "à venir"})
            continue
        meta, arts, syn, abstracts = build_topic(t.stem)
        if args.prune_pdfs:
            pass  # traité globalement plus bas
        chunks: dict[int, dict] = {}
        for pmid, ab in abstracts.items():
            chunks.setdefault(int(pmid) % N_CHUNKS, {})[pmid] = ab
        for i, ch in chunks.items():
            write_versioned(ROOT / "assets/abs" / t.stem / f"{i:02d}.json", json.dumps(ch, ensure_ascii=False, separators=(",", ":")))
        js = f'(window.LUMINA_T = window.LUMINA_T || {{}})["{t.stem}"] = ' + json.dumps(arts, ensure_ascii=False, separators=(",", ":")) + ";\n"
        h = write_versioned(ROOT / "assets/topics" / f"{t.stem}.js", js)
        meta["file"] = f"assets/topics/{t.stem}.js?v={h}"
        meta["years"] = sorted({a["year"] for a in arts})
        topics.append(meta)
        syntheses[t.stem] = syn
        all_articles += arts
        print(f"[{t.stem}] {meta['n']} notices ({meta['n_curated']} fiches rédigées), "
              f"{(ROOT / 'assets/topics' / f'{t.stem}.js').stat().st_size // 1024} Ko")
    if args.prune_pdfs:
        keep = {a["pmid"] for a in all_articles if a["curated"]}
        for p in (ROOT / "pdfs").glob("*.pdf"):
            if p.stem not in keep:
                p.unlink()
                print("  PDF retiré (pas de fiche rédigée) :", p.name)
    order = {"actif": 0, None: 0, "à venir": 1}
    topics.sort(key=lambda x: (order.get(x.get("status"), 0), x["label"]))
    payload = {"generated": dt.date.today().isoformat(), "topics": topics, "syntheses": syntheses, "n_chunks": N_CHUNKS}
    out = ROOT / "assets/data.js"
    out.write_text("window.LUMINA = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n")
    stamp_assets()
    print(f"→ {len(all_articles)} notices, {sum(a['curated'] for a in all_articles)} fiches, "
          f"{sum(1 for a in all_articles if a['pdf'])} PDF ; data.js {out.stat().st_size // 1024} Ko")


if __name__ == "__main__":
    main()
