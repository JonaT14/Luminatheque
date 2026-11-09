"""Génère les PDF A4 des fiches patients (assets/fiches/pdf/<id>.pdf) à partir des pages du site.

À relancer après toute modification de data/fiches_patients.json :
    python3 scripts/build_site.py && python3 scripts/fiches_pdf.py
Nécessite Node et Playwright (Chromium). Les PDF sont versionnés : Render ne les régénère pas.
"""
import json
import pathlib
import subprocess
import sys
import tempfile
import threading
import http.server
import functools
import os

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/fiches/pdf"


class SPA(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.path.split("?")[0]
        if path != "/" and not (ROOT / path.lstrip("/")).is_file():
            self.path = "/index.html"
        return super().send_head()

    def log_message(self, *a):
        pass


def main():
    ids = [f["id"] for f in json.loads((ROOT / "data/fiches_patients.json").read_text())]
    OUT.mkdir(parents=True, exist_ok=True)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(SPA, directory=str(ROOT)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{srv.server_address[1]}"
    js = """
const { chromium } = require('playwright');
const [base, out, ...ids] = process.argv.slice(2);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  for (const id of ids) { await p.goto(`${base}/patients/${id}`); await p.waitForSelector('.ps-stat, .ps-ev p');
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300); await p.emulateMedia({ media: 'print' });
    await p.pdf({ path: `${out}/${id}.pdf`, format: 'A4', printBackground: true, preferCSSPageSize: true });
    await p.emulateMedia({ media: 'screen' }); console.log(id); }
  await b.close(); })();
"""
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(js)
    env = dict(os.environ)
    r = subprocess.run(["node", f.name, base, str(OUT), *ids], env=env)
    srv.shutdown()
    sys.exit(r.returncode)


if __name__ == "__main__":
    main()
