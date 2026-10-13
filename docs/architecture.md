# Architecture

## Diagrammes UML

| Diagramme | Fichier |
|---|---|
| Cas d'utilisation | [`diagrammes/1_Cas_utilisation_librairie.svg`](./diagrammes/1_Cas_utilisation_librairie.svg) |
| Classes | [`diagrammes/2_Classes_librairie.svg`](./diagrammes/2_Classes_librairie.svg) |
| Séquence — réception fournisseur | [`diagrammes/Sequence_reception_fournisseur.svg`](./diagrammes/Sequence_reception_fournisseur.svg) |

Les diagrammes sont au format SVG (vectoriel : nets à tout zoom, légers, lisibles directement sur GitHub et dans un navigateur). Ils sont générés avec [PlantUML](https://plantuml.com) à partir des sources de `diagrammes/src/` (style commun dans `style.iuml`). Pour modifier un diagramme, éditer le `.puml` puis lancer :

```
docs/diagrammes/generer.sh chemin/vers/plantuml.jar
```

(`plantuml.jar` se télécharge sur plantuml.com ou Maven Central ; Java et Graphviz sont nécessaires.)

Le diagramme de séquence suit les noms de services de `rapport.md` (`ReapproService`, `DemandeService`) et l'écran 11 de `ecrans.md`.

### Invariants du modèle

- `Stock.quantiteMiseDeCote` = somme des `quantiteMiseDeCote` des demandes au statut `mise_de_cote`.
- Stock vendable = `quantitePhysique − quantiteMiseDeCote`, jamais < 0. Le stock défectueux est compté à part. Un stock passé se recalcule depuis les mouvements.
- Au plus une promotion active par produit à une date donnée.
- Une demande a soit un produit, soit un titre (livre hors catalogue).
- Un produit a au moins une entrée d'historique des prix (son prix initial).
- `Vente.client`, `Demande` et `Notification` ne concernent que des utilisateurs de rôle `client`.
- Le produit d'un `Retour` est celui de sa `LigneVente` ; un retour d'issue `echange` est lié à la vente du nouvel article.
- Chaque ligne de vente et chaque réception validée génère exactement un `Mouvement`.
- Somme des retours d'une ligne ≤ `LigneVente.quantite` ; somme des réceptions validées d'une commande ≤ `quantiteCommandee`.
- Historiques jamais modifiés ni supprimés : `Mouvement`, `Ajustement`, `Retour`, `Vente`, `LigneVente`, `Reception`, `HistoriquePrix`.

---

## Organisation du code

```
├── backend/       Express + Mongoose (logique métier, services, API REST)
├── frontend/      React + Vite (2 espaces : client et responsable)
└── docs/          Rapport, écrans et diagrammes
```

Note de cadrage : le frontend est la base de travail actuelle. Le backend ne contient pour l'instant que le squelette Express (`GET /api/health`) et la connexion MongoDB. Les endpoints et le contrat API seront ajoutés ensuite, après validation des écrans et des flux utilisateur. La logique métier vivra dans `backend/` et restera testable **sans interface**.

Les employés au comptoir n'ont pas de compte ni d'espace applicatif propre ; leurs opérations passent par l'espace responsable.
