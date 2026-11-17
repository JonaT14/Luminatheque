#!/usr/bin/env python3
"""File d'attente des nouvelles publications : rien n'apparaît sur le site sans validation.

    python3 scripts/en_attente.py --ajouter            # après une collecte : met en attente les PMID nouveaux
    python3 scripts/en_attente.py --liste              # point hebdomadaire : ce qui attend une décision
    python3 scripts/en_attente.py --valider PMID ...   # publie ces notices (ou --valider tout)
    python3 scripts/en_attente.py --refuser PMID ...   # les écarte définitivement (exclus.json)

Les PMID en attente sont dans data/en_attente.json ({pmid: {"themes": [...], "vu": "AAAA-MM-JJ"}}).
build_site.py ne publie pas une notice tant qu'elle y figure. Voir ROUTINE.md, « Point hebdomadaire du lundi ».
"""
import argparse
import datetime as dt
import glob
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
FILE = ROOT / "data/en_attente.json"
sys.path.insert(0, str(ROOT / "scripts"))
KEY = {"ma": "Méta-analyse", "sr": "Revue systématique", "umbrella": "Revue de revues", "guideline": "Recommandation", "rct": "Essai randomisé"}


def load():
    return json.loads(FILE.read_text()) if FILE.exists() else {}


def save(q):
    FILE.write_text(json.dumps(q, ensure_ascii=False, indent=1, sort_keys=True) + "\n")


def raw(topic):
    return json.loads((ROOT / "data/raw" / f"{topic}.json").read_text())


def ajouter():
    """Compare data/raw à la dernière version enregistrée dans git : tout PMID nouveau passe en attente."""
    q, n = load(), 0
    today = dt.date.today().isoformat()
    for f in sorted(glob.glob(str(ROOT / "data/raw/*.json"))):
        t = pathlib.Path(f).stem
        old = subprocess.run(["git", "show", f"HEAD:data/raw/{t}.json"], capture_output=True, text=True, cwd=ROOT)
        before = {r["pmid"] for r in json.loads(old.stdout)} if old.returncode == 0 and old.stdout.strip() else set()
        for r in raw(t):
            if r["pmid"] not in before:
                e = q.setdefault(r["pmid"], {"themes": [], "vu": today})
                if t not in e["themes"]:
                    e["themes"].append(t)
                    n += 1
    save(q)
    print(f"{n} nouvelle(s) publication(s) mise(s) en attente ; {len(q)} en attente au total")


def liste(as_json=False):
    from pertinence import is_pbm
    import importlib.util
    sys.argv = sys.argv[:1]
    spec = importlib.util.spec_from_file_location("bs", ROOT / "scripts/build_site.py")
    bs = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bs)
    q = load()
    fr = json.loads((ROOT / "data/titres_fr.json").read_text()) if (ROOT / "data/titres_fr.json").exists() else {}
    labels = {pathlib.Path(f).stem: json.loads(pathlib.Path(f).read_text()).get("label") for f in glob.glob(str(ROOT / "data/topics/*.json"))}
    out, seen = [], set()
    for f in sorted(glob.glob(str(ROOT / "data/raw/*.json"))):
        t = pathlib.Path(f).stem
        for r in raw(t):
            if r["pmid"] not in q or t not in q[r["pmid"]]["themes"]:
                continue
            ok, why = is_pbm(r)
            typ, lvl = bs.auto_type(r)
            out.append({"pmid": r["pmid"], "theme": t, "specialite": labels.get(t, t), "titre": r["title"], "titre_fr": fr.get(r["pmid"]),
                        "revue": r.get("journal_abbr"), "date": r.get("date_online") or r.get("date_pub"), "type": typ, "niveau": lvl,
                        "cle": typ in KEY, "pertinente": ok, "motif": why, "sous_themes": bs.auto_subgroups(t, r),
                        "conclusion": bs.conclusion(r, 260), "doublon": r["pmid"] in seen, "vu": q[r["pmid"]]["vu"]})
            seen.add(r["pmid"])
    if as_json:
        print(json.dumps(out, ensure_ascii=False, indent=1))
        return
    ok = [x for x in out if x["pertinente"]]
    print(f"# Publications en attente : {len({x['pmid'] for x in ok})} retenues par le tri, {len({x['pmid'] for x in out if not x['pertinente']})} écartées automatiquement\n")
    for t in sorted({x["theme"] for x in ok}):
        xs = [x for x in ok if x["theme"] == t]
        print(f"## {labels.get(t, t)} ({len(xs)})")
        for x in sorted(xs, key=lambda x: (not x["cle"], x["niveau"] or 9)):
            print(f"- {'★ ' + KEY[x['type']] if x['cle'] else x['type']} · PMID {x['pmid']} · {x['revue']} · {x['date']}\n  {x['titre_fr'] or x['titre']}"
                  + (f"\n  ({x['titre']})" if x["titre_fr"] else "") + f"\n  → {x['conclusion']}")
        print()
    off = [x for x in out if not x["pertinente"]]
    if off:
        print("## Écartées automatiquement (hors photobiomodulation)")
        for x in off:
            print(f"- PMID {x['pmid']} · {x['titre'][:110]} · {x['motif']}")


def valider(ids):
    q = load()
    ids = list(q) if ids == ["tout"] else ids
    n = sum(1 for p in ids if q.pop(p, None) is not None)
    save(q)
    print(f"{n} publication(s) validée(s) : elles seront publiées au prochain build ; {len(q)} restent en attente")


def refuser(ids):
    q, n = load(), 0
    for p in ids:
        e = q.pop(p, None)
        if not e:
            continue
        n += 1
        for t in e["themes"]:
            f = ROOT / "data/curation" / t / "exclus.json"
            cur = json.loads(f.read_text()) if f.exists() else []
            if p not in cur:
                f.write_text(json.dumps(sorted(cur + [p]), ensure_ascii=False, indent=1) + "\n")
    save(q)
    print(f"{n} publication(s) écartée(s) ; {len(q)} restent en attente")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--ajouter", action="store_true")
    ap.add_argument("--liste", action="store_true")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--valider", nargs="+")
    ap.add_argument("--refuser", nargs="+")
    a = ap.parse_args()
    if a.ajouter:
        ajouter()
    elif a.valider:
        valider(a.valider)
    elif a.refuser:
        refuser(a.refuser)
    else:
        liste(a.json)
