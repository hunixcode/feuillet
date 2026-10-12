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
- Catalogue (création, modification, archivage, recherche, filtre par catégorie)
- Panier et validation de vente — tout ou rien, disponibilités revérifiées
- Mouvements de stock et corrections d'inventaire
- Disponibilité client : stock vendable, mises de côté et leurs échéances
- Demandes sur articles épuisés + notifications de réapprovisionnement
- Réapprovisionnement : seuils d'alerte, commandes fournisseurs, réceptions partielles
- Retours de ventes
- Rapports hebdomadaires avec export CSV
- Deux espaces dans l'application : client et responsable ; les employés au comptoir n'ont pas de compte ni de session individuelle

## Build
- Front : React + Vite + TypeScript
- Back : Node.js + Express + TypeScript (à ajouter après le socle frontend, endpoints non encore définis)
- Base de données : MongoDB (Mongoose)
- Tests : Vitest
- CI : GitHub Actions

Note de cadrage : le frontend est la priorité actuelle du projet. Les écrans, flux utilisateur et validations de l'interface sont conçus et validés avant l'ajout des endpoints backend et des contrats API.

Commandes du frontend (depuis `frontend/`) :
- `npm test` : exécute les tests Vitest (routes, socle HTTP, composants et formatage)
- `npm run build` : vérifie TypeScript et construit le frontend
- `npm run lint` : exécute Oxlint

## Documentation
- [`docs/rapport.md`](docs/rapport.md) : choix techniques, spécification, périmètre des écrans
- [`docs/ecrans.md`](docs/ecrans.md) : description des écrans client et responsable
- [`docs/architecture.md`](docs/architecture.md) : diagrammes UML

## Conventions Git
- Commits atomiques : une seule intention, fonctionnalité opérationnelle
- Messages explicites : `feat(produit): ...`, `fix(stock): ...`, `docs: ...` (voir conventional commits)
- Branches simples ex: `hau`, `hiva`, `noah` ou plus spécifique `feature/...`, fusion via pull request relue par l'autre membre
- `main` toujours exécutable : les tests passent à chaque fusion

## Répartition des tâches
Un issue GitHub par tâche, assigné et avec label.
[Issues](https://github.com/hunixcode/Groupe-5-Genie-Log-DM/issues)
