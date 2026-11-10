"""Contrôle qualité des fiches avant publication (appelé par build_site.py).

Erreurs bloquantes (le site n'est pas généré tant qu'elles existent) :
  E1  synthèse dont l'effectif « n » est en fait le nombre d'études incluses (le texte dit « 9 publications »,
      aucun « 9 patients ») : utiliser « k » pour le nombre d'études et « n » pour les participants ;
  E2  sous-thème (ctx) étranger à la spécialité (ex. « ATM » dans Cardiologie) ;
  E3  effectif invalide (non entier, nul ou négatif) ou « k » sur une étude qui n'est pas une synthèse ;
  E4  niveau de preuve incompatible avec le type d'étude (essai randomisé gradé 1, préclinique gradé 1 à 4,
      synthèse gradée 4…).
Avertissements (affichés, non bloquants) :
  W1  synthèse sans nombre d'études « k » alors que le texte en annonce un.
"""
import re

SYN = {"sr", "ma", "umbrella", "guideline"}
GENERIC = {"mixte", "autres", "général"}
NUM = {"deux": 2, "trois": 3, "quatre": 4, "cinq": 5, "six": 6, "sept": 7, "huit": 8, "neuf": 9, "dix": 10, "onze": 11, "douze": 12,
       "treize": 13, "quatorze": 14, "quinze": 15, "seize": 16, "vingt": 20, "trente": 30}
RX_STUDIES = re.compile(r"(\d+|" + "|".join(NUM) + r")\s+(?:publications?|études?|essais|ecr|rcts?|articles?|revues?|cohortes?|méta-analyses?|trials?|studies)\b", re.I)
RX_PEOPLE = re.compile(r"(\d[\d  ]*)\s+(?:patients?|participants?|personnes?|sujets?|enfants?|femmes?|hommes?|adultes?|volontaires?|athlètes?)\b", re.I)
LEVEL_OK = {"rct": {2, 3, 4, 5}, "preclinical": {5}, "review": {5}, "cases": {4, 5}, "cohort": {3, 4, 5}, "nrct": {3, 4, 5}}


def _nums(rx, text):
    out = set()
    for m in rx.finditer(text):
        v = m.group(1).replace(" ", "").replace(" ", "").lower()
        out.add(int(v) if v.isdigit() else NUM.get(v, -1))
    return out


def check_cards(topic_id, cards, allowed_ctx):
    errors, warnings = [], []
    allowed = set(allowed_ctx) | GENERIC
    for c in cards:
        pm, typ, n, k = c["pmid"], c.get("type"), c.get("n"), c.get("k")
        text = " ".join([c.get("l1") or "", c.get("l2") or ""])
        where = f"{topic_id}/{pm}"
        if n is not None and (not isinstance(n, int) or n <= 0):
            errors.append(f"E3 {where} : effectif invalide ({n!r})")
        if k is not None and typ not in SYN:
            errors.append(f"E3 {where} : « k » (nombre d'études) sur un type « {typ} » qui n'est pas une synthèse")
        if typ in SYN:
            studies, people = _nums(RX_STUDIES, text), _nums(RX_PEOPLE, text)
            if isinstance(n, int) and n in studies and n not in people:
                errors.append(f"E1 {where} : n = {n} correspond au nombre d'études cité dans le texte, pas à un nombre de participants "
                              f"(mettre k = {n} et n = total des participants, ou rien)")
            if k is None and studies:
                warnings.append(f"W1 {where} : synthèse sans « k » alors que le texte cite {sorted(studies)[0]} études")
        for ctx in c.get("ctx") or []:
            if ctx not in allowed:
                errors.append(f"E2 {where} : sous-thème « {ctx} » étranger à la spécialité {topic_id}")
        lvl = c.get("level")
        if lvl and typ in LEVEL_OK and lvl not in LEVEL_OK[typ]:
            errors.append(f"E4 {where} : niveau {lvl} incompatible avec le type « {typ} »")
        if lvl == 4 and typ in SYN:
            errors.append(f"E4 {where} : une synthèse ne peut pas être de niveau 4 (1 = essais randomisés, 3 = plans d'étude mêlés, 5 = préclinique)")
        if lvl == 1 and typ not in SYN:
            errors.append(f"E4 {where} : niveau 1 réservé aux synthèses d'essais (type « {typ} »)")
    return errors, warnings
