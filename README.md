<div align="center"><h1>Gestionnaire de stock de librairie</h1>

<p>Application web de gestion de stock de librairie (catalogue, ventes, retours,
réapprovisionnement), Projet de Génie Logiciel, à rendre <b>fin novembre</b>.</p>
</div>

## Équipe
| Nom |
|---|
| Dylan PETERANO |
| ARAI Hivanui |
| TEMEHARO Noah |

## Fonctionnalités prévues
- Catalogue (création, modification, archivage, recherche, filtres par type et catégorie), prix TTC avec TVA, promotions et courbe d'évolution des prix
- Accueil avec meilleures ventes et catégories de livres
- Panier et validation de vente — tout ou rien, disponibilités revérifiées ; options cadeau, emballage et livraison
- Mouvements de stock, corrections d'inventaire et stock défectueux
- Disponibilité client : stock vendable, arrivages prévus, mises de côté et leurs échéances
- Demandes de livres indisponibles (même hors catalogue) + notifications de réapprovisionnement
- Réapprovisionnement : plusieurs fournisseurs, alertes en pourcentage de la quantité achetée, commandes, réceptions partielles
- Retours (14 jours, 1 mois pour un cadeau) : remboursement, échange, remplacement d'un défectueux
- Rapports hebdomadaires avec statistiques et export CSV, sans statistique par employé
- Comptes client et responsable ; deux espaces dans l'application, les employés au comptoir n'ont pas de compte ni de session individuelle

Le détail (exigences EX01–EX11, règles RG01–RG15, décisions de cadrage issues des réponses de l'enseignant) est dans [`docs/rapport.md`](docs/rapport.md).

## Stack
- Front : React + Vite + TypeScript
- Back : Node.js + Express + TypeScript (`GET /api/health`, authentification : inscription, connexion, session ; CRUD des produits)
- Base de données : MongoDB
- Tests : Vitest
- CI : GitHub Actions

## Lancer le projet

Pour lancer le backend

```sh
cd backend
npm i

npm run dev
```

Pour lancer le frontend

```sh
cd frontend
npm i

npm run dev
```

## Déployer

En production, l'API sert aussi le front compilé : une seule application, une seule origine, pas de CORS.

1. Variables d'environnement (voir `backend/.env.example`) : `NODE_ENV=production`, `MONGODB_URI` (MongoDB en replica set, pour les transactions), `JWT_SECRET` (32 caractères au moins), `PORT` (souvent fourni par l'hébergeur). `DOSSIER_FRONT` est facultatif (par défaut `frontend/dist`). Le seed demande aussi `RESPONSABLE_EMAIL` et `RESPONSABLE_MOT_DE_PASSE`.
2. Construire, depuis la racine du dépôt :

   ```sh
   npm run installer   # npm ci dans backend/ et frontend/
   npm run build       # front (frontend/dist) puis back (backend/dist)
   ```

3. Démarrer : `npm start` (lance `node backend/dist/index.js`).
4. Données de départ, une seule fois et à la main : `npm run seed` (compte responsable, paramètres, catégories, produits de démonstration).

Au démarrage, toutes les variables sont vérifiées et chaque problème est signalé ; les index MongoDB sont créés. Chaque requête écrit une ligne dans le journal (méthode, chemin sans paramètres, statut, durée, identifiant), jamais le corps ni les en-têtes. Une erreur 500 renvoie seulement un identifiant (`Référence : …`, aussi dans l'en-tête `X-Request-Id`) qui permet de retrouver la trace dans le journal. Sur `SIGTERM`, le serveur n'accepte plus de requêtes, termine celles en cours (10 s au plus) puis ferme la connexion MongoDB.

## Documentation
- [`docs/rapport.md`](docs/rapport.md) : choix techniques, spécification, décisions de cadrage, traçabilité — **fait foi en cas de désaccord**
- [`docs/ecrans.md`](docs/ecrans.md) : description des écrans client et responsable
- [`docs/architecture.md`](docs/architecture.md) : diagrammes UML et modèle de données de référence
- [`docs/api.md`](docs/api.md) : contrat de l'API REST (format d'erreur, authentification)
- [`docs/questions-prof.md`](docs/questions-prof.md) : questions pour l'enseignant et ses réponses
- [`docs/backlog.md`](docs/backlog.md) : journal d'avancement
- [`frontend/README.md`](frontend/README.md) : fiche du frontend (organisation, règles)

## Conventions Git
- Commits atomiques : une seule intention, fonctionnalité opérationnelle
- Messages explicites : `feat(produit): ...`, `fix(stock): ...`, `docs: ...` (voir conventional commits)
- Branches personnelles (`hau`, `hiva`, `noah`) ou par tâche (`feature/...`, ex. `feature/front-connexion`), fusion via pull request relue par un autre membre
- `main` toujours exécutable : les tests passent à chaque fusion

## Répartition des tâches
Un issue GitHub par tâche, assigné et avec label.
[Issues](https://github.com/hunixcode/Groupe-5-Genie-Log-DM/issues)
