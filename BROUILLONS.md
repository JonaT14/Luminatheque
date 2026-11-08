# Brouillons de fiches préparés par Claude

Pour chaque nouvelle étude clé sans fiche, Claude rédige un brouillon complet : fiche en trois niveaux, type, niveau de preuve, sous-groupes, résultat, points à vérifier. Il peut aussi proposer d'écarter une étude hors sujet. Un humain relit, corrige si besoin, puis valide ou exclut sur la page **Brouillons** du site (`#brouillons`). Un brouillon n'apparaît jamais parmi les fiches tant qu'il n'est pas validé.

## Le circuit

1. **Génération** : `scripts/brouillons.py`. Elle a lieu chaque lundi par GitHub Actions (`.github/workflows/brouillons.yml`), à la demande, ou pendant la veille.
   - Candidates : les notices sans fiche ni exclusion qui sont des essais randomisés, des méta-analyses, des revues systématiques ou des recommandations. Le type vient de PubMed ou, à défaut, du titre, car PubMed tarde souvent à typer les articles récents.
   - Les plus récentes passent en premier, 30 au maximum par passage.
   - Claude reçoit le résumé, le texte intégral s'il est disponible localement (`data/fulltext/`), le schéma des fiches, les sous-groupes du thème et des fiches de référence.
   - La sortie est contrainte par un schéma JSON. Les consignes communes sont mises en cache pour réduire le coût.
   - Chaque brouillon est écrit dans `data/brouillons/<thème>/<PMID>.json`.
2. **Relecture** sur la page *Brouillons* :
   - l'article original est affiché à côté du brouillon ;
   - tous les champs sont modifiables ;
   - les points à vérifier sont mis en évidence ;
   - deux actions : *Valider la fiche* ou *Exclure l'étude*.
3. **Publication des décisions** :
   - **Directe** : sur la page, *Activer la publication directe*, puis coller un jeton GitHub *fine-grained* limité à ce dépôt, avec la permission *Contents : Read and write*. Le jeton reste dans le navigateur. *Publier sur le site* dépose les décisions dans `data/brouillons/decisions/`. L'action GitHub les applique : les fiches validées vont dans `data/curation/<thème>/<année>-valides.json`, les exclusions dans `exclus.json`. Elle reconstruit ensuite le site et pousse le résultat ; Render redéploie.
   - **Sans jeton** : *Télécharger les décisions*, déposer le fichier dans `data/brouillons/decisions/`, puis `python3 scripts/brouillons.py --appliquer && python3 scripts/build_site.py`. On peut aussi confier le fichier à Claude lors de la veille.

## Mise en service

- GitHub → *Settings* → *Secrets and variables* → *Actions*, deux réglages :
  - secret `ANTHROPIC_API_KEY` : une clé de console.anthropic.com ;
  - variable facultative `LUMINA_MODELE` : sans elle, le script prend le modèle Opus le plus récent proposé par l'API.
- Lancement manuel : *Actions* → *Brouillons de fiches* → *Run workflow*, avec le nombre maximal de brouillons.
- En local :

  ```bash
  pip install anthropic
  ```

  ```bash
  ANTHROPIC_API_KEY=… python3 scripts/brouillons.py --theme orl --max 5
  ```

- Contrôle sans appel ni coût : `python3 scripts/brouillons.py --tous --requete` affiche la requête qui serait envoyée.

Coût indicatif : quelques centimes par brouillon à partir d'un résumé, davantage avec un texte intégral.
