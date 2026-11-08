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
import collections
import datetime as dt
import hashlib
import shutil
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
                             ("muscle", r"muscl|exercise|athlet|fatigue|performance|sport|strength"),
                             ("EDS", r"ehlers|danlos|hypermobil")],
    "ophtalmologie": [("DMLA", r"macular degeneration|\bamd\b|drusen|geographic atrophy"),
                      ("myopie", r"myopi|axial length|refractive"),
                      ("sécheresse", r"dry eye|meibomian|blephar|tear|ocular surface"),
                      ("rétinopathie", r"diabetic retinopathy|diabetic macular|retinopathy of prematurity|retinopath"),
                      ("glaucome", r"glaucoma|optic neuropathy|optic nerve"),
                      ("amblyopie", r"amblyopi"),
                      ("autres", r"retinitis|uveitis|cornea|keratitis|cataract|chalazion")],
    "odontologie": [("chirurgie", r"third molar|wisdom|extraction|socket|alveolar osteitis|dry socket|oral surgery|orthognathic"),
                    ("ortho", r"orthodont|tooth movement|aligner|maxillary expansion|bracket"),
                    ("implants", r"implant|osseointegr|sinus lift|bone graft|ridge preservation"),
                    ("paro", r"periodont|gingiv|scaling|root planing|peri-implantitis|recession"),
                    ("hypersensibilité", r"hypersensitiv|dentin|sensitivity"),
                    ("endo", r"endodont|pulp|root canal|periapical|apical"),
                    ("ONM", r"osteonecrosis|mronj|bronj|bisphosphonate"),
                    ("anesthésie", r"anesthe|anaesthe|injection pain|gag reflex|anxiety|needle"),
                    ("autres", r"denture|prosthe|caries|enamel|bleaching|whitening")],
    "oncologie-support": [("lymphœdème", r"lymph(o)?edema|lymphoedema"),
                          ("trismus", r"trismus|fibrosis|mouth opening"),
                          ("xérostomie", r"xerostomia|hyposalivation|salivary"),
                          ("main-pied", r"hand-foot|palmar-plantar|nail"),
                          ("fatigue", r"fatigue|cognitive|chemobrain|chemo brain|sleep")],
    "orl": [("acouphènes", r"tinnitus"),
            ("surdité", r"hearing|deafness|cochlea|ototox"),
            ("rhinite", r"rhinitis|allerg"),
            ("sinusite", r"sinusitis|rhinosinusitis|nasal polyp"),
            ("odorat", r"olfact|smell|anosmia|hyposmia|taste|gustat"),
            ("pharynx", r"tonsil|pharyng|throat|laryn|voice"),
            ("vertiges", r"vertigo|vestibul|dizziness|meniere")],
    "sport": [("performance", r"performance|strength|ergogenic|endurance|time to exhaustion|repetition|torque|preconditioning"),
              ("récupération", r"recovery|soreness|doms|creatine kinase|muscle damage|fatigue"),
              ("blessures", r"injur|strain|sprain|tendin|contusion"),
              ("populations", r"elderly|older|patients|copd|heart failure|obes|diabet|disease")],
    "neurologie": [("SEP", r"multiple sclerosis|demyelinat|encephalomyelitis(?! myalgic)"),
                   ("SLA", r"amyotrophic|motor neuron disease|\bals\b"),
                   ("parkinson", r"parkinson"),
                   ("tremblements", r"tremor|dystonia"),
                   ("démences", r"dementia|alzheimer|cognitive impairment|cognitive decline|mild cognitive|cognition|memory"),
                   ("fatigue", r"chronic fatigue|myalgic|long covid|post-covid|post covid|post-acute sequelae|covid"),
                   ("AVC", r"stroke|cerebral ischemi|cerebral infarct|aphasia|hemipleg"),
                   ("TC", r"brain injur|concussion|traumatic brain|\btbi\b"),
                   ("neurodev", r"autis|asd\b|adhd|attention deficit|cerebral palsy|down syndrome"),
                   ("humeur", r"depress|anxiety|bipolar|insomnia|sleep|post-traumatic stress|ptsd"),
                   ("autres", r"migraine|headache|epilep|spinal cord|huntington|neurodegenerat")],
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
            "title_fr": r["title"], "l1": conclusion(r, 240), "kw": " ".join((r.get("keywords") or [])[:6] + (r.get("mesh") or [])[:6])[:160],
        })
        if r.get("abstract"):
            abstracts[pmid] = r["abstract"]
    articles.sort(key=lambda a: a["date"], reverse=True)

    syn_path = cur_dir / "syntheses.json"
    syntheses = json.loads(syn_path.read_text()) if syn_path.exists() else {}
    meta = {k: topic.get(k) for k in ("id", "label", "short", "color", "description", "cadence", "since", "status",
                                      "hero", "exclusions_note", "subgroups", "pubmed_query")}
    par_path = cur_dir / "parametres.json"
    meta["params"] = json.loads(par_path.read_text()) if par_path.exists() else []
    meta.update(n_raw=len(raw), n_excluded=len(excluded), n=len(articles), n_curated=sum(a["curated"] for a in articles))
    return meta, articles, syntheses, abstracts


RAW_DEFAULTS = {"theme": "Non analysé", "effect": "—", "pop": "—", "aim": "—", "mode": [], "nm": [], "n": None,
                "doi": None, "pmcid": None, "license": None, "pdf": None, "oa": False, "cited_by": 0, "pub_types": []}


def slim(a: dict) -> dict:
    """Allège les notices non analysées : les valeurs par défaut sont restaurées par app.js (hydrate)."""
    if a.get("curated"):
        return a
    out = {k: v for k, v in a.items() if k not in ("topic", "week") and RAW_DEFAULTS.get(k, object()) != v}
    if out.get("title_fr") == out.get("title"):
        out.pop("title_fr")
    if out.get("journal_abbr"):
        out.pop("journal", None)
    return out


def write_versioned(path: pathlib.Path, text: str) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    return hashlib.sha1(text.encode()).hexdigest()[:10]


def stamp_assets() -> None:
    """Copie app.js, style.css, data.js et les images d'index.html sous un nom contenant leur empreinte
    (assets/dist/app.<hash>.js). Le CDN de Render ignore les « ?v= » : seul un nouveau nom garantit qu'une
    mise à jour est servie tout de suite, sans mélange entre une page récente et une ancienne feuille de style."""
    idx = ROOT / "index.html"
    html = idx.read_text()
    dist = ROOT / "assets/dist"
    if dist.exists():
        shutil.rmtree(dist)
    dist.mkdir(parents=True)
    pat = re.compile(r'((?:src|href)=")assets/(?:dist/)?([a-z0-9_-]+)(?:\.[0-9a-f]{10})?(\.[a-z]+)(?:\?v=[0-9a-f]+)?"')

    def repl(m):
        name, ext = m.group(2), m.group(3)
        f = ROOT / "assets" / f"{name}{ext}"
        if not f.exists():
            return m.group(0)
        h = hashlib.sha1(f.read_bytes()).hexdigest()[:10]
        shutil.copyfile(f, dist / f"{name}.{h}{ext}")
        return f'{m.group(1)}assets/dist/{name}.{h}{ext}"'
    idx.write_text(pat.sub(repl, html))


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
        texts = {i: json.dumps(ch, ensure_ascii=False, separators=(",", ":")) for i, ch in sorted(chunks.items())}
        ah = hashlib.sha1("".join(texts.values()).encode()).hexdigest()[:10]
        for old in (ROOT / "assets/abs").glob(f"{t.stem}*"):
            if old.name != f"{t.stem}.{ah}":
                shutil.rmtree(old) if old.is_dir() else old.unlink()
        for i, txt in texts.items():
            write_versioned(ROOT / "assets/abs" / f"{t.stem}.{ah}" / f"{i:02d}.json", txt)
        meta["abs"] = f"assets/abs/{t.stem}.{ah}"
        js = f'(window.LUMINA_T = window.LUMINA_T || {{}})["{t.stem}"] = ' + json.dumps([slim(a) for a in arts], ensure_ascii=False, separators=(",", ":")) + ";\n"
        h = hashlib.sha1(js.encode()).hexdigest()[:10]
        for old in (ROOT / "assets/topics").glob(f"{t.stem}.*js"):
            if old.name != f"{t.stem}.{h}.js":
                old.unlink()
        write_versioned(ROOT / "assets/topics" / f"{t.stem}.{h}.js", js)
        meta["file"] = f"assets/topics/{t.stem}.{h}.js"
        meta["years"] = sorted({a["year"] for a in arts})
        topics.append(meta)
        syntheses[t.stem] = syn
        all_articles += arts
        print(f"[{t.stem}] {meta['n']} notices ({meta['n_curated']} fiches rédigées), "
              f"{len(js.encode()) // 1024} Ko")
    if args.prune_pdfs:
        keep = {a["pmid"] for a in all_articles if a["curated"]}
        for p in (ROOT / "pdfs").glob("*.pdf"):
            if p.stem not in keep:
                p.unlink()
                print("  PDF retiré (pas de fiche rédigée) :", p.name)
    # essais en cours et projets en construction (ClinicalTrials.gov + registres de l'ICTRP/OMS, triés à la main)
    reg_p, cur_p, oms_p = ROOT / "data/trials/registre.json", ROOT / "data/curation/essais.json", ROOT / "data/trials/registres_oms.json"
    trials: dict[str, list] = {}
    if reg_p.exists() and cur_p.exists():
        reg, cur = json.loads(reg_p.read_text()), json.loads(cur_p.read_text())
        oms = json.loads(oms_p.read_text()) if oms_p.exists() else {"studies": [], "fetched": None}
        for st in reg["studies"]:
            st.setdefault("registry", "ClinicalTrials.gov"); st.setdefault("url", f"https://clinicaltrials.gov/study/{st['nct']}")
        keep = ("nct", "registry", "url", "title", "acronym", "status", "phases", "n", "start", "end", "allocation", "masking", "conditions",
                "interventions", "sponsor", "sponsor_class", "collaborators", "responsible", "officials", "countries", "sites",
                "n_sites", "outcome", "summary", "updated", "first_posted", "type")
        reg["oms_fetched"] = oms.get("fetched")
        for st in reg["studies"] + oms["studies"]:
            c = cur["essais"].get(st["nct"])
            if not c:
                continue
            trials.setdefault(c[0], []).append({k: st.get(k) for k in keep} | {"ctx": c[1], "titre": c[2]})
        payload_trials = {"fetched": reg["fetched"], "oms_fetched": reg["oms_fetched"], "by_topic": trials}
        js = "window.LUMINA_E = " + json.dumps(payload_trials, ensure_ascii=False, separators=(",", ":")) + ";\n"
        h = hashlib.sha1(js.encode()).hexdigest()[:10]
        for old in (ROOT / "assets/topics").glob("_essais.*js"):
            if old.name != f"_essais.{h}.js":
                old.unlink()
        write_versioned(ROOT / "assets/topics" / f"_essais.{h}.js", js)
        for tp in topics:
            xs = trials.get(tp["id"], [])
            tp["trials"] = {"now": sum(x["status"] != "NOT_YET_RECRUITING" for x in xs), "soon": sum(x["status"] == "NOT_YET_RECRUITING" for x in xs)}
        n_oms = sum(x["registry"] != "ClinicalTrials.gov" for xs in trials.values() for x in xs)
        print(f"→ {sum(map(len, trials.values()))} essais en cours, dont {n_oms} hors ClinicalTrials.gov (relevés du {reg['fetched']} et du {reg['oms_fetched']})")
    # appareils : détection par expressions régulières dans le titre et le résumé des notices et des essais
    dev_p = ROOT / "data/appareils.json"
    if dev_p.exists():
        devices = json.loads(dev_p.read_text())
        rx = {d["id"]: re.compile(d["rx"], re.I) for d in devices}
        hits = {d["id"]: [] for d in devices}
        for t in sorted((ROOT / "data/raw").glob("*.json")):
            arts = {a["pmid"]: a for a in all_articles if a["topic"] == t.stem}
            for r in json.loads(t.read_text()):
                a = arts.get(r["pmid"])
                if not a:
                    continue
                text = r["title"] + " " + " ".join(x["text"] if isinstance(x, dict) else str(x) for x in (r.get("abstract") or []))
                for d in devices:
                    if rx[d["id"]].search(text):
                        hits[d["id"]].append({"p": a["pmid"], "t": t.stem, "y": a["year"], "ty": a["type"], "c": int(a["curated"]),
                                              "e": a["effect"], "ti": a.get("title_fr") or a["title"]})
        trial_hits = {d["id"]: [] for d in devices}
        for tp, xs in trials.items():
            for s_ in xs:
                text = " ".join([s_.get("title") or "", s_.get("summary") or ""] + [i.get("name") or "" for i in s_["interventions"]])
                for d in devices:
                    if rx[d["id"]].search(text):
                        trial_hits[d["id"]].append({"n": s_["nct"], "u": s_["url"], "t": tp, "ti": s_["titre"], "st": s_["status"]})
        out_dev = []
        for d in devices:
            hs = sorted(hits[d["id"]], key=lambda h: (-h["c"], -h["y"]))
            if not hs and not trial_hits[d["id"]]:
                continue
            keep = hs if d["kind"] == "marque" else [h for h in hs if h["c"]][:400]
            out_dev.append({k: v for k, v in d.items() if k != "rx"} | {
                "n": len(hs), "nc": sum(h["c"] for h in hs), "fav": sum(h["e"] == "favorable" for h in hs),
                "topics": dict(collections.Counter(h["t"] for h in hs)), "studies": keep, "trials": trial_hits[d["id"]]})
        js = "window.LUMINA_D = " + json.dumps(out_dev, ensure_ascii=False, separators=(",", ":")) + ";\n"
        dh = hashlib.sha1(js.encode()).hexdigest()[:10]
        for old in (ROOT / "assets/topics").glob("_appareils.*js"):
            if old.name != f"_appareils.{dh}.js":
                old.unlink()
        write_versioned(ROOT / "assets/topics" / f"_appareils.{dh}.js", js)
        devices_file = f"assets/topics/_appareils.{dh}.js"
        print(f"→ {len(out_dev)} appareils détectés")
    else:
        devices_file = None
    order = {"actif": 0, None: 0, "à venir": 1}
    topics.sort(key=lambda x: (order.get(x.get("status"), 0), x["label"]))
    payload = {"generated": dt.date.today().isoformat(), "topics": topics, "syntheses": syntheses, "n_chunks": N_CHUNKS,
               "trials_file": f"assets/topics/_essais.{h}.js" if trials else None, "devices_file": devices_file,
               "patients": json.loads((ROOT / "data/fiches_patients.json").read_text()) if (ROOT / "data/fiches_patients.json").exists() else []}
    out = ROOT / "assets/data.js"
    out.write_text("window.LUMINA = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n")
    stamp_assets()
    print(f"→ {len(all_articles)} notices, {sum(a['curated'] for a in all_articles)} fiches, "
          f"{sum(1 for a in all_articles if a['pdf'])} PDF ; data.js {out.stat().st_size // 1024} Ko")


if __name__ == "__main__":
    main()
