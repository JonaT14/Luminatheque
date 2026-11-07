#!/usr/bin/env python3
"""
Luminathèque — collecte des publications PubMed / Europe PMC pour un thème.

Usage :
    python3 scripts/fetch_pubmed.py --topic mucite-orale --since 2024-01-01 [--until 2026-12-31]

Le script :
  1. lit la requête du thème dans data/topics/<topic>.json
  2. interroge PubMed (E-utilities) sur la date de mise en ligne (EDAT) et la date de publication (DP)
  3. récupère les métadonnées + résumés (efetch XML)
  4. complète avec Europe PMC (accès ouvert, licence, PMCID, PDF disponible)
  5. écrit data/raw/<topic>.json (fusion avec l'existant : les PMID déjà présents ne sont pas écrasés
     sauf avec --refresh)

Aucune dépendance hors bibliothèque standard + requests + lxml.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
import sys
import time

import requests
from lxml import etree

ROOT = pathlib.Path(__file__).resolve().parent.parent
EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
EPMC = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
UA = {"User-Agent": "Luminatheque/1.0 (veille bibliographique photobiomodulation)"}
MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}


def esearch(term: str, start: str, end: str, field: str) -> list[str]:
    params = {
        "db": "pubmed", "term": term, "retmode": "json", "retmax": 10000,
        "datetype": field, "mindate": start.replace("-", "/"), "maxdate": end.replace("-", "/"),
    }
    r = requests.get(f"{EUTILS}/esearch.fcgi", params=params, headers=UA, timeout=60)
    r.raise_for_status()
    return r.json()["esearchresult"]["idlist"]


def _txt(el) -> str:
    return "".join(el.itertext()).strip() if el is not None else ""


def _date(el) -> str | None:
    if el is None:
        return None
    y = el.findtext("Year")
    if not y:
        md = el.findtext("MedlineDate")
        return md[:4] + "-01-01" if md else None
    m = el.findtext("Month") or "1"
    d = el.findtext("Day") or "1"
    m = MONTHS.get(m[:3].lower(), None) or int(m)
    try:
        return dt.date(int(y), int(m), int(d)).isoformat()
    except ValueError:
        return f"{y}-01-01"


def efetch(pmids: list[str]) -> list[dict]:
    out = []
    for i in range(0, len(pmids), 100):
        chunk = pmids[i:i + 100]
        for attempt in range(6):
            try:
                r = requests.post(f"{EUTILS}/efetch.fcgi", data={"db": "pubmed", "id": ",".join(chunk), "retmode": "xml"},
                                  headers=UA, timeout=120)
                r.raise_for_status()
                break
            except requests.RequestException as e:
                wait = 5 * (attempt + 1)
                print(f"  efetch : {e} — nouvel essai dans {wait} s", file=sys.stderr)
                time.sleep(wait)
        else:
            raise SystemExit("PubMed indisponible, relancer plus tard")
        root = etree.fromstring(r.content)
        for art in root.findall("PubmedArticle"):
            out.append(parse_article(art))
        time.sleep(0.7)
    return out


def parse_article(art) -> dict:
    mc = art.find("MedlineCitation")
    a = mc.find("Article")
    pmid = mc.findtext("PMID")
    abstract = []
    for t in a.findall("Abstract/AbstractText"):
        abstract.append({"label": t.get("Label") or "", "text": _txt(t)})
    authors = []
    for au in a.findall("AuthorList/Author"):
        if au.findtext("CollectiveName"):
            authors.append(au.findtext("CollectiveName"))
        else:
            authors.append(f"{au.findtext('LastName') or ''} {au.findtext('Initials') or ''}".strip())
    affil = a.findtext("AuthorList/Author/AffiliationInfo/Affiliation") or ""
    ids = {i.get("IdType"): i.text for i in art.findall("PubmedData/ArticleIdList/ArticleId")}
    hist = {h.get("PubStatus"): _date(h) for h in art.findall("PubmedData/History/PubMedPubDate")}
    epub = _date(a.find("ArticleDate"))
    ppub = _date(a.find("Journal/JournalIssue/PubDate"))
    online = min([d for d in [epub, hist.get("pubmed"), hist.get("entrez")] if d] or [ppub])
    return {
        "pmid": pmid,
        "doi": ids.get("doi"),
        "pmcid": ids.get("pmc"),
        "title": _txt(a.find("ArticleTitle")),
        "journal": a.findtext("Journal/Title"),
        "journal_abbr": a.findtext("Journal/ISOAbbreviation"),
        "authors": authors,
        "first_affiliation": affil,
        "date_online": online,
        "date_pub": ppub,
        "pub_types": [p.text for p in a.findall("PublicationTypeList/PublicationType")],
        "mesh": [m.findtext("DescriptorName") for m in mc.findall("MeshHeadingList/MeshHeading")],
        "keywords": [_txt(k) for k in mc.findall("KeywordList/Keyword")],
        "language": a.findtext("Language"),
        "abstract": abstract,
    }


def _epmc_parse(x: dict) -> dict:
    urls = x.get("fullTextUrlList", {}).get("fullTextUrl", [])
    return {
        "open_access": x.get("isOpenAccess") == "Y",
        "license": x.get("license"),
        "pmcid": x.get("pmcid"),
        "has_pdf": x.get("hasPDF") == "Y",
        "cited_by": x.get("citedByCount", 0),
        "fulltext_urls": [{"site": u.get("site"), "style": u.get("documentStyle"),
                           "availability": u.get("availability"), "url": u.get("url")} for u in urls],
    }


def europepmc_batch(pmids: list[str]) -> dict[str, dict]:
    """Interroge Europe PMC par lots de 100 PMID (une requête au lieu de 100)."""
    out: dict[str, dict] = {}
    for i in range(0, len(pmids), 60):
        chunk = pmids[i:i + 60]
        q = "SRC:MED AND (" + " OR ".join(f"EXT_ID:{p}" for p in chunk) + ")"
        for attempt in range(3):
            try:
                r = requests.get(EPMC, params={"query": q, "format": "json", "resultType": "core", "pageSize": 1000},
                                 headers=UA, timeout=120)
                r.raise_for_status()
                for x in r.json().get("resultList", {}).get("result", []):
                    out[str(x.get("pmid") or x.get("id"))] = _epmc_parse(x)
                break
            except Exception as e:  # noqa: BLE001
                print("  Europe PMC KO (lot)", i, e, file=sys.stderr)
                time.sleep(3)
    return out


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--topic", required=True)
    p.add_argument("--since", required=True)
    p.add_argument("--until", default=dt.date.today().isoformat())
    p.add_argument("--refresh", action="store_true")
    p.add_argument("--backfill-epmc", action="store_true", help="complète les métadonnées Europe PMC manquantes")
    args = p.parse_args()

    topic = json.loads((ROOT / "data/topics" / f"{args.topic}.json").read_text())
    term = topic["pubmed_query"]
    if args.backfill_epmc:
        out_path = ROOT / "data/raw" / f"{args.topic}.json"
        data = json.loads(out_path.read_text())
        miss = [r["pmid"] for r in data if "open_access" not in r]
        meta = europepmc_batch(miss)
        for r in data:
            if r["pmid"] in meta:
                r.update({k: v for k, v in meta[r["pmid"]].items() if v is not None})
        out_path.write_text(json.dumps(data, ensure_ascii=False, indent=1))
        print(f"{len(miss)} notices sans métadonnées Europe PMC, {len(meta)} complétées")
        return
    ids = set(esearch(term, args.since, args.until, "edat")) | set(esearch(term, args.since, args.until, "pdat"))
    print(f"{len(ids)} PMID trouvés pour {args.topic} ({args.since} → {args.until})")

    out_path = ROOT / "data/raw" / f"{args.topic}.json"
    existing = {r["pmid"]: r for r in json.loads(out_path.read_text())} if out_path.exists() else {}
    todo = sorted(ids if args.refresh else ids - set(existing))
    print(f"{len(todo)} nouveaux à récupérer")
    recs = efetch(todo)
    meta = europepmc_batch([r["pmid"] for r in recs])
    for rec in recs:
        rec.update({k: v for k, v in meta.get(rec["pmid"], {}).items() if v is not None})
        rec["fetched"] = dt.date.today().isoformat()
        existing[rec["pmid"]] = rec
    data = sorted(existing.values(), key=lambda r: r["date_online"] or "", reverse=True)
    out_path.write_text(json.dumps(data, ensure_ascii=False, indent=1))
    print(f"→ {out_path.relative_to(ROOT)} : {len(data)} articles au total")
    for rec in recs[:50]:
        print(f"  NEW {rec['pmid']} {rec['date_online']} {rec['title'][:90]}")


if __name__ == "__main__":
    main()
