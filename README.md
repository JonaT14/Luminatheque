# Luminathèque

Veille scientifique personnelle sur la **photobiomodulation (PBM)**, avec toutes les publications PubMed **depuis 2000**.

Chaque thème contient deux sortes d'entrées :

- les **fiches rédigées** (3 niveaux de lecture, niveau de preuve, résultats chiffrés) pour toutes les études clés : essais randomisés, méta-analyses, revues systématiques, recommandations ;
- les **notices indexées** (titre, conclusion des auteurs en VO, résumé complet à la demande), classées automatiquement par type d'étude, niveau de preuve indicatif et sous-groupe. Elles sont cherchables et filtrables comme les fiches (filtre « Fiche »).

| Thème | Notices indexées | Fiches rédigées |
|---|---|---|
| Mucite buccale (traitements du cancer) | 463 | 198 |
| Neuropathies périphériques (chimio-induites, diabétiques, compressions, lésions nerveuses, névralgies) | 317 | 120 |
| Gynécologie (sécheresse et syndrome génito-urinaire, après cancer, vulve et vagin, douleurs pelviennes, obstétrique et allaitement, fertilité) | 278 | 116 |
| Musculo-squelettique (tendons, arthrose, rachis, ATM, fibromyalgie, épaule, os, muscle, Ehlers-Danlos) | 3 367 | 682 |
| Dermatologie (plaies, cicatrices et brûlures, radiodermite, alopécie, dermatoses inflammatoires, esthétique, infections, pigmentation) | 4 601 | 256 |
| Neurologie (sclérose en plaques, SLA, Parkinson, tremblements, démences, fatigue chronique et Covid long, AVC, traumatismes crâniens, neurodéveloppement, dépression et anxiété) | 1 116 | 134 |
| Odontologie (chirurgie buccale, orthodontie, implants, parodontologie, hypersensibilité, endodontie, ostéonécrose des mâchoires, anesthésie) | 3 525 | 523 |
| Ophtalmologie (DMLA, myopie, sécheresse oculaire, rétinopathies, glaucome, amblyopie) | 917 | 85 |
| Lymphœdème et oncologie de support (lymphœdème, trismus, xérostomie, syndrome main-pied, fatigue) | 219 | 59 |
| ORL (acouphènes, surdité, rhinite, sinusite, odorat, pharynx, vertiges) | 239 | 40 |
| Médecine du sport et performance (performance, récupération, blessures, populations) | 383 | 128 |
| Cardiologie et vasculaire (infarctus et coronaires, insuffisance cardiaque, chirurgie cardiaque, artères et Raynaud, hypertension, irradiation sanguine) | 351 | 45 |

Une même étude peut avoir une fiche dans plusieurs thèmes : la médecine du sport reprend par exemple les essais sur le muscle du thème musculo-squelettique, et l'oncologie de support rassemble des séquelles de cancer qu'on retrouve aussi en dermatologie ou en mucite.

## Ce que fait le site

- **Tableau de bord** : chiffres clés, pyramide des niveaux de preuve, rythme de publication, forest plot des méta-analyses, résultats des essais bras par bras, longueurs d'onde étudiées et sens des résultats.
- **Publications** : recherche plein texte (insensible aux accents), filtres par période (dates, semaine ISO, année), type d'étude, niveau de preuve, résultat, contexte, population, thème et PDF disponible. Les articles sont groupés par semaine.
- **Trois niveaux de lecture** partout : *Express* (1–2 lignes), *Essentiel* (1–2 paragraphes), *Approfondi* (méthode, résultats, limites, pratique, résumé original).
- **Fiche article** : fiche technique, graphique du résultat principal, liens vers les sources et **lecteur PDF intégré** pour les fiches dont l'article est en accès libre (licences Creative Commons, dépôt PMC Open Access).
- **Études en cours** : essais de PBM déclarés au registre ClinicalTrials.gov qui recrutent ou se déroulent, projets en construction (pas encore ouverts, protocoles publiés) et porteurs de projets (promoteurs, investigateurs, pays). 655 essais relus et classés à la main, issus de ClinicalTrials.gov et des registres nationaux rassemblés par l'OMS (ICTRP : Brésil, Inde, Iran, Chine, Australie, Royaume-Uni, Corée, Japon…).
- **Paramètres** : une fiche pratique par indication (longueur d'onde, dose, zone, nombre de séances, type d'appareil), avec le niveau de preuve, les conseils, les précautions et les fiches sources. Les réglages ne reprennent que ce que disent les études et les recommandations.
- **Recommandations officielles** : référentiels AFSOS (PBM en soins oncologiques de support 2026, douleurs neuropathiques iatrogènes 2024), tableaux de doses WALT (2010, révision 2022), recommandations MASCC/ISOO et prises de position WALT, avec paramètres et niveaux de preuve, affichés dans le tableau de bord, la page Paramètres et chaque fiche paramètres (`data/recommandations.json`).
- **Sécurité et médicolégal** (`/securite`) : contre-indications absolues et relatives (yeux et norme EN 207, tumeur active, grossesse, thyroïde, stimulateurs, épilepsie photosensible, risque thermique), vérificateur de médicaments photosensibilisants (risque en bleu, rouge et proche infrarouge selon le spectre d'action), cadre médicolégal, modèles de consentement éclairé et de fiche de traçabilité avec calcul de l'énergie et de la fluence (impression ou Word). Données dans `data/securite.json`.
- **Contrôle qualité avant publication** (`scripts/controle.py`, appelé par `build_site.py`) : le site n'est pas généré tant qu'une fiche contient une erreur bloquante : effectif « n » qui est en fait un nombre d'études (les synthèses utilisent `k` pour le nombre d'études incluses), sous-thème étranger à la spécialité, effectif invalide, niveau de preuve incompatible avec le type d'étude (niveau 1 réservé aux synthèses d'essais).
- **Du diagnostic au réglage** : ponts sur chaque vue (cartes, articles, synthèses, accueil) vers les paramètres de l'indication et la fiche patient ; paramètres dosimétriques extraits du résumé sur chaque article ; « Adapter à mon appareil » convertit la dose du protocole (J/cm² ou J par point) en temps d'illumination selon la puissance et la surface de la machine (mémorisable dans le navigateur), avec alerte si l'irradiance s'écarte du protocole ; impression et envoi de la fiche patient depuis le protocole.
- **Exports professionnels** : synthèse en PDF (en-tête daté, trois niveaux, tableau comparatif, références numérotées) depuis la page Synthèses ; références en RIS (Zotero, EndNote, Mendeley) et BibTeX depuis la liste filtrée, la sélection, une synthèse ou un article ; fiches patients en PDF A4 avec QR code vers leur version en ligne (`scripts/fiches_qr.py`, appelé par `scripts/fiches_pdf.py`).
- **Trois états de lecture** : *notice indexée* (retrouvée par la veille, retenue par le tri de pertinence, non lue), *publication évaluée* (résumé lu, type, niveau de preuve et sens du résultat vérifiés), *analyse approfondie* (fiche complète en trois niveaux). Seules les publications évaluées alimentent le sens des résultats et les synthèses.
- **Périmètre** : le site ne couvre que la photobiomodulation, c'est-à-dire une lumière de faible intensité (laser basse énergie ou LLLT, LED). Les lasers de forte puissance (haute intensité ou HILT, classe 4), CO2, Er:YAG, Nd:YAG, excimer, à colorant pulsé, la lumière pulsée intense et les lasers chirurgicaux sont écartés, notices comme fiches rédigées, sauf quand l'étude les compare ou les associe à un bras de faible intensité.
- **Tri de pertinence** (`scripts/pertinence.py`) : les notices qui ne décrivent aucune intervention de PBM, ou dont le sujet principal est une autre technique (optogénétique, sonodynamique, photodynamique, photopolymérisation…), sont écartées automatiquement et listées sur la page Méthode. `data/curation/<thème>/inclus.json` réintègre une notice écartée à tort.
- **Accueil général** (`/`) : recherche unique (indications, protocoles, fiches patients et toutes les publications, avec équivalences français-anglais), quatre points d'entrée, nouveautés de la semaine toutes spécialités et index des indications cliniques. **Bibliothèque** (`/recherche`) : recherche dans toutes les spécialités ; index léger `assets/topics/_recherche.<empreinte>.js` chargé à la demande.
- **Appareils** : matrice technologique (`data/technologies.json` : LED polychromatiques, lasers classe 3B et classe 4, super-pulsés et magnéto-infrarouges, sondes endocavitaires, lits corps entier) avec paramètres physiques, conseils de transposition et calculateur de durée d'application ; recherche par type d'appareil (laser diode, LED, casque, dispositif intrabuccal…) et par marque, avec les thèmes concernés, le sens des résultats, les études et les essais en cours où l'appareil est cité.
- **Fiches patients** : fiches illustrées à remettre aux patients (schéma du mécanisme, déroulé d'une séance, calendrier, jauge du niveau de preuve, sécurité, questions fréquentes), imprimables sur deux pages A4.
- **Alertes par mail** : chacun choisit ses thèmes et sous-thèmes, le contenu (fiches, publications selon le niveau de preuve, essais) et la fréquence, et reçoit une lettre personnalisée le lundi. Double validation, lien personnel de gestion, désinscription en un clic. Flux RSS par thème sans inscription. Mise en service : [ALERTES.md](ALERTES.md).
- **Brouillons** : Claude prépare un brouillon de fiche pour chaque nouvelle étude clé ; un humain relit, corrige, valide ou exclut sur la page *Brouillons*. Voir [BROUILLONS.md](BROUILLONS.md).
- **Synthèses** : bilans 2000–2009, 2010–2019, 2020–2023, 2024, 2025, 2026 et étude comparative avec tableau.
- **Comparateur** : fusionner une période (par exemple semaines 1 à 20) ou comparer deux périodes, ou une sélection d'articles cochés. Le récapitulatif et les graphiques sont recalculés, et une demande de synthèse rédigée peut être copiée pour Claude.

## Adresses

Chaque page a sa propre adresse, partageable : `/<thème>` (tableau de bord), `/<thème>/publications`, `/<thème>/syntheses`, `/<thème>/essais`, `/<thème>/parametres`, `/article/<PMID>`, `/appareils/<id>`, `/patients/<id>`, `/methode`, `/comparer`. Les anciens liens en `#…` sont convertis automatiquement. Au déploiement, `scripts/build_pages.py` écrit une page pré-remplie (titre, description, aperçu Open Graph, résumé lisible sans JavaScript) pour chaque thème, fiche rédigée, appareil et fiche patient, ainsi que `sitemap.xml` ; les autres adresses sont servies par l'application (règle de réécriture dans `render.yaml`).

## Ouvrir le site

Le lecteur PDF a besoin d'un petit serveur local (les navigateurs bloquent la lecture de fichiers depuis le disque) :

```bash
python3 -m http.server 8000
```

puis ouvrir <http://localhost:8000>. Ce petit serveur ne renvoie pas les adresses profondes (`/mucite-orale/publications`) vers l'application : partir de la page d'accueil, ou lancer `python3 scripts/build_pages.py` pour créer les pages correspondantes.

Pour le mettre en ligne, activer **GitHub Pages** (Settings → Pages → Source : *GitHub Actions*). Le workflow `.github/workflows/pages.yml` publie alors le site à chaque push sur `main`.

## Organisation

```
index.html, assets/          site statique (aucune compilation)
assets/data.js               données générées (ne pas éditer à la main)
data/topics/*.json           thèmes suivis : requête PubMed, rythme
data/raw/*.json              métadonnées PubMed + Europe PMC
data/curation/<thème>/       fiches en 3 niveaux (une par année), exclusions, synthèses, paramètres
data/brouillons/             brouillons de fiches préparés par Claude, en attente de validation
data/suivi.json              date d'arrivée de chaque notice, fiche et essai (alertes, flux RSS)
data/trials/                 registres d'essais (ClinicalTrials.gov, ICTRP)
alertes/                     service d'abonnement et envoi des lettres d'alerte
flux/                        flux RSS (Atom) par thème
pdfs/                        PDF en accès libre (CC), nommés par PMID
scripts/                     collecte PubMed, téléchargement et allègement des PDF, assemblage
ROUTINE.md                   procédure de veille hebdomadaire
```

Les fiches sont rédigées à partir des résumés et, quand ils sont disponibles, des textes intégraux. C'est un outil de veille : il ne remplace ni la lecture critique des articles ni les recommandations (MASCC/ISOO).
