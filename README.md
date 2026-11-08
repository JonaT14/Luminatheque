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
| Musculo-squelettique (tendons, arthrose, rachis, ATM, fibromyalgie, épaule, os, muscle) | 3 363 | 679 |
| Dermatologie (plaies, cicatrices et brûlures, radiodermite, alopécie, dermatoses inflammatoires, esthétique, infections, pigmentation) | 4 601 | 256 |

## Ce que fait le site

- **Tableau de bord** : chiffres clés, pyramide des niveaux de preuve, rythme de publication, forest plot des méta-analyses, résultats des essais bras par bras, longueurs d'onde étudiées et sens des résultats.
- **Publications** : recherche plein texte (insensible aux accents), filtres par période (dates, semaine ISO, année), type d'étude, niveau de preuve, résultat, contexte, population, thème et PDF disponible. Les articles sont groupés par semaine.
- **Trois niveaux de lecture** partout : *Express* (1–2 lignes), *Essentiel* (1–2 paragraphes), *Approfondi* (méthode, résultats, limites, pratique, résumé original).
- **Fiche article** : fiche technique, graphique du résultat principal, liens vers les sources et **lecteur PDF intégré** pour les fiches dont l'article est en accès libre (licences Creative Commons, dépôt PMC Open Access).
- **Synthèses** : bilans 2000–2009, 2010–2019, 2020–2023, 2024, 2025, 2026 et étude comparative avec tableau.
- **Comparateur** : fusionner une période (par exemple semaines 1 à 20) ou comparer deux périodes, ou une sélection d'articles cochés. Le récapitulatif et les graphiques sont recalculés, et une demande de synthèse rédigée peut être copiée pour Claude.

## Ouvrir le site

Le lecteur PDF a besoin d'un petit serveur local (les navigateurs bloquent la lecture de fichiers depuis le disque) :

```bash
python3 -m http.server 8000
```

puis ouvrir <http://localhost:8000>. Le reste du site fonctionne aussi en ouvrant directement `index.html`.

Pour le mettre en ligne, activer **GitHub Pages** (Settings → Pages → Source : *GitHub Actions*). Le workflow `.github/workflows/pages.yml` publie alors le site à chaque push sur `main`.

## Organisation

```
index.html, assets/          site statique (aucune compilation)
assets/data.js               données générées (ne pas éditer à la main)
data/topics/*.json           thèmes suivis : requête PubMed, rythme
data/raw/*.json              métadonnées PubMed + Europe PMC
data/curation/<thème>/       fiches en 3 niveaux (une par année), exclusions, synthèses
pdfs/                        PDF en accès libre (CC), nommés par PMID
scripts/                     collecte PubMed, téléchargement et allègement des PDF, assemblage
ROUTINE.md                   procédure de veille hebdomadaire
```

Les fiches sont rédigées à partir des résumés et, quand ils sont disponibles, des textes intégraux. C'est un outil de veille : il ne remplace ni la lecture critique des articles ni les recommandations (MASCC/ISOO).
