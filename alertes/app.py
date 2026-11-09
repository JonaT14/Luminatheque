"""
Luminathèque — service d'abonnement aux alertes par mail (Flask).

Lancement local : cd alertes && pip install -r requirements.txt && flask --app app run -p 8790
En production (Render) : gunicorn --chdir alertes app:app  (voir render.yaml et ALERTES.md)

Routes (JSON, CORS ouvert au site) :
  POST /api/inscription      {email, prefs, consentement}  → mail de confirmation (double validation)
  GET  /api/confirmer?e&t     → active l'abonnement, renvoie vers la page de gestion du site
  GET  /api/preferences?e&t   → préférences de l'abonné
  POST /api/preferences       {e, t, prefs}                → mise à jour
  POST /api/desinscription    {e, t}   (et GET ?e&t, et désinscription en un clic des messageries)
  POST /api/lien              {email}  → renvoie le lien personnel de gestion (« compte » sans mot de passe)
  GET  /api/sante
"""
from __future__ import annotations

import collections
import datetime as dt
import os
import time
import urllib.parse

from flask import Flask, jsonify, redirect, request

import commun as C

app = Flask(__name__)
ORIGINS = {C.SITE_URL, "http://localhost:8765", "http://127.0.0.1:8765", "http://localhost:8000"} | set(
    filter(None, os.environ.get("ALERTES_ORIGINES", "").split(",")))
HITS: dict[str, collections.deque] = collections.defaultdict(collections.deque)


@app.after_request
def cors(resp):
    o = request.headers.get("Origin")
    if o in ORIGINS:
        resp.headers["Access-Control-Allow-Origin"] = o
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    resp.headers["Cache-Control"] = "no-store"
    return resp


@app.route("/api/<path:_>", methods=["OPTIONS"])
def preflight(_):
    return ("", 204)


def limited(n: int = 6, per: int = 600) -> bool:
    """Limite grossière par adresse IP (n requêtes sensibles par fenêtre de `per` secondes)."""
    ip = (request.headers.get("X-Forwarded-For") or request.remote_addr or "?").split(",")[0].strip()
    q, now = HITS[ip], time.time()
    while q and now - q[0] > per:
        q.popleft()
    q.append(now)
    return len(q) > n


def err(msg: str, code: int = 400):
    return jsonify({"ok": False, "erreur": msg}), code


def confirm_mail(email: str, prefs: dict) -> None:
    url = f"{C.API_URL}/api/confirmer?e={urllib.parse.quote(C.norm(email))}&t={C.token(email, 'confirmer')}"
    inner = f"""<h1 style="font:700 24px/1.2 Georgia,serif;margin:6px 0 14px">Confirmez votre inscription</h1>
<p>Vous avez demandé à recevoir les alertes de Luminathèque :</p>
<p style="background:#faf8f4;border-radius:12px;padding:12px 14px;color:#3b382f">{C.E(C.describe_prefs(prefs))}</p>
<p style="margin:22px 0">{C.button(url, "Confirmer mon inscription")}</p>
<p style="color:#6b665c;font-size:13px">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : sans confirmation, aucune alerte ne vous sera envoyée et votre adresse sera effacée.</p>"""
    C.send(email, "Confirmez votre inscription aux alertes Luminathèque", C.layout("Confirmation", inner, preheader="Un clic pour activer vos alertes"),
           f"Confirmez votre inscription aux alertes Luminathèque : {url}")


def manage_mail(email: str, already: bool = False) -> None:
    url = C.manage_url(email)
    inner = f"""<h1 style="font:700 24px/1.2 Georgia,serif;margin:6px 0 14px">{'Vous êtes déjà inscrit' if already else 'Votre lien personnel'}</h1>
<p>{'Une demande d’inscription vient d’être faite avec votre adresse, qui reçoit déjà les alertes. ' if already else ''}Ce lien vous permet de modifier vos thèmes, la fréquence et le contenu de vos alertes, ou de vous désabonner. Il est personnel : ne le transférez pas.</p>
<p style="margin:22px 0">{C.button(url, "Gérer mes alertes")}</p>"""
    C.send(email, "Votre lien pour gérer vos alertes Luminathèque", C.layout("Gérer mes alertes", inner, preheader="Modifier ou arrêter vos alertes"),
           f"Gérer vos alertes Luminathèque : {url}")


def mode() -> str:
    """« brevo » : envoi réel ; « dev » : test local (fichiers) ; « off » : en ligne mais clé Brevo non configurée."""
    if os.environ.get("BREVO_API_KEY"):
        return "brevo"
    return "dev" if os.environ.get("ALERTES_DEV") or "localhost" in C.SITE_URL or "127.0.0.1" in C.SITE_URL else "off"


@app.before_request
def ferme():
    if request.method == "POST" and request.path in ("/api/inscription", "/api/lien") and mode() == "off":
        return err("Les alertes par mail ouvrent bientôt : l'envoi n'est pas encore activé. En attendant, les flux RSS sont disponibles.", 503)


@app.get("/api/sante")
def sante():
    return jsonify({"ok": True, "brevo": mode() == "brevo", "mode": mode(), "heure": dt.datetime.now().isoformat(timespec="seconds")})


@app.post("/api/inscription")
def inscription():
    if limited():
        return err("Trop de demandes, réessayez dans quelques minutes.", 429)
    d = request.get_json(silent=True) or {}
    email, raw = (d.get("email") or "").strip(), d.get("prefs") or ""
    if d.get("site"):  # champ piège invisible : robots
        return jsonify({"ok": True})
    if not C.EMAIL_RX.match(email):
        return err("Adresse mail invalide.")
    if not d.get("consentement"):
        return err("Merci d'accepter de recevoir les alertes.")
    try:
        prefs = C.parse_prefs(raw)
    except ValueError as e:
        return err(str(e).capitalize() + ".")
    st = C.store()
    cur = st.get(email)
    if cur and cur.get("LUMINA_STATUT") == "actif":
        manage_mail(email, already=True)   # on ne modifie pas un abonnement actif sans le lien personnel
        return jsonify({"ok": True, "etat": "deja"})
    st.put(email, LUMINA_PREFS=raw, LUMINA_STATUT="attente", LUMINA_DATE=dt.date.today().isoformat())
    confirm_mail(email, prefs)
    return jsonify({"ok": True, "etat": "attente"})


@app.get("/api/confirmer")
def confirmer():
    e, t = request.args.get("e", ""), request.args.get("t", "")
    if not C.check(e, t, "confirmer"):
        return redirect(f"{C.SITE_URL}/alertes?etat=lien-invalide")
    st = C.store()
    cur = st.get(e)
    if not cur:
        return redirect(f"{C.SITE_URL}/alertes?etat=inconnu")
    if cur.get("LUMINA_STATUT") != "actif":
        st.put(e, LUMINA_STATUT="actif", LUMINA_DATE=dt.date.today().isoformat())
        try:
            manage_mail(e)
        except Exception as ex:  # l'abonnement est actif même si ce mail échoue
            app.logger.warning("mail de bienvenue non envoyé : %s", ex)
    return redirect(C.manage_url(e) + "&etat=confirme")


@app.get("/api/preferences")
def lire():
    e, t = request.args.get("e", ""), request.args.get("t", "")
    if not C.check(e, t):
        return err("Lien invalide ou expiré.", 403)
    cur = C.store().get(e)
    if not cur:
        return err("Aucun abonnement pour cette adresse.", 404)
    return jsonify({"ok": True, "email": C.norm(e), "prefs": cur.get("LUMINA_PREFS"), "statut": cur.get("LUMINA_STATUT"),
                    "dernier_envoi": cur.get("LUMINA_ENVOI"), "depuis": cur.get("LUMINA_DATE")})


@app.post("/api/preferences")
def ecrire():
    d = request.get_json(silent=True) or {}
    e, t, raw = d.get("e", ""), d.get("t", ""), d.get("prefs") or ""
    if not C.check(e, t):
        return err("Lien invalide ou expiré.", 403)
    try:
        C.parse_prefs(raw)
    except ValueError as ex:
        return err(str(ex).capitalize() + ".")
    st = C.store()
    if not st.get(e):
        return err("Aucun abonnement pour cette adresse.", 404)
    st.put(e, LUMINA_PREFS=raw, LUMINA_STATUT="actif")
    return jsonify({"ok": True})


@app.route("/api/desinscription", methods=["GET", "POST"])
def desinscription():
    d = request.get_json(silent=True) or {}
    e = d.get("e") or request.args.get("e", "")
    t = d.get("t") or request.args.get("t", "")
    if not C.check(e, t):
        return (redirect(f"{C.SITE_URL}/alertes?etat=lien-invalide") if request.method == "GET" else err("Lien invalide.", 403))
    C.store().delete(e)   # RGPD : l'adresse est effacée, pas seulement désactivée
    if request.method == "GET":
        return redirect(f"{C.SITE_URL}/alertes?etat=desinscrit")
    return jsonify({"ok": True})


@app.post("/api/lien")
def lien():
    if limited(4):
        return err("Trop de demandes, réessayez dans quelques minutes.", 429)
    email = ((request.get_json(silent=True) or {}).get("email") or "").strip()
    if not C.EMAIL_RX.match(email):
        return err("Adresse mail invalide.")
    cur = C.store().get(email)
    if cur and cur.get("LUMINA_STATUT") == "actif":
        manage_mail(email)
    elif cur:
        confirm_mail(email, C.parse_prefs(cur["LUMINA_PREFS"]))
    return jsonify({"ok": True})   # même réponse qu'il existe un abonnement ou non


@app.get("/")
def accueil():
    return redirect(f"{C.SITE_URL}/alertes")
