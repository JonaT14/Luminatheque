#!/usr/bin/env python3
"""Liste les études clés (essais randomisés, méta-analyses, revues systématiques, recommandations)
qui n'ont pas encore de fiche rédigée. Usage : python3 scripts/pending.py [--topic X] [--since AAAA]"""
import argparse, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from build_site import ROOT, auto_type  # noqa: E402

ap = argparse.ArgumentParser(); ap.add_argument("--topic"); ap.add_argument("--since", default="2000")
a = ap.parse_args()
for t in sorted((ROOT / "data/raw").glob("*.json")):
    if a.topic and t.stem != a.topic:
        continue
    cur = ROOT / "data/curation" / t.stem
    done = {c["pmid"] for f in cur.glob("[0-9]*.json") for c in json.loads(f.read_text())}
    excl = set(json.loads((cur / "exclus.json").read_text())) if (cur / "exclus.json").exists() else set()
    todo = [r for r in json.loads(t.read_text()) if r["pmid"] not in done | excl
            and auto_type(r)[0] in ("rct", "ma", "sr", "guideline") and (r.get("date_online") or "")[:4] >= a.since]
    print(f"{t.stem}: {len(todo)} études clés sans fiche")
    for r in todo:
        print(f"  {r['pmid']} {r.get('date_online','')[:4]} {auto_type(r)[0]:9s} {r['title'][:110]}")
