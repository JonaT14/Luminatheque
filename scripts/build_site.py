#!/usr/bin/env python3
"""
Assemble les données du site : data/raw/<thème>.json (métadonnées PubMed)
+ data/curation/<thème>/*.json (analyses en 3 niveaux, niveaux de preuve…)
→ assets/data.js (chargé par index.html, fonctionne aussi en ouvrant le fichier en local).

Usage : python3 scripts/build_site.py [--prune-pdfs]
  --prune-pdfs  supprime les PDF des articles non retenus.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent


def iso_week(d: str) -> str:
    y, w, _ = dt.date.fromisoformat(d).isocalendar()
    return f"{y}-S{w:02d}"


def build_topic(topic_id: str) -> tuple[dict, list, dict]:
    topic = json.loads((ROOT / "data/topics" / f"{topic_id}.json").read_text())
    raw = {r["pmid"]: r for r in json.loads((ROOT / "data/raw" / f"{topic_id}.json").read_text())}
    cur_dir = ROOT / "data/curation" / topic_id
    curated: dict[str, dict] = {}
    for f in sorted(cur_dir.glob("[0-9]*.json")):
        for c in json.loads(f.read_text()):
            if c["pmid"] in curated:
                raise SystemExit(f"PMID en double dans la curation : {c['pmid']}")
            curated[c["pmid"]] = c
    excluded = set(json.loads((cur_dir / "exclus.json").read_text())) if (cur_dir / "exclus.json").exists() else set()

    pending = sorted(set(raw) - set(curated) - excluded)
    if pending:
        print(f"[{topic_id}] {len(pending)} article(s) à analyser :", ", ".join(pending))

    articles = []
    for pmid, c in curated.items():
        r = raw.get(pmid)
        if not r:
            raise SystemExit(f"PMID {pmid} curé mais absent de data/raw")
        date = r["date_online"]
        if date[:4] < topic.get("since", "0000")[:4] and r.get("date_pub") and r["date_pub"][:4] >= topic.get("since", "0000")[:4]:
            date = r["date_pub"]  # mis en ligne avant la période, paru dans un numéro de la période
        pdf = ROOT / "pdfs" / f"{pmid}.pdf"
        authors = r.get("authors") or []
        articles.append({
            **c,
            "topic": topic_id,
            "title": r["title"],
            "journal": r.get("journal"),
            "journal_abbr": r.get("journal_abbr"),
            "authors": authors[:3] + (["et al."] if len(authors) > 3 else []),
            "date": date,
            "year": int(date[:4]),
            "week": iso_week(date),
            "doi": r.get("doi"),
            "pmcid": r.get("pmcid"),
            "license": r.get("license"),
            "oa": bool(r.get("open_access")),
            "pdf": f"pdfs/{pmid}.pdf" if pdf.exists() else None,
            "cited_by": r.get("cited_by", 0),
            "pub_types": [p for p in r.get("pub_types", []) if p != "Journal Article"],
            "abstract": r.get("abstract", []),
            "keywords": r.get("keywords", [])[:10],
        })
    articles.sort(key=lambda a: a["date"], reverse=True)

    syn_path = cur_dir / "syntheses.json"
    syntheses = json.loads(syn_path.read_text()) if syn_path.exists() else {}
    meta = {k: topic.get(k) for k in ("id", "label", "short", "color", "description", "cadence", "since", "status", "hero", "exclusions_note", "subgroups")}
    meta["pubmed_query"] = topic["pubmed_query"]
    meta["n_raw"] = len(raw)
    meta["n_excluded"] = len(excluded)
    return meta, articles, syntheses


def stamp_assets() -> None:
    """Ajoute une empreinte (?v=…) aux fichiers CSS/JS/images d'index.html : chaque mise à jour change l'adresse,
    le navigateur ne peut donc jamais mélanger une page récente avec une ancienne feuille de style."""
    import hashlib
    import re
    idx = ROOT / "index.html"
    html = idx.read_text()
    def repl(m):
        path = m.group(2)
        f = ROOT / path
        if not f.exists():
            return m.group(0)
        h = hashlib.sha1(f.read_bytes()).hexdigest()[:10]
        return f'{m.group(1)}{path}?v={h}"'
    html = re.sub(r'((?:src|href)=")(assets/[^"?]+)(?:\?v=[0-9a-f]+)?"', repl, html)
    idx.write_text(html)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--prune-pdfs", action="store_true")
    args = ap.parse_args()
    topics, articles, syntheses = [], [], {}
    for t in sorted((ROOT / "data/topics").glob("*.json")):
        if not (ROOT / "data/curation" / t.stem).exists():
            info = json.loads(t.read_text())
            topics.append({k: info.get(k) for k in ("id", "label", "short", "description", "status")} | {"status": "à venir"})
            continue
        meta, arts, syn = build_topic(t.stem)
        topics.append(meta)
        articles += arts
        syntheses[t.stem] = syn
    if args.prune_pdfs:
        keep = {a["pmid"] for a in articles}
        for p in (ROOT / "pdfs").glob("*.pdf"):
            if p.stem not in keep:
                p.unlink()
                print("  PDF retiré (article non retenu) :", p.name)
        for a in articles:
            a["pdf"] = a["pdf"] if (ROOT / "pdfs" / f"{a['pmid']}.pdf").exists() else None
    order = {"actif": 0, None: 0, "à venir": 1}
    topics.sort(key=lambda t: (order.get(t.get("status"), 0), t["label"]))
    payload = {"generated": dt.date.today().isoformat(), "topics": topics, "articles": articles, "syntheses": syntheses}
    out = ROOT / "assets/data.js"
    out.write_text("window.LUMINA = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n")
    stamp_assets()
    print(f"→ {out.relative_to(ROOT)} : {len(articles)} articles, {sum(1 for a in articles if a['pdf'])} PDF, "
          f"{out.stat().st_size // 1024} Ko")


if __name__ == "__main__":
    main()
