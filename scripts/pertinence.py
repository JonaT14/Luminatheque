"""Pertinence PBM d'une notice : écarte les travaux hors sujet ramenés par les requêtes PubMed.

Une notice est gardée si son titre, son résumé ou ses descripteurs décrivent une intervention de
photobiomodulation (laser basse énergie, LED thérapeutique, lumière rouge ou proche infrarouge
appliquée au patient ou aux cellules…). Elle est écartée si :
  - aucune intervention de PBM n'y est décrite (le mot « laser » ou « LED » seul ne suffit pas :
    vélocimétrie laser, LED d'un capteur, laser Doppler…) ;
  - ou si son sujet principal est une autre technique (optogénétique, sonodynamique, photodynamique,
    photothermique, ablation…) sans que la PBM figure dans le titre.
La photobiomodulation est une lumière de faible intensité (laser basse énergie, ou LLLT, et LED). Les lasers de
forte puissance (HILT, classe 4), CO2, Er:YAG, Nd:YAG, excimer, à colorant pulsé, la lumière pulsée intense et les
lasers chirurgicaux n'en font pas partie : une étude qui ne porte que sur eux est écartée, sauf si elle les compare
à un bras de faible intensité. Cette règle (non_pbm_laser) s'applique aussi aux fiches rédigées. data/curation/<thème>/inclus.json force l'inclusion
d'une notice écartée à tort ; exclus.json reste l'exclusion manuelle.
"""
import re

PBM = re.compile(
    r"photobiomodulat|photo-biomodulat|\bPBMT?\b|low[- ](?:level|intensity|power|energy|dose)[- ](?:red[- ]|infrared[- ]|near[- ]infrared[- ])?(?:laser|light)|\bLLLT\b|\bLLLI\b|\bLILT\b|\bLPLI\b"
    r"|laser (?:therapy|treatment|irradiation|application|biostimulation|photobiostimulation|acupuncture|stimulation|photostimulation)"
    r"|(?:therapeutic|biostimulat\w*|soft|cold|diode|he-?ne|helium-neon|gaas|gaalas|ingaalp|infrared|class (?:iii|3)b?)\s+lasers?\b"
    r"|laser[- ]?acupuncture|laserpuncture|biostimulation|photostimulation|photobiostimulation"
    r"|(?:\bLED|light[- ]emitting diodes?)[^.;]{0,60}(?:therap|treat|irradiat|exposure|photobiomod|phototherap|stimulat|appli)"
    r"|(?:therap|treat|irradiat|exposure|phototherap|stimulat)\w*[^.;]{0,40}(?:\bLEDs?\b|light[- ]emitting diodes?)"
    r"|red[- ]light (?:therapy|treatment|irradiation|exposure)|repeated low[- ]level red|\bRLRL\b|near[- ]infrared (?:light|laser|irradiation|therapy|stimulation|photobiomod)"
    r"|(?:red|infrared|NIR) light[^.;]{0,30}(?:therap|treat|irradiat|exposure|stimulat)|transcranial (?:light|laser|near|infrared|photo)"
    r"|intravenous laser|intravascular laser|laser blood irradiation|blood irradiation|\bILIB\b|\bILBI\b|\bIVLBI\b"
    r"|polari[sz]ed (?:polychromatic )?light|bioptron|monochromatic infrared|light therapy|phototherapy|photon therapy|laser(?:s)? (?:was|were) (?:used|applied|delivered)",
    re.I)
OFF = re.compile(
    r"optogenet|sonodynamic|photodynamic|\bPDT\b|photothermal|photoacoustic|velocimetr|particle (?:image|tracking)|laser doppler|laser speckle"
    r"|ablation|lithotrips|laser capture|confocal|optical coherence|\bOCT\b|flow cytometr|mass spectrometr|laser[- ]induced breakdown|lidar"
    r"|excimer|fractional (?:co2|carbon dioxide|laser)|co2 laser resurfacing|laser hair removal|tattoo removal|vein (?:closure|ablation)|endovenous",
    re.I)


# Lasers qui ne relèvent pas de la photobiomodulation : forte puissance (effet thermique), ablatifs, chirurgicaux,
# vasculaires ou pigmentaires. La PBM est une lumière de faible intensité : laser basse énergie (LLLT) et LED.
NON_PBM = re.compile(
    r"high[- ]intensity laser|high[- ]power(?:ed)? laser|high[- ]level laser|high[- ]energy laser|\bHILT\b|\bHPLT\b|\bHLLT\b|class (?:iv|4)\b|hilterapia|"
    r"\bCO ?2\b[^.]{0,20}laser|carbon dioxide laser|(?<!non-)(?<!non )fractional|(?<!non-)(?<!non )(?<!non)ablati|er(?:bium)?\s?[:,]?\s?(?:yag|cr|glass)|er,cr|nd\s?[:\- ]?\s?yag|neodymium|ho\s?[:\- ]?\s?yag|holmium|picosecond|q-switched|\bKTP\b|alexandrite|"
    r"excimer|pulsed[- ]dye|\bPDL\b|intense pulsed light|\bIPL\b|laser (?:surgery|excision|ablation|resurfacing|lithotripsy|coagulation|photocoagulation|frenectomy|gingivectomy|vaporization)|"
    r"surgical laser|laser-assisted (?:surgery|new attachment)|\bLANAP\b|photocoagulation|photothermal|laser hair removal", re.I)
LOW_LEVEL = re.compile(
    r"photobiomodulat|photo-biomodulat|low[- ](?:level|intensity|power|energy|dose|reactive|fluence)[- ](?:red[- ]|infrared[- ]|near[- ]infrared[- ]|diode[- ])?(?:laser|light)|"
    r"\bLLLT\b|\bPBMT?\b|\bLILT\b|\bLLLI\b|\bLPLI\b|light[- ]emitting diode|\bLEDs?\b|laser[- ]?acupuncture|laserpuncture|red[- ]light|near[- ]infrared (?:light|photo)|"
    r"biostimulat|photostimulat|soft[- ]laser|cold[- ]laser|low-level|low-intensity|laser phototherapy|therapeutic laser|polari[sz]ed light|monochromatic infrared|"
    r"intravascular laser|blood irradiation|\bILIB\b", re.I)


# Laser de forte puissance présenté comme « photobiomodulation » : hors champ sauf s'il est comparé à un bras de faible intensité.
HIGH_POWER = re.compile(r"(?:high[- ](?:intensity|power(?:ed)?|level|energy)|class (?:iv|4))[^.:;]{0,30}(?:laser|photobiomodulat)|\bHILT\b|\bHPLT\b", re.I)
LOW_ARM = re.compile(r"low[- ](?:level|intensity|power|energy)|\bLLLT\b|\bLILT\b|light[- ]emitting|\bLEDs?\b", re.I)
# Laser YAG, CO2, excimer… « à faible dose » : hors champ sauf comparaison ou association avec une vraie PBM.
HARD_LASER = re.compile(r"\b(?:er|nd|ho)\s?[:,\- ]\s?yag|er,cr|\bCO ?2\b|carbon dioxide|excimer|intense pulsed light|\bIPL\b|pulsed[- ]dye", re.I)
LINK = re.compile(r"\b(?:versus|vs\.?|compar\w+|and|with|adjunct\w*|combin\w+|after|following|plus|or|post\w*)\b", re.I)


def non_pbm_laser(r):
    """Motif d'exclusion si l'étude porte sur un laser hors PBM sans bras de faible intensité, sinon ''."""
    title, ab, _ = text_of(r)
    m = HIGH_POWER.search(title)
    if m and not LOW_ARM.search(title):
        return "laser de forte puissance, hors photobiomodulation (" + m.group(0).lower()[:40] + ")"
    m = HARD_LASER.search(title)
    # gardé seulement si le titre nomme une source de PBM distincte (LED, diode, laser basse énergie) et que le
    # « faible niveau » ne qualifie pas le laser YAG ou CO2 lui-même (« low-level Er:YAG », « Nd:YAG biostimulation »)
    own = re.search(r"low[- ]level (?:er|nd|ho|carbon|co ?2)|(?:yag|co ?2|dioxide)(?:(?! and | versus | vs\\.? | with | plus | or | combined )[^.;:]){0,25}(?:low[- ]level|biostimulat|photobiomodulat|based low)", title, re.I)
    other = re.search(r"light[- ]emitting|\bLEDs?\b|diode|low[- ]level (?:laser|light)|\bLLLT\b|photobiomodulat|low-level green", title, re.I)
    if m and (own or not (other and LINK.search(title))):
        return "laser hors photobiomodulation (" + m.group(0).lower() + ")"
    m = NON_PBM.search(title)
    if m and not LOW_LEVEL.search(title):
        return "laser hors photobiomodulation (" + m.group(0).lower() + ")"
    if not m and not LOW_LEVEL.search(title):
        m = NON_PBM.search(ab)
        if m and not LOW_LEVEL.search(ab):
            return "laser hors photobiomodulation (" + m.group(0).lower() + ")"
    return ""


def text_of(r):
    ab = " ".join(x["text"] if isinstance(x, dict) else str(x) for x in (r.get("abstract") or []))
    return r.get("title") or "", ab, " ".join((r.get("mesh") or []) + (r.get("keywords") or []))


def is_pbm(r):
    """(gardée, motif) pour une notice brute PubMed."""
    title, ab, meta = text_of(r)
    if "Low-Level Light Therapy" in (r.get("mesh") or []) or "Phototherapy" in (r.get("mesh") or []):
        in_meta = True
    else:
        in_meta = bool(PBM.search(meta))
    in_title, in_ab = bool(PBM.search(title)), bool(PBM.search(ab))
    why = non_pbm_laser(r)
    if why:
        return False, why
    if OFF.search(title) and not in_title:
        return False, "autre technique (" + OFF.search(title).group(0).lower() + ")"
    if not (in_title or in_ab or in_meta):
        return False, "aucune intervention de PBM décrite"
    return True, ""
