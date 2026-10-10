# Rapport — Gestion du stock de librairie

---

## 1. Choix techniques

### Langage — **TypeScript**

Typage statique : les règles métier (calculs de stock, invariants) sont vérifiées à la compilation plutôt qu'à l'exécution. Le groupe maîtrise JS et veut se former au typage. Alternative écartée : JavaScript pur (erreurs silencieuses sur les types de données).

### Tests — **Vitest**

Conçu pour Vite, configuration partagée avec le front-end, rapide, couverture native. Alternative écartée : Jest (moins intégré à Vite), Mocha (trop de config).

**Règle d'organisation :** les règles métier vivent dans des services (`VenteService`, `StockService`…) exposés par une API REST, **jamais dans les composants React** → exigence de tester le métier sans l'interface.

### Back-end — **Node.js + Express**

Même langage que le front → un seul typage, un seul outillage, partage de code possible entre les deux. Express expose l'API REST qui découple la logique métier de l'interface : les services sont appelables et testables sans navigateur. Alternative écartée : NestJS (surdimensionné pour un CRUD avec quelques règles métier), Java Spring (cycle dev plus lourd).

### Interface — **React + Vite**

Composants réutilisables, build instantané, une seule base de code pour les 2 espaces (client / responsable). Les employés en magasin sont des personnes physiques, sans compte ni session dans l'application ; leurs opérations au comptoir sont saisies dans l'espace du responsable. Alternative écartée : Vue.js (écosystème moins large), React Native / Electron (pas de besoin mobile ou desktop).

### Base de données — **MongoDB + Mongoose**

Flexibilité sur les attributs variables par catégorie, framework d'agrégation pour les rapports hebdo et les stocks à date, seed réinitialisable. Alternative écartée : PostgreSQL (pourtant valable — choix assumé pour découvrir le NoSQL).

### Dates et horloge — **service `Clock` injectable + UTC**

Les règles impliquent des calculs temporels (retour sous 24h, échéance de mise de côté, semaine de rapport). L'horloge injectable rend les tests déterministes : on peut simuler n'importe quelle date. Les dates sont stockées en UTC.

### Notifications — **collection MongoDB**

Créées par les services métier, vérifiables dans les tests, persistantes. Unicité sur (client, produit, type) pour éviter les doublons. Alternative écartée : email/SMS réels (hors périmètre du sujet).

### Paiement — **simulation**

Le sujet ne demande pas de paiement : la validation du panier enregistre la vente.

### CI — **GitHub Actions**

Lance les tests et le build TypeScript à chaque PR. Déjà utilisé pour le dépôt, gratuit. Alternative écartée : Jenkins (serveur dédié, trop lourd).

---

## 2. Spécification

### Vocabulaire

| Terme | Définition |
|---|---|
| **Produit** | Article du catalogue (livre, magazine, papeterie), référence unique, catégorie, prix |
| **Stock physique** | Quantité totale en magasin |
| **Mise de côté** | Quantité réservée pour un client en attente de réapprovisionnement |
| **Stock vendable** | Stock physique − quantités mises de côté |
| **Mouvement** | Entrée, vente, retour ou ajustement (date, quantité, motif, opérateur) |
| **Vente** | Transaction validée : lignes, prix, total |
| **Demande** | Requête client sur un article épuisé |
| **Réapprovisionnement** | Commande fournisseur et réception |

### Acteurs et droits

| Acteur | Droits |
|---|---|
| **Client** | Consulter le catalogue, commander, demander des articles épuisés |
| **Responsable de stock** | Gérer le catalogue, les approvisionnements, les inventaires et les rapports ; accéder aux fonctions de vente, de retour et de consultation du stock utilisées au comptoir par les employés, sans compte ni session individuelle pour ceux-ci |

### Exigences fonctionnelles

| ID | Exigence | Priorité |
|---|---|---|
| **EX01** | Créer, modifier, rechercher et archiver des produits (référence unique, catégorie, prix) | Haute |
| **EX02** | Enregistrer les mouvements de stock (date, quantité, motif, opérateur) | Haute |
| **EX03** | Constituer un panier et valider un achat — vente entière ou rien | Haute |
| **EX04** | Afficher la disponibilité client : stock vendable ou statut explicite | Haute |
| **EX05** | Enregistrer les demandes sur articles épuisés + notification au réappro | Moyenne |
| **EX06** | Réapprovisionnement : seuils d'alerte, commandes fournisseur, réceptions (partielles) | Haute |
| **EX07** | Retours : retrouver la vente, montant, article remis en rayon ou non revendable | Haute |
| **EX08** | Rapports hebdo : ventes, retours, stocks, période + filtre catégorie + export CSV | Moyenne |

### Règles métier

| ID | Règle |
|---|---|
| **RG01** | Prix et quantités entiers, jamais négatifs |
| **RG02** | Le prix d'une vente validée ne change pas si le catalogue change |
| **RG03** | Validation du panier : tout ou rien, disponibilités revérifiées à la confirmation |
| **RG04** | Stock vendable = stock physique − mises de côté ; 0 unité = indisponible |
| **RG05** | Produit sans historique = supprimable ; déjà vendu = archivé |
| **RG06** | Une demande n'est pas une vente ; une mise de côté a une échéance qui libère le stock |
| **RG07** | Double réception/retour : pas de doublon. Retour ≤ quantité vendue non retournée |
| **RG08** | Rapport : ventes brutes, retours, net, quantités. Stock passé recalculé depuis les mouvements |

### Qualité

- La logique métier est testable **sans l'interface**.
- Les tests sont déterministes : horloge injectable, données isolées.
- Les données de démonstration se réinitialisent en une commande.
- Les erreurs sont compréhensibles et ne corrompent jamais les données.

### Définition de "terminé"

1. Comportement de l'exigence implémenté et fonctionnel.
2. Tests liés au ticket au vert.
3. PR relue par un autre membre.
4. Fusionnée dans `main`.
5. Docs/diagrammes à jour si besoin.

---

## 3. Périmètre des écrans

### Espace client
- Catalogue (recherche, filtre par catégorie, fiche produit avec disponibilité ou statut)
- Panier et validation de commande
- Mes demandes d'articles épuisés (alerte, mise de côté)

### Espace responsable de stock
- Enregistrement des ventes, retours et consultation de l'historique des ventes au comptoir, sans espace ni session propre aux employés
- Retrait de stock
- Gestion du catalogue (création, modification, archivage, suppression)
- Mouvements de stock (journal avec date, quantité, motif, opérateur)
- Corrections d'inventaire (quantités avant et après)
- Demandes sur articles épuisés (liste d'attente, attribution, mises de côté et leurs échéances)
- Réapprovisionnement : seuils d'alerte et articles à recommander
- Commandes fournisseurs et réceptions, y compris les livraisons partielles
- Rapports (ventes, retours, stock restant, période, filtre catégorie, export CSV)

### Transverses
- Connexion et compte client ; espace responsable utilisé pour la gestion et les opérations au comptoir, sans compte ni session employé
- Notifications (réapprovisionnement d'un article attendu)
- Paramètres métier (durée des mises de côté, délais de retour, définition de la semaine de rapport)

---

*Document évolutif.*
