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
- Librairie uniquement en ligne : pas de magasin ni de vente au comptoir, toute commande est livrée
- Comptes client et responsable ; deux espaces dans l'application

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

## Sécurité des dépendances
La CI lance `npm audit --omit=dev --audit-level=high` dans `backend/` et `frontend/` : elle échoue si une dépendance de production a une vulnérabilité haute ou critique, même sur une PR qui n'y touche pas. Dependabot ouvre chaque lundi des PR de mise à jour (labels `devops` et `backend` ou `frontend`).

Quand la CI signale une vulnérabilité :
1. Dans le dossier concerné, `npm audit` montre le paquet, la gravité et la version corrigée.
2. `npm audit fix` (jamais `--force`, qui peut changer de version majeure), puis vérifier typecheck ou lint, tests et build.
3. Commit séparé `fix(backend): ...` ou `fix(frontend): ...` qui cite les paquets et les versions.
4. Sans version corrigée pour une dépendance indirecte : forcer une version sûre avec `overrides` dans `package.json`. Si la faille ne concerne pas notre usage, ouvrir une issue `devops` qui l'explique et décider en équipe ; la CI reste bloquante tant que ce n'est pas réglé.

Une PR Dependabot se relit comme les autres : la CI doit passer, et une mise à jour majeure se teste à la main avant la fusion.

## Répartition des tâches
Un issue GitHub par tâche, assigné et avec label.
[Issues](https://github.com/hunixcode/Groupe-5-Genie-Log-DM/issues)
