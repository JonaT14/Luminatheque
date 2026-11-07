#!/usr/bin/env python3
"""
Télécharge les PDF en accès ouvert (licences Creative Commons) depuis le dépôt
PMC Open Access (bucket public AWS « pmc-oa-opendata », mis à disposition par la NLM).

Usage :
    python3 scripts/fetch_pdfs.py --topic mucite-orale

Écrit pdfs/<PMID>.pdf (+ data/fulltext/<PMID>.txt, non versionné, pour l'analyse).
Seuls les articles sous licence CC sont téléchargés : la redistribution est
autorisée sous réserve de citer la source (affichée sur chaque fiche).
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import time

import requests

ROOT = pathlib.Path(__file__).resolve().parent.parent
BUCKET = "https://pmc-oa-opendata.s3.amazonaws.com"
UA = {"User-Agent": "Luminatheque/1.0"}


def latest_keys(pmcid: str) -> dict[str, str]:
    r = requests.get(BUCKET, params={"list-type": 2, "prefix": f"{pmcid}."}, headers=UA, timeout=60)
    r.raise_for_status()
    keys = re.findall(r"<Key>([^<]+)</Key>", r.text)
    best: dict[str, tuple[int, str]] = {}
    for k in keys:
        m = re.match(rf"{pmcid}\.(\d+)/{pmcid}\.\d+\.(pdf|txt)$", k)
        if m:
            v, ext = int(m.group(1)), m.group(2)
            if ext not in best or v > best[ext][0]:
                best[ext] = (v, k)
    return {ext: k for ext, (v, k) in best.items()}


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--topic", required=True)
    args = p.parse_args()
    recs = json.loads((ROOT / "data/raw" / f"{args.topic}.json").read_text())
    (ROOT / "pdfs").mkdir(exist_ok=True)
    (ROOT / "data/fulltext").mkdir(parents=True, exist_ok=True)
    for r in recs:
        pmcid, lic = r.get("pmcid"), (r.get("license") or "")
        if not pmcid or not lic.startswith("cc"):
            continue
        pdf = ROOT / "pdfs" / f"{r['pmid']}.pdf"
        txt = ROOT / "data/fulltext" / f"{r['pmid']}.txt"
        if pdf.exists() and txt.exists():
            continue
        try:
            keys = latest_keys(pmcid)
        except Exception as e:  # noqa: BLE001
            print("liste KO", pmcid, e)
            continue
        for ext, dest in (("pdf", pdf), ("txt", txt)):
            if ext in keys and not dest.exists():
                resp = requests.get(f"{BUCKET}/{keys[ext]}", headers=UA, timeout=120)
                if resp.ok:
                    dest.write_bytes(resp.content)
        print(r["pmid"], pmcid, lic, "PDF" if pdf.exists() else "pas de PDF", "TXT" if txt.exists() else "")
        time.sleep(0.2)


if __name__ == "__main__":
    main()
