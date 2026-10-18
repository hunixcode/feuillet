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
- layouts/ : le cadre commun des pages (ClientLayout pour l'espace client, ResponsableLayout à créer pour l'espace responsable)
- pages/client/ et pages/responsable/ : une page par écran
- components/common/ : composants réutilisables `Button`, `Input`, `ErrorMessage` et `Loader`, avec leurs styles dans `common.css`
- components/client/ : composants propres à l'espace client
- services/api.ts : client HTTP commun (`get`, `post`, `put`, `delete`), préfixe `/api`, JSON et token `localStorage`
- services/ : services d'accès aux données ; les pages et composants ne font pas d'appel réseau directement
- contexts/ : l'état partagé entre les pages (utilisateur connecté, panier)
- types/ : propositions de contrats TypeScript pour l'API, à valider avec le backend
- utils/format.ts : formatage des prix entiers en XPF et des dates en français

Le client HTTP est un socle pour les intégrations futures. Il n'est pas relié aux formulaires ou aux pages : ne pas supposer de comportement d'endpoint avant que le contrat backend soit défini. Les réponses réseau ne sont pas validées à l'exécution contre les types TypeScript.

Les prix sont des nombres entiers en XPF. `formatXPF` rejette les valeurs qui ne sont pas des entiers sûrs ; il ne convertit pas les chaînes ni n'arrondit les décimaux.

## Ajouter une page

1. Créer le composant dans pages/client/ ou pages/responsable/
2. Ajouter sa route dans routes/router.tsx
3. Ajouter un test si la page a de la logique

Pour l'espace responsable : créer layouts/ResponsableLayout.tsx sur le modèle de ClientLayout, puis ajouter un bloc /responsable dans router.tsx avec ses pages en enfants.

## Style

Le style suit la maquette V2 : noir, blanc et laiton, polices Geist (texte) et Archivo étroite (gros chiffres). Les couleurs, les arrondis et la marge sont des variables au début de src/index.css (--encre, --gris, --ligne, --laiton, --laiton-fonce, --manque, --marge...), avec les mêmes noms que dans la maquette : on peut reprendre le CSS d'une page de la maquette presque tel quel. On utilise ces variables plutôt que d'écrire des couleurs en dur, comme ça le thème reste le même partout.

## Règles de l'équipe

- Pas de fetch dans les pages ni dans les composants : tout passe par services/
- Pas de règle métier dans le front, c'est le backend qui calcule
- Prix en XPF, nombres entiers, TTC ; prix remisé et TVA calculés par le backend (RG11)
- Les écrans suivent `docs/ecrans.md`
- Pas de commentaires dans le code
- Branche personnelle ou par tâche (`feature/front-...`), une PR relue par l'autre front avant de fusionner dans main
- Les fichiers partagés (router.tsx, types/, services/api.ts, layouts/) se modifient par petite PR

Les fichiers `*.test.ts` et `*.test.tsx` sont exécutés par Vitest en environnement jsdom. Les tests du socle couvrent le client HTTP, le formatage, les composants communs et le routeur.
