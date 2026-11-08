#!/usr/bin/env python3
"""
Luminathèque — essais en cours et projets en construction (registre ClinicalTrials.gov, API v2).

Usage : python3 scripts/fetch_trials.py [--topic X]

Pour chaque thème, interroge le registre avec les termes de photobiomodulation (intervention) et les
conditions du thème (champ « trials_cond » de data/topics/<thème>.json), sur les statuts :
  • en cours : RECRUITING, ENROLLING_BY_INVITATION, ACTIVE_NOT_RECRUITING ;
  • en construction : NOT_YET_RECRUITING.
Écrit data/trials/registre.json (porteurs : promoteur, investigateurs, partenaires, centres).
Le tri se fait dans data/curation/essais.json : « essais » {NCT: [thème, sous-groupe, titre français]}
et « exclus » [NCT…] (lasers ablatifs, lumière visuelle, imagerie proche infrarouge…).
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
import time

import requests

ROOT = pathlib.Path(__file__).resolve().parent.parent
API = "https://clinicaltrials.gov/api/v2/studies"
INTR = ('photobiomodulation OR "low-level laser" OR "low level laser" OR "low-intensity laser" OR LLLT OR PBMT '
        'OR "light-emitting diode" OR "LED therapy" OR "LED light" OR "near-infrared light" OR "red light" '
        'OR "laser acupuncture" OR "high-intensity laser" OR "high intensity laser" OR "laser therapy" '
        'OR "transcranial photobiomodulation" OR "light therapy"')
import re
PBM = re.compile(r"photobiomodul|low[- ]?level (laser|light)|low[- ]?(intensity|power|energy) laser|\blllt\b|\bpbmt?\b|light[- ]emitting diode|\bleds?\b|near[- ]?infrared|laser[- ]?acupunct|high[- ]?intensity laser|\bhilt\b|red light|infrared light|cold laser|class iv laser|therapeutic laser|laser therapy|laser treatment|transcranial (laser|light|near)|diode laser|he-?ne|ilib|blood irradiation", re.I)
NOT_PBM = re.compile(r"photodynamic|bright light|\blux\b|circadian|dawn|ablative|co2 laser|carbon dioxide laser|fractional|erbium|er:yag|nd:yag|pulsed dye|intense pulsed|\bipl\b|\buvb?\b|ultraviolet|narrow[- ]?band|excimer|flicker|gamma (sensory|stimulation)|40 ?hz|laser (ablation|surgery|resurfacing|hair removal|vaporization)|lithotripsy|thulium|holmium|picosecond|q-switched|interstitial thermal|litt\b|laser interstitial|vitrectomy|endovenous|vaginal (co2|erbium)", re.I)


def is_pbm(s: dict) -> bool:
    head = " ".join([s.get("title") or "", s.get("official") or ""] + [i.get("name") or "" for i in s["interventions"]])
    return bool(PBM.search(head + " " + (s.get("summary") or ""))) and not NOT_PBM.search(head)


STATUSES = ["RECRUITING", "ENROLLING_BY_INVITATION", "ACTIVE_NOT_RECRUITING", "NOT_YET_RECRUITING"]


def g(d, *path, default=None):
    for p in path:
        if not isinstance(d, dict):
            return default
        d = d.get(p)
    return d if d is not None else default


def slim(s: dict) -> dict:
    p = s["protocolSection"]
    ident, st, spons, desc = p.get("identificationModule", {}), p.get("statusModule", {}), p.get("sponsorCollaboratorsModule", {}), p.get("descriptionModule", {})
    design, arms, cont, outc = p.get("designModule", {}), p.get("armsInterventionsModule", {}), p.get("contactsLocationsModule", {}), p.get("outcomesModule", {})
    rp = spons.get("responsibleParty", {})
    locs = cont.get("locations", [])
    return {
        "nct": ident["nctId"], "title": ident.get("briefTitle"), "official": ident.get("officialTitle"), "acronym": ident.get("acronym"),
        "status": st.get("overallStatus"), "start": g(st, "startDateStruct", "date"), "end": g(st, "primaryCompletionDateStruct", "date"),
        "completion": g(st, "completionDateStruct", "date"), "first_posted": g(st, "studyFirstPostDateStruct", "date"),
        "updated": g(st, "lastUpdatePostDateStruct", "date"),
        "type": design.get("studyType"), "phases": design.get("phases", []), "n": g(design, "enrollmentInfo", "count"),
        "allocation": g(design, "designInfo", "allocation"), "masking": g(design, "designInfo", "maskingInfo", "masking"),
        "conditions": p.get("conditionsModule", {}).get("conditions", [])[:6],
        "interventions": [{"type": i.get("type"), "name": i.get("name")} for i in arms.get("interventions", [])][:6],
        "summary": (desc.get("briefSummary") or "")[:900],
        "outcome": (g(outc, "primaryOutcomes", default=[{}])[0] or {}).get("measure"),
        "sponsor": g(spons, "leadSponsor", "name"), "sponsor_class": g(spons, "leadSponsor", "class"),
        "collaborators": [c.get("name") for c in spons.get("collaborators", [])][:6],
        "responsible": {"name": rp.get("investigatorFullName"), "title": rp.get("investigatorTitle"),
                        "affiliation": rp.get("investigatorAffiliation")} if rp.get("investigatorFullName") else None,
        "officials": [{"name": o.get("name"), "role": o.get("role"), "affiliation": o.get("affiliation")} for o in cont.get("overallOfficials", [])][:4],
        "countries": sorted({l.get("country") for l in locs if l.get("country")}),
        "sites": [{"facility": l.get("facility"), "city": l.get("city"), "country": l.get("country")} for l in locs][:8],
        "n_sites": len(locs),
    }


def fetch(cond: str) -> list[dict]:
    out, token = [], None
    while True:
        params = {"query.intr": INTR, "query.cond": cond, "filter.overallStatus": ",".join(STATUSES), "pageSize": 100}
        if token:
            params["pageToken"] = token
        for attempt in range(4):
            try:
                r = requests.get(API, params=params, timeout=60); r.raise_for_status(); break
            except requests.RequestException:
                if attempt == 3:
                    raise
                time.sleep(2 ** attempt)
        d = r.json(); out += [slim(s) for s in d.get("studies", [])]
        token = d.get("nextPageToken")
        if not token:
            return out


def main() -> None:
    """Un seul registre pour tous les thèmes : chaque essai est ensuite rattaché à la main à un thème et
    à un sous-groupe (data/curation/essais.json, avec son titre français) ou exclu."""
    pool: dict[str, dict] = {}
    for t in sorted((ROOT / "data/topics").glob("*.json")):
        info = json.loads(t.read_text())
        if not info.get("trials_cond"):
            continue
        for s in fetch(info["trials_cond"]):
            if is_pbm(s):
                pool.setdefault(s["nct"], {**s, "matched": []})["matched"].append(t.stem)
    cur = json.loads((ROOT / "data/curation/essais.json").read_text()) if (ROOT / "data/curation/essais.json").exists() else {"essais": {}, "exclus": []}
    res = sorted(pool.values(), key=lambda s: s.get("start") or "", reverse=True)
    (ROOT / "data/trials").mkdir(exist_ok=True)
    (ROOT / "data/trials/registre.json").write_text(json.dumps({"fetched": dt.date.today().isoformat(), "studies": res}, ensure_ascii=False, indent=1))
    todo = [s for s in res if s["nct"] not in cur["essais"] and s["nct"] not in cur["exclus"]]
    print(f"{len(res)} essais PBM au registre ; {len(todo)} à trier (ni rattachés ni exclus)")
    for s in todo:
        print(f"  {s['nct']} {s['status'][:4]} [{','.join(s['matched'])}] {s['title'][:110]}")


if __name__ == "__main__":
    main()
