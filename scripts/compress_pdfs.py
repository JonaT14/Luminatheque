#!/usr/bin/env python3
"""Allège les PDF volumineux (> 3 Mo) en recompressant leurs images (pypdf + Pillow)."""
import pathlib, sys
from pypdf import PdfReader, PdfWriter
ROOT = pathlib.Path(__file__).resolve().parent.parent
for p in sorted((ROOT / "pdfs").glob("*.pdf")):
    before = p.stat().st_size
    if before < 3e6:
        continue
    try:
        w = PdfWriter(clone_from=PdfReader(p))
        for page in w.pages:
            for img in page.images:
                im = img.image
                if max(im.size) > 1600:
                    im.thumbnail((1600, 1600))
                if im.mode not in ("RGB", "L"):
                    im = im.convert("RGB")
                img.replace(im, quality=65)
            page.compress_content_streams()
        tmp = p.with_suffix(".tmp")
        with open(tmp, "wb") as f:
            w.write(f)
        if tmp.stat().st_size < before:
            tmp.replace(p)
        else:
            tmp.unlink()
        print(f"{p.name}: {before/1e6:.1f} → {p.stat().st_size/1e6:.1f} Mo")
    except Exception as e:  # noqa: BLE001
        print(p.name, "non compressé :", e, file=sys.stderr)
