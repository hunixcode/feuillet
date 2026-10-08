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
├── frontend/      React + Vite (3 espaces : client, vendeur, responsable)
└── docs/          Rapport et diagrammes
```

Règle : la logique métier vit dans `backend/` et reste testable **sans interface**.
