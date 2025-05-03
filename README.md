`pnpm i` pour installer les dépendances puis `npm run dev` pour développer en local.

## Fonctionnalités

- Analyse des votes (classement et distribution) selon la méthode du [jugement médian](https://fr.wikipedia.org/wiki/Jugement_usuel).
- Configuration d'un seuil de victoire (plusieurs mentions gagnantes).
- Archivage du résultat au format texte.
- Intégration du résultat en `iframe`.

![image](https://github.com/user-attachments/assets/336b051a-3349-40d6-bc56-fd80250154ae)

## Notes

- La page de résultat inclut [iframe-resizer.child.js](https://github.com/davidjbradshaw/iframe-resizer/blob/master/js-dist/iframe-resizer.child.js).

## Évolutions possibles

- Personnalisation des mentions (ex : "Elles ont tort"/"Elles ont raison").
- Racourcisseur d'URL intégré.
