`pnpm i` pour installer les dépendances puis `npm run dev` pour développer en local.

## Fonctionnalités

- Analyse des votes (score, mention majoritaire, classement et distribution) selon la méthode du [jugement médian](https://fr.wikipedia.org/wiki/Jugement_usuel).
- Configuration d'un seuil de victoire (plusieurs mentions gagnantes).
- Archivage du résultat au format texte.
- Intégration du résultat en `iframe` avec adaptation automatique de la hauteur ([info](https://gist.github.com/inwardmovement/1c6f3441e29d1ed790c9997e00d79ca0)).

![image](https://github.com/user-attachments/assets/336b051a-3349-40d6-bc56-fd80250154ae)

## Évolutions possibles

- Personnalisation des mentions (ex : "Elles ont tort"/"Elles ont raison").
- Racourcisseur d'URL intégré.
