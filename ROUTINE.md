# Routine de veille Luminathèque

Procédure suivie à chaque mise à jour (par défaut chaque semaine). Elle peut être lancée à la main
(« fais la veille Luminathèque ») ou par une tâche planifiée Claude Code qui exécute ce fichier.

## 1. Collecter les nouveautés

Pour chaque thème actif de `data/topics/` (aujourd'hui : `mucite-orale`, `neuropathie-peripherique`, `gynecologie`, `musculo-squelettique`, `dermatologie`, `neurologie`, `odontologie`, `ophtalmologie`, `oncologie-support`, `orl`, `sport` et `cardiologie` ; les thèmes marqués `"status": "à venir"` sont ignorés), en partant de la date de la dernière veille moins 14 jours (pour rattraper les retards d'indexation PubMed) :

```bash
python3 scripts/fetch_pubmed.py --topic mucite-orale --since AAAA-MM-JJ
python3 scripts/fetch_pdfs.py --topic mucite-orale
python3 scripts/compress_pdfs.py   # allège les PDF de plus de 3 Mo
python3 scripts/build_site.py
```

Toutes les nouvelles notices apparaissent automatiquement sur le site en « notice indexée ». Pour lister les **études clés** (essais randomisés, méta-analyses, revues systématiques, recommandations) qui n'ont pas encore de fiche :

```bash
python3 scripts/pending.py --topic mucite-orale > a_analyser.txt
```

Seules ces études clés reçoivent une fiche rédigée ; les autres restent indexées. `build_site.py --prune-pdfs` retire les PDF sans fiche. Si Europe PMC a échoué pendant la collecte, relancer `fetch_pubmed.py --topic X --backfill-epmc`.

### Études en cours (registre des essais)

```bash
python3 scripts/fetch_trials.py
```

Le script interroge ClinicalTrials.gov pour tous les thèmes et liste les essais PBM « à trier ». Pour chacun, l'ajouter dans `data/curation/essais.json` : sous `essais`, `"NCT…": ["thème", "sous-groupe", "titre en français"]`, ou sous `exclus` s'il ne relève pas de la PBM (laser ablatif, luminothérapie par la rétine, imagerie proche infrarouge…). Les essais qui changent de statut (ouverture, clôture) sont mis à jour automatiquement ; ceux qui sont terminés disparaissent de la rubrique.

### Paramètres, appareils et fiches patients

- **Paramètres** (`data/curation/<thème>/parametres.json`) : quand une nouvelle méta-analyse, une recommandation ou un grand essai change le réglage conseillé ou le niveau de preuve d'une indication, mettre à jour la fiche (`niveau` : `recommandée`, `prometteuse`, `incertaine`, `non démontrée`) et ajouter son PMID dans `sources` (il doit avoir une fiche rédigée).
- **Appareils** (`data/appareils.json`) : la détection est automatique dans les résumés et les essais ; ajouter une entrée (avec son expression régulière) quand une nouvelle marque ou un nouveau type d'appareil apparaît.
- **Fiches patients** (`data/fiches_patients.json`) : revoir le niveau de preuve et les sources quand la fiche paramètres correspondante change.

### Autres registres (OMS)

```bash
python3 scripts/fetch_registries.py
```

Interroge le portail ICTRP de l'OMS (registres brésilien, indien, iranien, chinois, australien, britannique, coréen, japonais…) et liste les essais « à trier », à rattacher ou exclure dans `data/curation/essais.json` comme ci-dessus (clé = identifiant du registre).

## 2. Analyser chaque nouvel article

Brouillons : `python3 scripts/brouillons.py --tous` (avec `ANTHROPIC_API_KEY`) prépare un brouillon pour chaque étude clé sans fiche ; ils se relisent et se valident sur la page *Brouillons* du site (voir BROUILLONS.md). Les décisions déposées dans `data/brouillons/decisions/` s'appliquent avec `python3 scripts/brouillons.py --appliquer`.

Lire le résumé (`data/raw/<thème>.json`) et, s'il existe, le texte intégral (`data/fulltext/<PMID>.txt`).

- **Hors sujet** (pas de photobiomodulation, ou pas de mucite liée aux traitements du cancer : aphtes, péri-implantite…) : ajouter le PMID à `data/curation/<thème>/exclus.json`.
- **Pertinent** : ajouter une fiche dans `data/curation/<thème>/<année>.json`, l'année étant celle de la mise en ligne.

Schéma d'une fiche :

| champ | contenu |
|---|---|
| `pmid` | identifiant PubMed |
| `title_fr` | titre traduit en français |
| `type` | `ma`, `sr`, `umbrella`, `guideline`, `rct`, `nrct`, `cohort`, `cases`, `review`, `preclinical`, `protocol`, `survey`, `qualitative`, `biblio`, `methodo`, `letter` |
| `level` | niveau de preuve 1–5 (0 = non gradé) : 1 synthèse d'ECR · 2 ECR · 3 contrôlé non randomisé ou revue mixte · 4 cohorte sans témoin concurrent, série · 5 avis, mécanismes, préclinique |
| `pop` | `adulte`, `pédiatrie`, `mixte`, `—` |
| `ctx` | mucite : `ORL`, `chimio`, `CSH`, `mixte` · neuropathies : `CIPN`, `diabète`, `compression`, `lésion nerveuse`, `orofaciale`, `autres` · gynécologie (sous-groupes) : `GSM`, `onco`, `vulve`, `pelvien`, `obstétrique`, `fertilité`, `général` |
| `aim` | `prévention`, `traitement`, `les deux`, `—` |
| `mode` | ex. `intrabuccal`, `extrabuccal`, `LED`, `laser`, `haute puissance`, `domicile`, `PDT` |
| `nm` | longueurs d'onde en nm (liste de nombres) |
| `n` | effectif (patients, ou unités pour le préclinique) |
| `effect` | `favorable`, `neutre`, `mitigé`, `défavorable`, `—` |
| `theme` | thème court, réutilisé d'une fiche à l'autre (ex. `Extra vs intrabuccal`) |
| `key` | `true` pour les publications « À retenir » |
| `metric` | facultatif : `{"kind":"rr","outcome":…,"rr":…,"lo":…,"hi":…,"k":…}`, `{"kind":"rates",…,"a_label","a","b_label","b"}` (en %) ou `{"kind":"values",…,"unit"}` |
| `l1` | niveau 1 : une à deux lignes, résultat chiffré |
| `l2` | niveau 2 : un à deux paragraphes (séparés par une ligne vide) |
| `l3` | niveau 3 : `{"points":[…],"limites":[…],"pratique":"…"}` |

Règles de rédaction : français simple, chiffres recopiés du résumé ou du texte intégral (jamais estimés), limites explicites, pas de conclusion plus forte que le plan d'étude ne le permet.

## 3. Mettre à jour les synthèses

Si la semaine apporte un essai randomisé, une méta-analyse ou une recommandation, compléter le bilan de l'année dans `data/curation/<thème>/syntheses.json` (niveaux `l1`, `l2`, `l3`) et, si besoin, l'étude comparative (`global`).

## 4. Publier

```bash
python3 scripts/build_site.py --prune-pdfs
git add -A && git commit -m "Veille du AAAA-MM-JJ : N nouvelles publications"
git push
```

Terminer par un court compte rendu : nouvelles publications (niveau 1 de chacune), exclusions, changements des synthèses.

## Ajouter une pathologie ou changer le rythme

- **Activer un thème « à venir »** (musculo-squelettique, dermatologie) : ajouter `pubmed_query`, `since`, `hero`, `exclusions_note` et `"status": "actif"` dans son fichier, créer `data/curation/<id>/`, puis suivre les étapes 1 à 4.
- **Nouvelle pathologie** : copier `data/topics/mucite-orale.json` sous un autre nom (ex. `radiodermite.json`), adapter `id`, `label`, `pubmed_query` et `since`, créer `data/curation/<id>/`, puis lancer la collecte. Le sélecteur « Thème » du site l'affiche automatiquement.
- **Rythme** : modifier `cadence` dans le fichier du thème (affiché sur le site) et la fréquence de la tâche planifiée.
