<div align="center"><h1>Gestionnaire de stock de librairie</h1>

<p>Application web de gestion de stock de librairie (catalogue, ventes, retours,
réapprovisionnement), Projet de Génie Logiciel, à rendre le <b>date à confirmer</b>.</p>
</div>

## Équipe
| Nom |
|---|
| Dylan PETERANO |
| ARAI Hivanui |
| TEMEHARO Noah |

## Fonctionnalités prévues
- Catalogue (création, modification, archivage, recherche, filtres par type et catégorie), prix TTC avec TVA, promotions et courbe d'évolution des prix
- Accueil avec meilleures ventes selon le type de client et catégories de livres
- Panier et validation de vente — tout ou rien, disponibilités revérifiées ; options cadeau, emballage et livraison
- Mouvements de stock, corrections d'inventaire et stock défectueux
- Disponibilité client : stock vendable, arrivages prévus, mises de côté et leurs échéances
- Demandes de livres indisponibles (même hors catalogue) + notifications de réapprovisionnement
- Réapprovisionnement : plusieurs fournisseurs, alertes en pourcentage de la quantité achetée, commandes, réceptions partielles
- Retours (14 jours, 1 mois pour un cadeau) : remboursement, échange, remplacement d'un défectueux
- Rapports hebdomadaires avec statistiques et export CSV, sans statistique par employé
- Comptes client et responsable ; deux espaces dans l'application, les employés au comptoir n'ont pas de compte ni de session individuelle

Le détail (exigences EX01–EX11, règles RG01–RG15, décisions de cadrage issues des réponses de l'enseignant) est dans [`docs/rapport.md`](docs/rapport.md).

## Build
- Front : React + Vite + TypeScript
- Back : Node.js + Express + TypeScript (`GET /api/health` et authentification : inscription, connexion, session ; contrat dans [`docs/api.md`](docs/api.md))
- Base de données : MongoDB (Mongoose)
- Tests : Vitest
- CI : GitHub Actions (workflow à créer)

Note de cadrage : le frontend est la priorité actuelle du projet. Les écrans, flux utilisateur et validations de l'interface sont conçus et validés avant l'ajout des endpoints backend et des contrats API.

Commandes du frontend (depuis `frontend/`) :
- `npm test` : exécute les tests Vitest (routes, socle HTTP, composants et formatage)
- `npm run build` : vérifie TypeScript et construit le frontend
- `npm run lint` : exécute Oxlint

Commandes du backend (depuis `backend/`, après `cp .env.example .env` et renseignement de `MONGODB_URI`, `JWT_SECRET` et du compte responsable) :
- `npm run dev` : lance l'API sur le port 3000 (le proxy Vite pointe dessus)
- `npm run dev:local` : lance l'API sur une base MongoDB en mémoire (compte responsable créé au démarrage, données perdues à l'arrêt) ; utile quand le réseau bloque le port 27017 d'Atlas (wifi d'université, par exemple)
- `npm run seed` : crée ou réinitialise le compte responsable
- `npm test` : exécute les tests Vitest (services, API avec supertest, persistance avec une base MongoDB en mémoire)
- `npm run typecheck` / `npm run build` : vérifie TypeScript / compile dans `dist/`

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
