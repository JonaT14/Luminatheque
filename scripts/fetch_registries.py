#!/usr/bin/env python3
"""
Luminathèque — essais déclarés dans les autres registres que ClinicalTrials.gov.

Usage : python3 scripts/fetch_registries.py

Source : le portail ICTRP de l'Organisation mondiale de la santé (trialsearch.who.int), qui rassemble
chaque semaine les registres primaires reconnus par l'OMS : ReBEC (Brésil), CTRI (Inde), IRCT (Iran),
ChiCTR (Chine), ANZCTR (Australie et Nouvelle-Zélande), ISRCTN (Royaume-Uni), DRKS (Allemagne),
CRIS (Corée), jRCT/JPRN (Japon), TCTR (Thaïlande), PACTR (Afrique), SLCTR (Sri Lanka), LBCTR (Liban),
registre néerlandais, EU-CTR… Les essais déjà présents dans ClinicalTrials.gov (identifiant NCT, ou
NCT cité en identifiant secondaire) sont écartés pour éviter les doublons.

Le registre européen CTIS ne contient que les essais de médicaments : aucun essai de photobiomodulation
n'y figure (les dispositifs médicaux relèvent d'EUDAMED, dont le module « investigations » n'est pas
encore public).

Statuts retenus (l'ICTRP ne distingue que « recrute » et « ne recrute pas ») :
  • RECRUITING : « Recruiting », déclaré il y a moins de 3 ans (au-delà, le statut n'est souvent plus tenu à jour) ;
  • NOT_YET_RECRUITING : « Not recruiting » avec un début des inclusions à venir (ou il y a moins de 2 mois) ;
  • ACTIVE_NOT_RECRUITING : « Not recruiting », début des inclusions il y a moins d'un an.
Écrit data/trials/registres_oms.json, au même format que data/trials/registre.json. Le tri se fait
dans data/curation/essais.json comme pour ClinicalTrials.gov (clé = identifiant du registre).
"""
from __future__ import annotations

import datetime as dt
import json
import pathlib
import re
import sys
import time
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

import requests

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from fetch_trials import NOT_PBM, PBM  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
PORTAL = "https://trialsearch.who.int/"
TERMS = ["photobiomodulation", "low level laser", "low-level laser therapy", "LLLT", "low intensity laser",
         "low power laser", "laser acupuncture", "high intensity laser therapy", "light emitting diode therapy",
         "near infrared light therapy", "red light therapy", "laser therapy"]
REGISTRY = {"REBEC": "ReBEC (Brésil)", "CTRI": "CTRI (Inde)", "IRCT": "IRCT (Iran)", "ChiCTR": "ChiCTR (Chine)",
            "ANZCTR": "ANZCTR (Australie)", "ISRCTN": "ISRCTN (Royaume-Uni)", "German Clinical Trials Register": "DRKS (Allemagne)",
            "CRIS": "CRIS (Corée)", "JPRN": "jRCT (Japon)", "TCTR": "TCTR (Thaïlande)", "PACTR": "PACTR (Afrique)",
            "SLCTR": "SLCTR (Sri Lanka)", "LBCTR": "LBCTR (Liban)", "NL-OMON": "OMON (Pays-Bas)", "EUCTR": "EU-CTR (Europe)",
            "CTIS": "CTIS (Europe)", "Clinical Trials Information System": "CTIS (Europe)", "ITMCTR": "ITMCTR (Chine)", "RPCEC": "RPCEC (Cuba)", "REPEC": "REPEC (Pérou)"}


class _Form(HTMLParser):
    def __init__(self):
        super().__init__(); self.fields = {}

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "input" and a.get("name") and a.get("type", "text") in ("hidden", "text"):
            self.fields[a["name"]] = a.get("value") or ""


def _form(html: str) -> dict:
    p = _Form(); p.feed(html); return p.fields


def export(term: str) -> bytes:
    """Recherche sur le portail puis « Export results to XML » → « Export all trials to XML »."""
    for attempt in range(4):
        try:
            s = requests.Session(); s.headers["User-Agent"] = "Mozilla/5.0 (Luminatheque, veille bibliographique)"
            f = _form(s.get(PORTAL, timeout=90).text) | {"TextBox1": term, "Button1": "Search"}
            r = s.post(PORTAL, data=f, timeout=300)
            if "records for" not in r.text and "No trials found" in r.text:
                return b""
            r = s.post(PORTAL, data=_form(r.text) | {"Button8": "Export results to XML"}, timeout=300)
            r = s.post(PORTAL, data=_form(r.text) | {"Button14": "Export all trials to XML"}, timeout=900)
            if "xml" in (r.headers.get("content-type") or ""):
                return r.content
            return b""
        except requests.RequestException:
            if attempt == 3:
                raise
            time.sleep(2 ** (attempt + 1))
    return b""


def pdate(s: str) -> str | None:
    s = (s or "").strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y%m%d", "%d %B %Y", "%B %d, %Y", "%Y/%m/%d"):
        try:
            return dt.datetime.strptime(s[:30].strip(), fmt).date().isoformat()
        except ValueError:
            continue
    m = re.search(r"(20\d\d|19\d\d)", s)
    return f"{m.group(1)}-01-01" if m else None


def clean(s: str) -> str:
    s = re.sub(r"<br\s*/?>", " ; ", s or "", flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s).strip(" ;")


def slim(x: ET.Element) -> dict:
    g = lambda k: (x.findtext(k) or "").strip()
    reg = g("Source_Register")
    design = g("Study_design").lower()
    first, last = g("Contact_Firstname"), g("Contact_Lastname")
    name = clean(f"{first} {last}") if (first or last) else ""
    conds = [c for c in (clean(c) for c in re.split(r";|<br\s*/?>", g("Condition"), flags=re.I)) if c and len(c) > 2][:6]
    interv = [c for c in (clean(c) for c in re.split(r"<br\s*/?>\s*<br\s*/?>|;", g("Intervention"), flags=re.I)) if c][:4]
    try:
        n = int(re.sub(r"[^\d]", "", g("Target_size").split(";")[0])[:6] or 0) or None
    except ValueError:
        n = None
    return {
        "nct": g("TrialID"), "registry": REGISTRY.get(reg, reg), "url": g("web_address") or None,
        "title": clean(g("Public_title")), "official": clean(g("Scientific_title")), "acronym": None,
        "ictrp_status": g("Recruitment_Status"), "start": pdate(g("Date_enrollement")), "end": None,
        "first_posted": pdate(g("Date_registration")), "updated": pdate(g("Last_Refreshed_on")),
        "type": "OBSERVATIONAL" if "observ" in g("Study_type").lower() else "INTERVENTIONAL",
        "phases": [], "n": n,
        "allocation": "NON_RANDOMIZED" if re.search(r"non[- ]?random", design) else "RANDOMIZED" if "random" in design else None,
        "masking": "DOUBLE" if re.search(r"double|triple|quadruple", design) else "SINGLE" if re.search(r"single|blind", design) else
                   "NONE" if re.search(r"open", design) else None,
        "conditions": conds, "interventions": [{"type": None, "name": i[:220]} for i in interv],
        "summary": clean(g("Intervention"))[:900], "outcome": clean(g("Primary_outcome").split(";")[0])[:300] or None,
        "sponsor": clean(g("Primary_sponsor")) or None, "sponsor_class": None,
        "collaborators": [c for c in (clean(c) for c in g("Source_Support").split(";")) if c and c != clean(g("Primary_sponsor"))][:4],
        "responsible": None,
        "officials": [{"name": name, "role": "CONTACT", "affiliation": clean(g("Contact_Affiliation"))}] if name else [],
        "countries": sorted({clean(c) for c in g("Countries").split(";") if clean(c)}),
        "sites": [], "n_sites": None,
        "secondary": g("Secondary_ID"),
    }


def status(s: dict, today: dt.date) -> str | None:
    st = s.pop("ictrp_status").lower()
    start = dt.date.fromisoformat(s["start"]) if s["start"] else None
    reg = dt.date.fromisoformat(s["first_posted"]) if s["first_posted"] else None
    if st == "recruiting":
        return "RECRUITING" if reg and (today - reg).days < 3 * 365 else None
    if start and (start - today).days > -60:
        return "NOT_YET_RECRUITING"
    if start and (today - start).days < 365:
        return "ACTIVE_NOT_RECRUITING"
    return None


def main() -> None:
    today = dt.date.today()
    ct = json.loads((ROOT / "data/trials/registre.json").read_text())["studies"] if (ROOT / "data/trials/registre.json").exists() else []
    known = {s["nct"] for s in ct}
    pool: dict[str, dict] = {}
    for term in TERMS:
        raw = export(term)
        if not raw:
            print(f"  « {term} » : aucun résultat"); continue
        try:
            trials = ET.fromstring(raw).findall("Trial")
        except ET.ParseError:
            print(f"  « {term} » : export illisible, ignoré"); continue
        kept = 0
        for x in trials:
            s = slim(x)
            if s["nct"].startswith("NCT") or s["nct"] in pool or re.search(r"NCT\d{8}", s["secondary"] or "") and set(re.findall(r"NCT\d{8}", s["secondary"])) & known:
                continue
            head = " ".join([s["title"], s["official"]] + [i["name"] for i in s["interventions"]])
            if not PBM.search(head) or NOT_PBM.search(s["title"] + " " + s["official"]):
                continue
            st = status(s, today)
            if not st:
                continue
            s["status"] = st; s.pop("secondary"); pool[s["nct"]] = s; kept += 1
        print(f"  « {term} » : {len(trials)} essais, {kept} nouveaux retenus")
        time.sleep(2)
    cur = json.loads((ROOT / "data/curation/essais.json").read_text())
    res = sorted(pool.values(), key=lambda s: s.get("start") or "", reverse=True)
    (ROOT / "data/trials/registres_oms.json").write_text(json.dumps({"fetched": today.isoformat(), "studies": res}, ensure_ascii=False, indent=1))
    todo = [s for s in res if s["nct"] not in cur["essais"] and s["nct"] not in cur["exclus"]]
    print(f"{len(res)} essais PBM hors ClinicalTrials.gov ; {len(todo)} à trier (ni rattachés ni exclus)")
    for s in todo:
        print(f"  {s['nct']} {s['status'][:4]} [{s['registry']}] {s['title'][:110]}")


if __name__ == "__main__":
    main()
