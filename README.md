# SPORTS AI – Matchs à la TV
Un seul compte nécessaire : GitHub (gratuit).

1. github.com > New repository : nom `sports-ai`, **Public**. Ajoute les fichiers avec « uploading an existing file » (glisse tout le contenu du dossier, y compris `.github` ; Mac : Cmd+Maj+. pour voir les fichiers cachés).
2. Settings > Pages > Source « Deploy from a branch », branche `main`, dossier `/ (root)`, Save.
3. Settings > Actions > General > Workflow permissions > « Read and write permissions », Save.
4. Onglet Actions > « Mise à jour des matchs TV » > Run workflow. Attends la coche verte.
5. Ton site : https://TON-PSEUDO.github.io/sports-ai/

Optionnel : Settings > Secrets and variables > Actions > secret `ANTHROPIC_API_KEY` pour générer les analyses.
La mise à jour tourne seule chaque jour (≈ 5h et 15h, heure de Paris).
