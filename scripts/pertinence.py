"""Pertinence PBM d'une notice : écarte les travaux hors sujet ramenés par les requêtes PubMed.

Une notice est gardée si son titre, son résumé ou ses descripteurs décrivent une intervention de
photobiomodulation (laser basse énergie, LED thérapeutique, lumière rouge ou proche infrarouge
appliquée au patient ou aux cellules…). Elle est écartée si :
  - aucune intervention de PBM n'y est décrite (le mot « laser » ou « LED » seul ne suffit pas :
    vélocimétrie laser, LED d'un capteur, laser Doppler…) ;
  - ou si son sujet principal est une autre technique (optogénétique, sonodynamique, photodynamique,
    photothermique, ablation…) sans que la PBM figure dans le titre.
Les fiches rédigées ne passent jamais par ce filtre. data/curation/<thème>/inclus.json force l'inclusion
d'une notice écartée à tort ; exclus.json reste l'exclusion manuelle.
"""
import re

PBM = re.compile(
    r"photobiomodulat|photo-biomodulat|\bPBMT?\b|low[- ](?:level|intensity|power|energy|dose)[- ](?:red[- ]|infrared[- ]|near[- ]infrared[- ])?(?:laser|light)|\bLLLT\b|\bLLLI\b|\bLILT\b|\bLPLI\b"
    r"|laser (?:therapy|treatment|irradiation|application|biostimulation|photobiostimulation|acupuncture|stimulation|photostimulation)"
    r"|(?:therapeutic|biostimulat\w*|soft|cold|diode|he-?ne|helium-neon|gaas|gaalas|ingaalp|infrared|nd:yag|class (?:iii|iv|3|4)b?)\s+lasers?\b"
    r"|high[- ]intensity laser|\bHILT\b|laser[- ]?acupuncture|laserpuncture|biostimulation|photostimulation|photobiostimulation"
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
    if OFF.search(title) and not in_title:
        return False, "autre technique (" + OFF.search(title).group(0).lower() + ")"
    if not (in_title or in_ab or in_meta):
        return False, "aucune intervention de PBM décrite"
    return True, ""
