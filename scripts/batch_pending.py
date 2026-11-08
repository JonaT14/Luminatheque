#!/usr/bin/env python3
"""Extrait un lot d'études clés sans fiche (résumé raccourci) pour la rédaction des fiches.
Usage : python3 scripts/batch_pending.py --topic dermatologie [--size 30] > lot.txt"""
import argparse, json, pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from build_site import ROOT, auto_type  # noqa: E402

ap = argparse.ArgumentParser(); ap.add_argument("--topic", required=True); ap.add_argument("--size", type=int, default=30)
ap.add_argument("--chars", type=int, default=1100)
a = ap.parse_args()
cur = ROOT / "data/curation" / a.topic
done = {c["pmid"] for f in cur.glob("[0-9]*.json") for c in json.loads(f.read_text())} if cur.exists() else set()
excl = set(json.loads((cur / "exclus.json").read_text())) if (cur / "exclus.json").exists() else set()
raw = json.loads((ROOT / "data/raw" / f"{a.topic}.json").read_text())
todo = [r for r in raw if r["pmid"] not in done | excl and auto_type(r)[0] in ("rct", "ma", "sr", "guideline")]
todo.sort(key=lambda r: (r.get("date_online") or r.get("date_pub") or ""))
print(f"# {a.topic} : {len(todo)} restantes ; lot de {min(a.size, len(todo))}")


def short(ab, n):
    parts = [(p.get("label") or "", re.sub(r"\s+", " ", p["text"])) for p in (ab or [])]
    keep = [p for p in parts if not re.match(r"(background|introduction|context|purpose|aim|objective)", p[0], re.I)] or parts
    txt = " ".join(f"[{l}] {t}" if l else t for l, t in keep)
    return txt[:n] + ("…" if len(txt) > n else "")


for r in todo[: a.size]:
    d = (r.get("date_online") or r.get("date_pub") or "")[:4]
    print(f"\n## {r['pmid']} | {d} | {auto_type(r)[0]} | {r.get('journal_abbr')}\nT: {r['title']}\nA: {short(r.get('abstract'), a.chars) or '(pas de résumé)'}")
