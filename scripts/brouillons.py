#!/usr/bin/env python3
"""
Luminathèque — brouillons de fiches préparés par Claude, validés par un humain.

Générer (clé ANTHROPIC_API_KEY, paquet « anthropic ») :
  python3 scripts/brouillons.py --tous [--max 30]       études clés sans fiche, les plus récentes d'abord
  python3 scripts/brouillons.py --theme orl [--max 10]
  python3 scripts/brouillons.py --theme orl --pmid 42982684
  python3 scripts/brouillons.py --tous --requete         affiche la requête sans appeler l'API (contrôle, coût)
Appliquer les décisions prises sur la page « Brouillons » du site (data/brouillons/decisions/*.json) :
  python3 scripts/brouillons.py --appliquer

Candidates : notices sans fiche ni exclusion qui sont des essais randomisés, méta-analyses, revues systématiques
ou recommandations (type PubMed), ou dont le titre l'annonce (PubMed n'a souvent pas encore typé les articles
récents). Claude reçoit le résumé, le texte intégral quand il existe (data/fulltext/<PMID>.txt), le schéma
des fiches, les sous-groupes du thème et des fiches de référence ; il rend une fiche complète, la liste des
points à vérifier, et peut proposer d'écarter l'étude si elle est hors sujet.
Chaque brouillon est écrit dans data/brouillons/<thème>/<PMID>.json et n'apparaît sur le site que dans la
rubrique « Brouillons », jamais parmi les fiches, tant qu'il n'a pas été validé.

Modèle : variable LUMINA_MODELE, sinon le modèle Opus le plus récent proposé par l'API (liste des modèles).
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from build_site import ROOT, auto_type, conclusion  # noqa: E402

BR = ROOT / "data/brouillons"
KEY_TYPES = ("rct", "ma", "sr", "guideline", "umbrella")
TITLE_RX = re.compile(r"randomi[sz]ed|meta-analy|systematic review|guideline|consensus|umbrella review", re.I)
CTX_FALLBACK = {"mucite-orale": ["ORL", "chimio", "CSH", "mixte"],
                "neuropathie-peripherique": ["CIPN", "diabète", "compression", "lésion nerveuse", "orofaciale", "autres"]}
TYPES = ["ma", "sr", "umbrella", "guideline", "rct", "nrct", "cohort", "cases", "review", "preclinical", "protocol",
         "survey", "qualitative", "biblio", "methodo", "letter"]

SYSTEM = """Tu rédiges des fiches de veille scientifique pour Luminathèque, un site francophone de veille sur la \
photobiomodulation (PBM : laser basse énergie, LED, laser haute intensité thérapeutique, lumière rouge et proche \
infrarouge, laser-acupuncture). Les lecteurs sont des praticiens (médecins, dentistes, kinésithérapeutes, sages-femmes) \
qui veulent savoir vite ce qu'une étude apporte et ce qu'elle vaut.

Ta fiche est un BROUILLON relu ensuite par un humain avant publication. Sois exact plutôt que complet : n'invente \
aucun chiffre, aucun paramètre, aucun résultat qui ne figure pas dans le texte fourni. Si une information manque, \
laisse le champ vide (liste vide, null) et signale-le dans « a_verifier ».

Pertinence : si l'étude ne porte pas sur la photobiomodulation (laser chirurgical ou ablatif, photothérapie dynamique, \
lumière vive circadienne, UV, laser de polymérisation, décontamination par laser haute puissance…) ou ne relève pas \
du thème indiqué, mets « pertinent » à false, explique pourquoi dans « raison_exclusion », et remplis quand même la \
fiche au mieux.

Champs de la fiche :
- title_fr : titre en français, informatif et court (pas une traduction mot à mot), qui dit l'intervention, \
la population et le type d'étude si utile.
- type : ma (méta-analyse), sr (revue systématique sans méta-analyse), umbrella (revue de revues), guideline \
(recommandation, consensus), rct (essai randomisé), nrct (essai contrôlé non randomisé), cohort, cases (série de cas), \
review (revue narrative), preclinical (animal, cellules), protocol (protocole sans résultats), survey, qualitative, \
biblio, methodo, letter.
- level : niveau de preuve 1 à 5 (0 = non gradé) : 1 synthèse d'essais randomisés · 2 essai randomisé · 3 essai \
contrôlé non randomisé ou revue mixte · 4 cohorte sans témoin concurrent, série · 5 avis, mécanismes, préclinique.
- pop : adulte, pédiatrie, mixte ou « — ».
- ctx : un ou plusieurs sous-groupes du thème, choisis UNIQUEMENT dans la liste fournie.
- aim : prévention, traitement, les deux, ou « — ».
- mode : modalités, par exemple « laser », « LED », « intrabuccal », « extrabuccal », « transcrânien », \
« haute intensité », « domicile », « laser-acupuncture ».
- nm : longueurs d'onde en nm (nombres), seulement celles citées.
- n : effectif (patients ; nombre d'études pour une méta-analyse si l'effectif total n'est pas donné), ou null.
- effect : favorable, neutre, mitigé, défavorable (au regard de la PBM) ou « — » si sans objet (protocole, revue sans conclusion).
- theme : thème court réutilisable d'une fiche à l'autre (ex. « Douleur orthodontique », « Lymphœdème du bras »).
- key : true seulement pour une étude marquante (grand essai multicentrique, méta-analyse de référence, recommandation).
- l1 : niveau « Express », une à deux phrases avec le résultat principal chiffré.
- l2 : niveau « Essentiel », un à deux paragraphes séparés par une ligne vide : plan d'étude, population, protocole \
de PBM (longueur d'onde, puissance, dose, séances), critères et résultats chiffrés.
- l3 : niveau « Approfondi » : points (3 à 6 éléments de méthode et de résultats), limites (2 à 5), pratique \
(une à deux phrases : ce que le praticien peut en retenir, avec prudence).
- a_verifier : ce que le relecteur doit contrôler (chiffre ambigu, paramètre absent du résumé, doute sur le sous-groupe…).

Style : français clair et sobre, phrases courtes, pas de superlatifs, unités françaises (virgule décimale, « J/cm² », \
« mW », « nm »), abréviations expliquées à leur première apparition dans l2. Respecte le ton et la densité des fiches \
de référence."""


def schema(ctx: list[str]) -> dict:
    s, arr = {"type": "string"}, lambda it: {"type": "array", "items": it}
    return {"type": "object", "additionalProperties": False, "required": [
        "pertinent", "raison_exclusion", "title_fr", "type", "level", "pop", "ctx", "aim", "mode", "nm", "n", "effect",
        "theme", "key", "l1", "l2", "l3", "a_verifier"], "properties": {
        "pertinent": {"type": "boolean"}, "raison_exclusion": s, "title_fr": s, "type": {"type": "string", "enum": TYPES},
        "level": {"type": "integer", "enum": [0, 1, 2, 3, 4, 5]}, "pop": {"type": "string", "enum": ["adulte", "pédiatrie", "mixte", "—"]},
        "ctx": arr({"type": "string", "enum": ctx}), "aim": {"type": "string", "enum": ["prévention", "traitement", "les deux", "—"]},
        "mode": arr(s), "nm": arr({"type": "number"}), "n": {"anyOf": [{"type": "integer"}, {"type": "null"}]},
        "effect": {"type": "string", "enum": ["favorable", "neutre", "mitigé", "défavorable", "—"]}, "theme": s, "key": {"type": "boolean"},
        "l1": s, "l2": s, "l3": {"type": "object", "additionalProperties": False, "required": ["points", "limites", "pratique"],
                                 "properties": {"points": arr(s), "limites": arr(s), "pratique": s}},
        "a_verifier": arr(s)}}


def topic_info(tid: str) -> dict:
    t = json.loads((ROOT / "data/topics" / f"{tid}.json").read_text())
    t["ctx"] = t.get("subgroups") or CTX_FALLBACK.get(tid, ["autres"])
    return t


def cards(tid: str) -> list[dict]:
    return [c for f in sorted((ROOT / "data/curation" / tid).glob("[0-9]*.json")) for c in json.loads(f.read_text())]


def references(tid: str) -> list[dict]:
    """Fiches de référence : les plus détaillées du thème, complétées par celles des autres thèmes."""
    rich = lambda cs: sorted((c for c in cs if c.get("l3", {}).get("points") and c.get("type") in KEY_TYPES),
                             key=lambda c: -len(c.get("l2", "")))
    own = rich(cards(tid))[:2]
    other = [c for t in ("mucite-orale", "musculo-squelettique") if t != tid for c in rich(cards(t))[:1]]
    return (own + other)[:3]


def candidates(tid: str) -> list[dict]:
    done = {c["pmid"] for c in cards(tid)}
    cur = ROOT / "data/curation" / tid
    excl = set(json.loads((cur / "exclus.json").read_text())) if (cur / "exclus.json").exists() else set()
    drafted = {p.stem for p in (BR / tid).glob("*.json")} if (BR / tid).exists() else set()
    out = []
    for r in json.loads((ROOT / "data/raw" / f"{tid}.json").read_text()):
        if r["pmid"] in done | excl | drafted:
            continue
        if auto_type(r)[0] in KEY_TYPES or (TITLE_RX.search(r["title"]) and not re.search(r"\bprotocol\b", r["title"], re.I)):
            out.append(r)
    return sorted(out, key=lambda r: r.get("date_online") or r.get("date_pub") or "", reverse=True)


def abstract_text(r: dict) -> str:
    return "\n".join((f"{p['label']}: " if p.get("label") else "") + p["text"] for p in (r.get("abstract") or []))


def request(tid: str, r: dict) -> dict:
    t = topic_info(tid)
    refs = references(tid)
    ft = ROOT / "data/fulltext" / f"{r['pmid']}.txt"
    topic_block = (f"Thème : {t['label']} — {t.get('description', '')}\nSous-groupes autorisés pour « ctx » : "
                   + ", ".join(t["ctx"]) + "\n\nFiches de référence (ton, densité, format) :\n"
                   + "\n".join(json.dumps(c, ensure_ascii=False) for c in refs))
    doc = (f"PMID {r['pmid']} · {r.get('journal') or ''} · mise en ligne {r.get('date_online') or r.get('date_pub') or '?'}\n"
           f"Types PubMed : {', '.join(r.get('pub_types') or []) or 'non renseignés'}\n"
           f"Titre : {r['title']}\n\nRésumé :\n{abstract_text(r) or '(pas de résumé)'}\n")
    if ft.exists():
        doc += f"\nTexte intégral (accès libre) :\n{ft.read_text()}\n"
    return {
        "max_tokens": 16000,
        # 1er bloc : consignes communes (mis en cache) ; 2e bloc : thème et fiches de référence (mis en cache par thème)
        "system": [{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}},
                   {"type": "text", "text": topic_block, "cache_control": {"type": "ephemeral"}}],
        "messages": [{"role": "user", "content": doc + "\nRédige la fiche de cette étude."}],
        "output_config": {"effort": "high", "format": {"type": "json_schema", "schema": schema(t["ctx"])}},
    }


def pick_model(client) -> str:
    if os.environ.get("LUMINA_MODELE"):
        return os.environ["LUMINA_MODELE"]
    models = [m.id for m in client.models.list()]          # du plus récent au plus ancien
    return next((m for m in models if "opus" in m), models[0])


def generate(tid: str, rs: list[dict], show: bool) -> None:
    if show:
        for r in rs[:1]:
            q = request(tid, r)
            print(json.dumps({**q, "system": [b["text"][:400] + "…" for b in q["system"]]}, ensure_ascii=False, indent=1)[:6000])
        return
    import anthropic  # importé ici : inutile pour --appliquer et --requete
    client = anthropic.Anthropic()
    model = pick_model(client)
    print(f"[{tid}] {len(rs)} brouillon(s) à préparer")
    (BR / tid).mkdir(parents=True, exist_ok=True)
    for r in rs:
        try:
            with client.messages.stream(model=model, **request(tid, r)) as stream:
                msg = stream.get_final_message()
        except anthropic.RateLimitError:
            print("  limite de débit atteinte : arrêt, la suite au prochain passage"); return
        except anthropic.APIStatusError as e:
            print(f"  {r['pmid']} : erreur API {e.status_code} {e.message[:120]}"); continue
        except anthropic.APIConnectionError:
            print(f"  {r['pmid']} : erreur réseau"); continue
        if msg.stop_reason != "end_turn":
            print(f"  {r['pmid']} : réponse incomplète ({msg.stop_reason})"); continue
        data = json.loads(next(b.text for b in msg.content if b.type == "text"))
        fiche = {"pmid": r["pmid"], **{k: data[k] for k in ("title_fr", "type", "level", "pop", "ctx", "aim", "mode", "nm", "n",
                                                           "effect", "theme", "l1", "l2", "l3")}}
        if data.get("key"):
            fiche["key"] = True
        out = {"pmid": r["pmid"], "theme": tid, "genere": dt.date.today().isoformat(), "par": "Claude",
               "pertinent": data["pertinent"], "raison_exclusion": data["raison_exclusion"],
               "a_verifier": data["a_verifier"], "texte_integral": (ROOT / "data/fulltext" / f"{r['pmid']}.txt").exists(),
               "fiche": fiche}
        (BR / tid / f"{r['pmid']}.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
        u = msg.usage
        print(f"  {r['pmid']} {'✓' if data['pertinent'] else '✗ hors sujet ?'} {fiche['title_fr'][:80]}"
              f"  (entrée {u.input_tokens}, cache {u.cache_read_input_tokens or 0}, sortie {u.output_tokens})")


def apply_decisions() -> None:
    """Décisions de la page « Brouillons » : valider (avec les corrections) → fiche ; exclure → exclus.json."""
    files = sorted((BR / "decisions").glob("*.json"))
    n_ok = n_ex = 0
    for f in files:
        for d in json.loads(f.read_text()):
            tid, pmid = d["theme"], str(d["pmid"])
            if not re.fullmatch(r"[a-z-]+", tid) or not re.fullmatch(r"\d+", pmid):
                continue
            cur = ROOT / "data/curation" / tid
            draft = BR / tid / f"{pmid}.json"
            if pmid in {c["pmid"] for c in cards(tid)}:
                draft.unlink(missing_ok=True); continue
            if d["action"] == "valider":
                card = d.get("fiche") or json.loads(draft.read_text())["fiche"]
                card["pmid"] = pmid
                raw = {x["pmid"]: x for x in json.loads((ROOT / "data/raw" / f"{tid}.json").read_text())}
                year = ((raw.get(pmid) or {}).get("date_online") or dt.date.today().isoformat())[:4]
                dest = cur / f"{year}-valides.json"
                xs = json.loads(dest.read_text()) if dest.exists() else []
                xs.append(card)
                dest.write_text(json.dumps(xs, ensure_ascii=False, indent=1) + "\n")
                n_ok += 1
            elif d["action"] == "exclure":
                ex = cur / "exclus.json"
                xs = json.loads(ex.read_text()) if ex.exists() else []
                if pmid not in xs:
                    xs.append(pmid)
                ex.write_text(json.dumps(sorted(xs), ensure_ascii=False, indent=1) + "\n")
                n_ex += 1
            else:
                continue
            draft.unlink(missing_ok=True)
        f.unlink()
    print(f"{len(files)} fichier(s) de décisions : {n_ok} fiche(s) validée(s), {n_ex} étude(s) exclue(s)")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--theme"); ap.add_argument("--tous", action="store_true"); ap.add_argument("--pmid")
    ap.add_argument("--max", type=int, default=30, help="nombre maximal de brouillons par passage (tous thèmes confondus)")
    ap.add_argument("--requete", action="store_true", help="affiche la première requête sans appeler l'API")
    ap.add_argument("--appliquer", action="store_true", help="applique les décisions de data/brouillons/decisions/")
    a = ap.parse_args()
    if a.appliquer:
        return apply_decisions()
    tids = [a.theme] if a.theme else sorted(t.stem for t in (ROOT / "data/raw").glob("*.json")) if a.tous else []
    if not tids:
        ap.error("préciser --theme X, --tous ou --appliquer")
    pool = []
    for tid in tids:
        rs = candidates(tid)
        if a.pmid:
            rs = [r for r in json.loads((ROOT / "data/raw" / f"{tid}.json").read_text()) if r["pmid"] == a.pmid]
        print(f"[{tid}] {len(rs)} étude(s) clé(s) sans fiche ni brouillon")
        pool += [(tid, r) for r in rs]
    pool.sort(key=lambda x: x[1].get("date_online") or x[1].get("date_pub") or "", reverse=True)
    pool = pool[: a.max]
    for tid in dict.fromkeys(t for t, _ in pool):
        generate(tid, [r for t, r in pool if t == tid], a.requete)


if __name__ == "__main__":
    main()
