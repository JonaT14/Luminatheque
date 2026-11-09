"""QR codes des fiches patients (assets/fiches/qr/<id>.svg) : ils mènent à la version en ligne, toujours à jour.

Relancé automatiquement par scripts/fiches_pdf.py ; nécessite le paquet segno (pip install segno).
"""
import json
import pathlib

import segno

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://luminatheque.onrender.com"


def main():
    out = ROOT / "assets/fiches/qr"
    out.mkdir(parents=True, exist_ok=True)
    for f in json.loads((ROOT / "data/fiches_patients.json").read_text()):
        qr = segno.make(f"{SITE}/patients/{f['id']}", error="m")
        qr.save(str(out / f"{f['id']}.svg"), scale=4, border=2, dark="#24312f", light=None, xmldecl=False, svgns=True)
    print(f"QR codes : {out}")


if __name__ == "__main__":
    main()
