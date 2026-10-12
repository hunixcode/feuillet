# Architecture

## Diagrammes UML

| Diagramme | Fichier |
|---|---|
| Cas d'utilisation | [`diagrammes/1_Cas_utilisation_librairie.png`](./diagrammes/1_Cas_utilisation_librairie.png) |
| Classes | [`diagrammes/2_Classes_librairie.png`](./diagrammes/2_Classes_librairie.png) |
| Séquence — réception fournisseur | [`diagrammes/Sequence_reception_fournisseur.png`](./diagrammes/Sequence_reception_fournisseur.png) |

---

## Organisation du code

```
├── backend/       Express + Mongoose (logique métier, services, API REST)
├── frontend/      React + Vite (2 espaces : client et responsable)
└── docs/          Rapport et diagrammes
```

Note de cadrage : le frontend est la base de travail actuelle. Les endpoints backend et le contrat API seront ajoutés ensuite, après validation des écrans et des flux utilisateur. La logique métier est prévue pour vivre dans `backend/` et rester testable **sans interface**, mais cette couche n'est pas encore implémentée dans le dépôt.

Les employés au comptoir n'ont pas de compte ni d'espace applicatif propre ; leurs opérations passent par l'espace responsable.
