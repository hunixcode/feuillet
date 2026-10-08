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
├── server/        Express + Mongoose (logique métier, services, API REST)
├── web/           React + Vite (3 espaces : client, vendeur, responsable)
└── docs/          Rapport et diagrammes
```

Règle : la logique métier vit dans `server/` et reste testable **sans interface**.
