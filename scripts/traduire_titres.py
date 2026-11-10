#!/usr/bin/env python3
"""Traduit en français les titres des notices non lues (traduction automatique, signalée comme telle sur le site).

    python3 scripts/traduire_titres.py [--max 800]

Les traductions sont conservées dans data/titres_fr.json ({pmid: titre}) : un titre n'est traduit qu'une fois.
Les publications évaluées gardent le titre français rédigé à la main. Nécessite argostranslate (modèle
anglais → français, hors ligne) ; exécuté par les tâches « Veille hebdomadaire » et « Traduction des titres ».
"""
import argparse
import glob
import json
import pathlib
import re
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / "data/titres_fr.json"
# vocabulaire de la photobiomodulation : corrige les contresens fréquents de la traduction automatique
GLOSSAIRE = [
    (r"th[ée]rapie (?:au |par |à )?laser (?:de |à )?(?:faible|bas) niveau", "thérapie laser basse énergie"),
    (r"laser (?:de |à )?(?:faible|bas) niveau", "laser basse énergie"),
    (r"th[ée]rapie (?:par la |par |à la )?lumi[èe]re (?:de |à )?(?:faible|bas) niveau", "photobiomodulation"),
    (r"lumi[èe]re (?:de |à )?(?:faible|bas) niveau", "lumière de faible intensité"),
    (r"laser (?:de |à )?faible (?:puissance|intensit[ée])", "laser basse énergie"),
    (r"diode[s]? (?:[ée]lectroluminescente[s]?|[ée]mettrice[s]? de lumi[èe]re)", "LED"),
    (r"essai (?:clinique )?contr[ôo]l[ée] randomis[ée]", "essai randomisé"),
    (r"essai (?:clinique )?randomis[ée] contr[ôo]l[ée]", "essai randomisé"),
    (r"\bun examen syst[ée]matique", "une revue systématique"),
    (r"\bl'examen syst[ée]matique", "la revue systématique"),
    (r"examen syst[ée]matique", "revue systématique"),
    (r"m[ée]ta ?- ?analyse", "méta-analyse"),
    (r"mucosite", "mucite"),
    (r"blessure(s?) de la moelle", r"lésion\1 de la moelle"),
    (r"guérison des? (?:plaies|blessures)", "cicatrisation"),
    (r"guérison de la plaie", "cicatrisation"),
    (r"troisi[èe]me(s?) molaire", r"troisième\1 molaire"),
]


def polish(t: str) -> str:
    for rx, rep in GLOSSAIRE:
        t = re.sub(rx, rep, t, flags=re.I)
    t = re.sub(r"\s+", " ", t).strip()
    return t[:1].upper() + t[1:] if t else t


def pending(cache: dict) -> list:
    curated = set()
    for f in glob.glob(str(ROOT / "data/curation/*/[0-9]*.json")):
        curated |= {c["pmid"] for c in json.loads(pathlib.Path(f).read_text())}
    out, seen = [], set()
    for f in sorted(glob.glob(str(ROOT / "data/raw/*.json"))):
        for r in json.loads(pathlib.Path(f).read_text()):
            p = r["pmid"]
            if p in curated or p in cache or p in seen or not r.get("title"):
                continue
            if (r.get("language") or "eng").lower()[:2] == "fr":
                continue
            seen.add(p)
            out.append((r.get("date_online") or r.get("date_pub") or "", p, r["title"]))
    return [(p, t) for _, p, t in sorted(out, reverse=True)]  # les plus récentes d'abord


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max", type=int, default=800)
    ap.add_argument("--minutes", type=float, default=300, help="durée maximale")
    a = ap.parse_args()
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    todo = pending(cache)[: a.max]
    print(f"{len(todo)} titre(s) à traduire ({len(cache)} déjà traduits)")
    if not todo:
        return
    import argostranslate.package as pkg
    import argostranslate.translate as tr
    if not any(l.code == "fr" for l in tr.get_installed_languages()):
        pkg.update_package_index()
        pkg.install_from_path(next(p for p in pkg.get_available_packages() if p.from_code == "en" and p.to_code == "fr").download())
    t0 = time.time()
    for i, (pmid, title) in enumerate(todo, 1):
        try:
            fr = polish(tr.translate(title.rstrip("."), "en", "fr"))
        except Exception as e:  # un titre récalcitrant ne bloque pas le lot
            print("  échec", pmid, e)
            continue
        if fr and len(fr) > 8:
            cache[pmid] = fr
        if i % 200 == 0:
            CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=0, sort_keys=True) + "\n")
            print(f"  {i}/{len(todo)} · {time.time() - t0:.0f} s")
        if time.time() - t0 > a.minutes * 60:
            print("  durée maximale atteinte")
            break
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=0, sort_keys=True) + "\n")
    print(f"→ {len(cache)} titres traduits au total")


if __name__ == "__main__":
    main()
