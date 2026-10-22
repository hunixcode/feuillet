# Frontend — Gestionnaire de stock de librairie

React + Vite + TypeScript, routes avec react-router-dom, tests avec Vitest et Testing Library.

## Lancer le projet

Dans le dossier frontend :

```
npm install
npm run dev
```

Puis ouvrir http://localhost:5173. Ouvrir index.html directement donne une page blanche, il faut passer par `npm run dev`.

Commandes utiles :
- `npm test` : lance la suite Vitest
- `npx vitest run` : lance la suite Vitest une fois
- `npm run build` : vérifie le TypeScript et construit le site
- `npm run lint` : vérifie le code avec Oxlint

Le proxy Vite redirige `/api/...` vers le backend sur le port 3000 (à changer dans `vite.config.ts` si le backend utilise un autre port).

## Organisation de `src/`

- main.tsx : point d'entrée, affiche App
- App.tsx : branche le routeur
- routes/router.tsx : la liste des routes (adresse -> page)
- layouts/ : le cadre commun des pages (ClientLayout pour l'espace client, ResponsableLayout pour l'espace responsable /admin)
- pages/client/ et pages/responsable/ : une page par écran
- components/common/ : composants réutilisables `Button`, `Input`, `Select`, `ErrorMessage` et `Loader`, avec leurs styles dans `common.css`
- components/client/ : composants propres à l'espace client
- components/responsable/ : composants propres à l'espace responsable (formulaire produit, promotions, courbe des prix, catégories)
- services/api.ts : client HTTP commun (`get`, `post`, `put`, `delete`), préfixe `/api`, JSON et token `localStorage`
- services/ : services d'accès aux données ; les pages et composants ne font pas d'appel réseau directement
- contexts/ : l'état partagé entre les pages (utilisateur connecté, panier)
- types/ : propositions de contrats TypeScript pour l'API, à valider avec le backend
- utils/format.ts : formatage des prix entiers en XPF et des dates en français

Le contrat de l'API (routes, champs, codes d'erreur) est dans `docs/api.md` : les services et les types du front le suivent. Ne pas supposer le comportement d'une route qui n'y est pas encore décrite. Les réponses réseau ne sont pas validées à l'exécution contre les types TypeScript.

Les prix sont des nombres entiers en XPF. `formatXPF` rejette les valeurs qui ne sont pas des entiers sûrs ; il ne convertit pas les chaînes ni n'arrondit les décimaux.

## Ajouter une page

1. Créer le composant dans pages/client/ ou pages/responsable/
2. Ajouter sa route dans routes/router.tsx
3. Ajouter un test si la page a de la logique

Pour l'espace responsable : ajouter la page dans le bloc /admin de router.tsx (enfant de ResponsableLayout, déjà protégé par le rôle responsable) et son lien dans le menu de ResponsableLayout.

## Style

Le style suit la maquette V2 : noir, blanc et laiton, polices Geist (texte) et Archivo étroite (gros chiffres). Les couleurs, les arrondis et la marge sont des variables au début de src/index.css (--encre, --gris, --ligne, --laiton, --laiton-fonce, --manque, --marge...), avec les mêmes noms que dans la maquette : on peut reprendre le CSS d'une page de la maquette presque tel quel. On utilise ces variables plutôt que d'écrire des couleurs en dur, comme ça le thème reste le même partout.

## Règles de l'équipe

- Pas de fetch dans les pages ni dans les composants : tout passe par services/
- Pas de règle métier dans le front, c'est le backend qui calcule
- Prix en XPF, nombres entiers, TTC ; prix remisé et TVA calculés par le backend (RG11)
- Les écrans suivent `docs/ecrans.md`
- Pas de commentaires dans le code
- Branche commune `dev-front` pour les deux fronts (`git pull` avant de travailler et avant de pousser) ; quand les deux fronts sont d'accord, une PR `dev-front` → `main` relue par le chef de projet
- Les fichiers partagés (router.tsx, types/, services/api.ts, layouts/) se modifient par petite PR

Les fichiers `*.test.ts` et `*.test.tsx` sont exécutés par Vitest en environnement jsdom. Les pages reliées à l'API sont testées avec un `fetch` simulé : `npm test` ne demande pas de lancer le backend.
