Frontend - Gestionnaire de stock de librairie

React + Vite + TypeScript, routes avec react-router-dom, tests avec Vitest et Testing Library.


Lancer le projet

Dans le dossier frontend :

```
npm install
npm run dev
```

Puis ouvrir http://localhost:5173. Ouvrir index.html directement donne une page blanche, il faut passer par npm run dev.

Autres commandes :
- npm test : lance les tests
- npm run build : vérifie le TypeScript et construit le site
- npm run lint : vérifie le code avec oxlint

Les appels vers /api/... sont redirigés vers le backend sur le port 3000 (à changer dans vite.config.ts si le backend utilise un autre port).


Organisation de src/

- main.tsx : point d'entrée, affiche App
- App.tsx : branche le routeur
- routes/router.tsx : la liste des routes (adresse -> page)
- layouts/ : le cadre commun des pages (ClientLayout pour l'espace client, ResponsableLayout à créer pour l'espace responsable)
- pages/client/ et pages/responsable/ : une page par écran
- components/common/ : composants réutilisables partout (bouton, champ, message d'erreur)
- components/client/ : composants propres à l'espace client
- services/ : le seul endroit où on appelle l'API
- contexts/ : l'état partagé entre les pages (utilisateur connecté, panier)
- types/ : les types TypeScript des données de l'API
- utils/ : petites fonctions utiles (format des prix en XPF, dates)


Ajouter une page

1. Créer le composant dans pages/client/ ou pages/responsable/
2. Ajouter sa route dans routes/router.tsx
3. Ajouter un test si la page a de la logique

Pour l'espace responsable : créer layouts/ResponsableLayout.tsx sur le modèle de ClientLayout, puis ajouter un bloc /responsable dans router.tsx avec ses pages en enfants.


Style

Thème café / moka. Les couleurs sont des variables au début de src/index.css (--fond, --texte, --accent, --entete-fond...). On utilise ces variables plutôt que d'écrire des couleurs en dur, comme ça le thème reste le même partout.


Règles de l'équipe

- Pas de fetch dans les pages ni dans les composants : tout passe par services/
- Pas de règle métier dans le front, c'est le backend qui calcule
- Prix en XPF, nombres entiers
- Pas de commentaires dans le code
- Une branche par tâche (feature/front-...), une PR relue par l'autre front avant de fusionner dans main
- Les fichiers partagés (router.tsx, types/, services/api.ts, layouts/) se modifient par petite PR
