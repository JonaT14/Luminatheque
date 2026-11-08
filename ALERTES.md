# Alertes par mail

Les visiteurs choisissent sur la page **Alertes par mail** (`#alertes`) :

- leurs thèmes, en entier ou par sous-thème ;
- le contenu voulu : fiches rédigées, toutes les nouvelles publications avec un seuil de niveau de preuve, essais cliniques (nouveaux essais et changements de statut) ;
- la fréquence : chaque lundi ou une fois par mois.

Ils reçoivent ensuite une lettre personnalisée. Aucune lettre n'est envoyée quand il n'y a rien de nouveau.

Il n'y a ni compte ni mot de passe. L'inscription se valide par un lien envoyé par mail (double validation). Chaque lettre contient ensuite un lien personnel pour modifier ses choix et un lien de désinscription en un clic. La désinscription efface l'adresse.

Sans inscription, la page propose aussi des **flux RSS** par thème (`flux/<thème>.xml`, `flux/tout.xml`).

## Fonctionnement

| Élément | Rôle |
|---|---|
| `scripts/build_site.py` | Note dans `data/suivi.json` la date d'arrivée de chaque notice, fiche et essai, et l'historique des statuts des essais. Écrit les flux RSS. |
| `alertes/app.py` | Petit service (Flask, hébergé sur Render) qui reçoit les inscriptions, envoie le mail de confirmation, et lit ou modifie les préférences. |
| `alertes/envoi.py` | Calcule pour chaque abonné ce qui est arrivé depuis sa dernière lettre et envoie la lettre. |
| `.github/workflows/alertes.yml` | Lance `envoi.py` chaque lundi matin, après la veille. |
| Brevo | Routeur mail français (gratuit jusqu'à 300 mails par jour). Il conserve les abonnés (attributs `LUMINA_*`) et envoie les mails. |

## Mise en service (une seule fois)

1. **Brevo** : créer un compte gratuit sur brevo.com.
   - *Expéditeurs, domaines et IP dédiées* : déclarer et valider l'adresse d'expédition (par exemple `alertes@votre-domaine.fr`). Authentifier le domaine (DKIM, DMARC) améliore la délivrabilité.
   - *Paramètres SMTP et API* → *Clés API* : créer une clé.
2. **Render** : le fichier `render.yaml` déclare le service `luminatheque-alertes` (offre gratuite).
   - Si le site a été créé par un *Blueprint*, ouvrir le Blueprint et cliquer sur *Sync* : Render propose de créer le service.
   - Sinon : *New* → *Blueprint* → choisir ce dépôt.
   - Renseigner `BREVO_API_KEY` (la clé Brevo) et `SENDER_EMAIL` (l'adresse validée). `ALERTES_SECRET` est généré automatiquement.
   - Vérifier ensuite que <https://luminatheque-alertes.onrender.com/api/sante> répond `"brevo": true`. Si Render a attribué une autre adresse, la reporter dans `ALERTES_API` en haut de `scripts/build_site.py` et dans la variable `ALERTES_URL` du service.
3. **GitHub** : *Settings* → *Secrets and variables* → *Actions* → *New repository secret*, créer trois secrets :
   - `BREVO_API_KEY` : la même clé ;
   - `SENDER_EMAIL` : la même adresse ;
   - `ALERTES_SECRET` : copier la valeur générée par Render (*Environment* du service). Elle doit être identique, sinon les liens « modifier » et « se désabonner » des lettres ne fonctionnent pas.
4. **Test** : s'inscrire sur le site, confirmer, puis *Actions* → *Envoyer les alertes par mail* → *Run workflow* avec la case « essai » cochée. Les lettres sont alors jointes au run, sans être envoyées. Relancer sans la case pour un vrai envoi.

Le service gratuit de Render se met en veille après 15 minutes sans visite. La page des alertes le réveille dès son ouverture : le premier accès peut prendre jusqu'à une minute, et la page l'indique.

## Développement local

```bash
pip install -r alertes/requirements.txt
```

```bash
cd alertes && SITE_URL=http://localhost:8765 ALERTES_URL=http://localhost:8790 flask --app app run -p 8790
```

Sans `BREVO_API_KEY`, les abonnés sont stockés dans `alertes/.dev/contacts.json` et les mails sont écrits dans `alertes/.dev/boite/`. Pour que la page locale utilise ce service, exécuter dans la console du navigateur : `localStorage.setItem("lumina:alerts_api", '"http://localhost:8790"')`.

Aperçu d'une lettre pour des préférences données, sans abonné :

```bash
python3 alertes/envoi.py --apercu "1;h;5;fne;od,op" --depuis 2026-10-01 > lettre.html
```

## Format des préférences

Les préférences tiennent en une chaîne courte stockée chez Brevo, par exemple `1;h;5;fne;de,od.0.3` :

- `1` : version du format ;
- `h` ou `m` : hebdomadaire ou mensuelle ;
- `1` à `5` : niveau de preuve maximal des publications (`5` = tout) ;
- `f`, `n`, `e` : fiches, publications, essais ;
- les thèmes : le code à deux lettres de `data/topics/<thème>.json` (champ `code`), suivi éventuellement des index des sous-groupes choisis.

**Pour ne pas casser les abonnements existants** : ne jamais changer le `code` d'un thème. Dans `subgroups`, ajouter les nouveaux sous-groupes **à la fin** de la liste, sans réordonner ni supprimer les existants.
