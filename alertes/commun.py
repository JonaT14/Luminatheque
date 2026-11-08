"""
Luminathèque — alertes par mail : éléments communs au service d'abonnement (app.py) et à l'envoi (envoi.py).

• Préférences : chaîne compacte stockée dans l'attribut Brevo LUMINA_PREFS (≤ 250 caractères)
    « 1;h;5;fne;de,od.0.3,np »
     │  │ │  │   └ thèmes (code à 2 lettres de data/topics/*.json), suivis des sous-groupes choisis
     │  │ │  │     (index dans la liste « subgroups » du thème) ; sans index = tout le thème
     │  │ │  └ contenus : f = fiches rédigées, n = toutes les nouvelles publications, e = essais
     │  │ └ niveau de preuve maximal des publications (1 = synthèses d'essais … 5 = tout)
     │  └ fréquence : h = hebdomadaire, m = mensuelle
     └ version du format
• Jetons : HMAC-SHA256 de l'adresse avec ALERTES_SECRET. Ils servent de « compte sans mot de passe » :
  chaque mail contient un lien personnel pour modifier ses choix ou se désabonner.
• Stockage : contacts Brevo (attributs LUMINA_*), ou fichier local en développement (sans BREVO_API_KEY).
• Envoi : API transactionnelle Brevo, ou fichiers HTML dans alertes/.dev/boite/ en développement.
"""
from __future__ import annotations

import base64
import datetime as dt
import hashlib
import hmac
import html
import json
import os
import pathlib
import re
import urllib.parse

import requests

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEV = pathlib.Path(__file__).resolve().parent / ".dev"
SITE_URL = os.environ.get("SITE_URL", "https://luminatheque.onrender.com").rstrip("/")
API_URL = os.environ.get("ALERTES_URL", "https://luminatheque-alertes.onrender.com").rstrip("/")
SECRET = os.environ.get("ALERTES_SECRET", "secret-de-developpement")
SENDER = {"name": os.environ.get("SENDER_NAME", "Luminathèque"), "email": os.environ.get("SENDER_EMAIL", "alertes@example.org")}
BREVO = "https://api.brevo.com/v3"
ATTRS = ("LUMINA_PREFS", "LUMINA_STATUT", "LUMINA_ENVOI", "LUMINA_DATE")
PREFS_RX = re.compile(r"^1;[hm];[1-5];[fne]{1,3};[a-z]{2}(\.\d{1,2})*(,[a-z]{2}(\.\d{1,2})*)*$")
EMAIL_RX = re.compile(r"^[^@\s<>\"']{1,64}@[^@\s<>\"']{1,255}\.[a-z]{2,}$", re.I)


# ---------------------------------------------------------------- préférences
def topics() -> list[dict]:
    out = []
    for f in sorted((ROOT / "data/topics").glob("*.json")):
        t = json.loads(f.read_text())
        if t.get("code") and t.get("status") != "à venir":
            out.append({"id": t["id"], "code": t["code"], "label": t["label"], "subgroups": t.get("subgroups") or []})
    return out


def parse_prefs(s: str) -> dict:
    """« 1;h;5;fne;de,od.0.3 » → {"freq": "h", "level": 5, "content": "fne", "topics": {"dermatologie": None, "odontologie": [ctx…]}}"""
    if not s or not PREFS_RX.match(s) or len(s) > 250:
        raise ValueError("préférences illisibles")
    _, freq, level, content, tps = s.split(";")
    by_code = {t["code"]: t for t in topics()}
    sel = {}
    for part in tps.split(","):
        code, *idx = part.split(".")
        t = by_code.get(code)
        if not t:
            continue
        subs = [t["subgroups"][int(i)] for i in idx if int(i) < len(t["subgroups"])]
        sel[t["id"]] = subs or None
    if not sel:
        raise ValueError("aucun thème choisi")
    return {"freq": freq, "level": int(level), "content": content, "topics": sel}


def describe_prefs(p: dict) -> str:
    labels = {t["id"]: t["label"] for t in topics()}
    th = "; ".join(labels.get(k, k) + (f" ({', '.join(v)})" if v else "") for k, v in p["topics"].items())
    c = [x for k, x in (("f", "fiches rédigées"), ("n", "toutes les nouvelles publications"), ("e", "essais cliniques")) if k in p["content"]]
    return f"{'Chaque lundi' if p['freq'] == 'h' else 'Le premier lundi du mois'} · {', '.join(c)} · {th}"


# ---------------------------------------------------------------- jetons
def norm(email: str) -> str:
    return email.strip().lower()


def token(email: str, purpose: str = "gerer") -> str:
    mac = hmac.new(SECRET.encode(), f"{purpose}:{norm(email)}".encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(mac).decode().rstrip("=")[:24]


def check(email: str, tok: str, purpose: str = "gerer") -> bool:
    return bool(email and tok) and hmac.compare_digest(token(email, purpose), tok)


def manage_url(email: str) -> str:
    return f"{SITE_URL}/#alertes?e={urllib.parse.quote(norm(email))}&t={token(email)}"


def unsubscribe_url(email: str) -> str:
    return f"{API_URL}/api/desinscription?e={urllib.parse.quote(norm(email))}&t={token(email)}"


# ---------------------------------------------------------------- stockage
class BrevoStore:
    def __init__(self, key: str):
        self.h = {"api-key": key, "accept": "application/json", "content-type": "application/json"}
        self._attrs_ok = False

    def _ensure_attrs(self) -> None:
        if self._attrs_ok:
            return
        for a in ATTRS:  # création idempotente des attributs (erreur si déjà existants : ignorée)
            requests.post(f"{BREVO}/contacts/attributes/normal/{a}", headers=self.h, json={"type": "text"}, timeout=20)
        self._attrs_ok = True

    def get(self, email: str) -> dict | None:
        r = requests.get(f"{BREVO}/contacts/{urllib.parse.quote(norm(email))}", headers=self.h, timeout=20)
        if r.status_code == 404:
            return None
        r.raise_for_status()
        a = r.json().get("attributes") or {}
        if "LUMINA_STATUT" not in a:
            return None
        return {"email": norm(email), **{k: a.get(k) for k in ATTRS}}

    def put(self, email: str, **attrs) -> None:
        self._ensure_attrs()
        body = {"email": norm(email), "attributes": attrs, "updateEnabled": True}
        if os.environ.get("BREVO_LIST_ID"):
            body["listIds"] = [int(os.environ["BREVO_LIST_ID"])]
        r = requests.post(f"{BREVO}/contacts", headers=self.h, json=body, timeout=20)
        if r.status_code not in (200, 201, 204):
            raise RuntimeError(f"Brevo : {r.status_code} {r.text[:200]}")

    def delete(self, email: str) -> None:
        requests.delete(f"{BREVO}/contacts/{urllib.parse.quote(norm(email))}", headers=self.h, timeout=20)

    def active(self) -> list[dict]:
        out, offset = [], 0
        while True:
            r = requests.get(f"{BREVO}/contacts", headers=self.h, params={"limit": 1000, "offset": offset}, timeout=60)
            r.raise_for_status()
            cs = r.json().get("contacts") or []
            for c in cs:
                a = c.get("attributes") or {}
                if a.get("LUMINA_STATUT") == "actif":
                    out.append({"email": norm(c["email"]), **{k: a.get(k) for k in ATTRS}})
            if len(cs) < 1000:
                return out
            offset += 1000


class FileStore:
    """Développement et tests : contacts dans alertes/.dev/contacts.json."""
    path = DEV / "contacts.json"

    def _load(self) -> dict:
        return json.loads(self.path.read_text()) if self.path.exists() else {}

    def _save(self, d: dict) -> None:
        DEV.mkdir(exist_ok=True); self.path.write_text(json.dumps(d, ensure_ascii=False, indent=1))

    def get(self, email):
        c = self._load().get(norm(email)); return {"email": norm(email), **c} if c else None

    def put(self, email, **attrs):
        d = self._load(); d.setdefault(norm(email), {k: None for k in ATTRS}).update(attrs); self._save(d)

    def delete(self, email):
        d = self._load(); d.pop(norm(email), None); self._save(d)

    def active(self):
        return [{"email": k, **v} for k, v in self._load().items() if v.get("LUMINA_STATUT") == "actif"]


def store():
    key = os.environ.get("BREVO_API_KEY")
    return BrevoStore(key) if key else FileStore()


# ---------------------------------------------------------------- envoi
def send(to: str, subject: str, html_body: str, text_body: str, unsubscribe: str | None = None) -> None:
    key = os.environ.get("BREVO_API_KEY")
    if not key:
        out = DEV / "boite"; out.mkdir(parents=True, exist_ok=True)
        name = f"{dt.datetime.now():%Y%m%d-%H%M%S-%f}-{re.sub(r'[^a-z0-9]+', '_', norm(to))}.html"
        (out / name).write_text(f"<!-- À : {to}\nObjet : {subject} -->\n{html_body}")
        print(f"[dev] mail « {subject} » pour {to} → {out / name}")
        return
    body = {"sender": SENDER, "to": [{"email": to}], "subject": subject, "htmlContent": html_body, "textContent": text_body}
    if unsubscribe:
        body["headers"] = {"List-Unsubscribe": f"<{unsubscribe}>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}
    r = requests.post(f"{BREVO}/smtp/email", headers={"api-key": key, "content-type": "application/json", "accept": "application/json"},
                      json=body, timeout=30)
    if r.status_code >= 300:
        raise RuntimeError(f"Brevo : envoi refusé ({r.status_code}) {r.text[:300]}")


# ---------------------------------------------------------------- mise en page des mails
E = html.escape
INK, MUTED, LINE, ACCENT, BG = "#0e1116", "#6b7180", "#e4e6ec", "#d0213f", "#f6f7f9"


def button(href: str, label: str) -> str:
    return (f'<a href="{E(href)}" style="display:inline-block;background:{ACCENT};color:#fff;text-decoration:none;'
            f'font:600 15px/1 Helvetica,Arial,sans-serif;padding:14px 22px;border-radius:999px">{E(label)}</a>')


def layout(title: str, inner: str, footer: str = "", preheader: str = "") -> str:
    return f"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>{E(title)}</title></head><body style="margin:0;background:{BG};color:{INK}">
<span style="display:none;max-height:0;overflow:hidden">{E(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BG}"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border:1px solid {LINE};border-radius:18px">
<tr><td style="padding:26px 28px 6px">
  <div style="font:700 22px/1.1 Georgia,'Times New Roman',serif;color:{INK}">Lumina<span style="color:{ACCENT}">thèque</span></div>
  <div style="font:600 10px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.18em;color:{MUTED};text-transform:uppercase;margin-top:2px">Veille photobiomodulation</div>
</td></tr>
<tr><td style="padding:14px 28px 26px;font:15px/1.55 Helvetica,Arial,sans-serif;color:{INK}">{inner}</td></tr>
<tr><td style="padding:18px 28px 24px;border-top:1px solid {LINE};font:12px/1.55 Helvetica,Arial,sans-serif;color:{MUTED}">
{footer}<br>Luminathèque est un outil de veille : il ne remplace ni la lecture critique des articles ni l'avis médical.</td></tr>
</table></td></tr></table></body></html>"""
