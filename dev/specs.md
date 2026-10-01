# Spécification — Sujet 2 : Gestion du stock de librairie

## 1. Choix technique justifié

Voir le document dédié : [`choix-techniques.md`](./choix-techniques.md)

**Résumé de la stack retenue :**
- **Front-end :** ReactJS + Vite + TypeScript
- **Back-end :** NodeJS + Express + TypeScript
- **Base de données :** MongoDB (via Mongoose)

## 2. Spécification + identifiants d'exigences

### 2.1 Vocabulaire du domaine

| Terme | Définition |
|---|---|
| **Produit** | Article du catalogue (livre, magazine, papeterie) avec référence unique, catégorie, désignation, prix |
| **Stock physique** | Quantité totale détenue en magasin |
| **Quantité mise de côté** | Quantité réservée pour un client en attente de réapprovisionnement |
| **Stock vendable** | Stock physique revendable − quantités mises de côté |
| **Mouvement** | Entrée, vente, retour ou ajustement de stock avec date, quantité, motif et opérateur |
| **Vente** | Transaction validée avec lignes, prix et total |
| **Demande** | Requête client sur un article épuisé |
| **Réapprovisionnement** | Commande fournisseur et réception de stock |
| **Rapport** | Synthèse hebdomadaire des ventes, retours et stocks |

### 2.2 Acteurs et droits

| Acteur | Droits |
|---|---|
| **Client** | Consulter le catalogue, passer des commandes, demander des articles épuisés |
| **Vendeur** | Enregistrer les ventes et retours, consulter le stock |
| **Responsable de stock** | Gérer les références, approvisionnements, corrections d'inventaire, consulter les rapports |

### 2.3 Exigences fonctionnelles

| ID | Exigence | Priorité | Critères d'acceptation |
|---|---|---|---|
| **EX01** | Créer, modifier, rechercher et archiver des produits | Haute | Un produit a une référence unique, une catégorie, une désignation, un prix. Les livres et magazines ont des identifiants distincts de la papeterie. |
| **EX02** | Enregistrer les mouvements de stock | Haute | Chaque mouvement a une date, une quantité, un motif et un opérateur. Une correction d'inventaire conserve la quantité avant et après. |
| **EX03** | Constituer un panier et valider un achat | Haute | Le panier contrôle les quantités à la validation. Si une ligne ne peut être servie, aucune vente partielle n'est enregistrée. |
| **EX04** | Afficher la disponibilité client | Haute | Affichage du stock vendable ou d'un statut compréhensible. Différenciation stock physique, mises de côté et vendable. |
| **EX05** | Enregistrer les demandes sur articles épuisés | Moyenne | Enregistrement du produit, client, quantité souhaitée et date. Notification lors du réapprovisionnement. |
| **EX06** | Gérer le réapprovisionnement | Haute | Seuil d'alerte par produit, liste des articles à recommander, suivi des commandes fournisseur et réceptions (y compris partielles). |
| **EX07** | Traiter les retours | Haute | Retrouver une vente, enregistrer un retour admissible, calculer le montant, distinguer article remis en rayon et non revendable. |
| **EX08** | Produire des rapports hebdomadaires | Moyenne | Rapport des ventes, retours et stocks restants. Choix de la période, filtre par catégorie, export CSV. |

### 2.4 Règles métier

| ID | Règle |
|---|---|
| **RG01** | Les prix ne sont pas négatifs. Les quantités sont entières et les quantités vendables ne peuvent pas devenir négatives. |
| **RG02** | Le prix d'une vente déjà validée ne change pas lorsque le catalogue est mis à jour. |
| **RG03** | Une validation de panier réussit entièrement ou ne modifie ni les ventes ni les stock. Les disponibilités sont revérifiées à la confirmation. |
| **RG04** | Le stock vendable = stock physique revendable − quantités mises de côté. Un produit sans unité vendable est indisponible. |
| **RG05** | Un produit sans historique peut être supprimé. Un produit déjà vendu ou référencé est archivé. |
| **RG06** | Une demande d'article épuisé n'est pas une vente. Une mise de côté a une échéance ; son expiration libère la quantité. |
| **RG07** | Une réception ou un retour validé une seconde fois ne crée pas de seconde entrée de stock. Un retour ne peut pas dépasser la quantité de la vente d'origine non retournée. |
| **RG08** | Le rapport distingue ventes brutes, retours, montant net et quantités. Un stock à une date passée est calculé à partir des mouvements. |

### 2.5 Exigences de qualité

| ID | Exigence |
|---|---|
| **EQ01** | La logique métier doit être testable sans l'interface graphique. |
| **EQ02** | Les tests doivent être déterministes (dates contrôlables, données isolées). |
| **EQ03** | Les données de démonstration doivent être réinitialisables. |
| **EQ04** | Les erreurs doivent être compréhensibles et préserver la cohérence des données. |

## 10. Backlog initial

| ID | Ticket | Priorité | Estimation | Dépendances |
|---|---|---|---|---|
| T01 | Créer le schéma Produit et l'API CRUD | Haute | 3j | — |
| T02 | Créer le schéma Mouvement et l'API | Haute | 2j | T01 |
| T03 | Implémenter le calcul du stock vendable | Haute | 2j | T01, T02 |
| T04 | Créer le schéma Vente et l'API de validation panier | Haute | 3j | T03 |
| T05 | Implémenter les retours | Haute | 2j | T04 |
| T06 | Créer le schéma Demande et l'API | Moyenne | 2j | T01 |
| T07 | Implémenter le réapprovisionnement | Haute | 3j | T01, T06 |
| T08 | Créer les rapports hebdomadaires | Moyenne | 2j | T02, T04 |
| T09 | Interface catalogue (React) | Haute | 3j | T01 |
| T10 | Interface panier (React) | Haute | 3j | T04 |
| T11 | Interface gestion stock (React) | Moyenne | 3j | T03, T07 |
| T12 | Tests unitaires services métier | Haute | 3j | T03, T04 |
| T13 | Tests d'intégration API | Haute | 2j | T12 |
| T14 | Données de démonstration (seed) | Moyenne | 1j | T01-T08 |

---

## 11. Matrice de traçabilité (structure)

| Exigence | Cas d'utilisation | Ticket(s) | Module(s) | Test(s) | Recette |
|---|---|---|---|---|---|
| EX01 | UC Gérer produits | T01 | ProduitService | TU01, TI01 | REC01 |
| EX02 | UC Enregistrer mouvement | T02 | MouvementService | TU02, TI02 | REC02 |
| EX03 | UC01 Valider panier | T04 | VenteService | TU03, TI03 | REC03 |
| EX04 | UC Consulter stock | T03 | StockService | TU04 | REC04 |
| EX05 | UC Demander article | T06 | DemandeService | TU05 | REC05 |
| EX06 | UC02 Réceptionner | T07 | ReapproService | TU06, TI04 | REC06 |
| EX07 | UC03 Traiter retour | T05 | RetourService | TU07 | REC07 |
| EX08 | UC Rapports | T08 | RapportService | TU08 | REC08 |

---

## 12. Définition de "terminé"

Un ticket est considéré comme **terminé** lorsque :

1. **Critères d'acceptation satisfaits** : le comportement décrit dans l'exigence est implémenté et fonctionne.
2. **Tests pertinents réussis** : les tests unitaires et d'intégration couvrant ce ticket passent.
3. **Revue par un autre membre** : une pull request a été créée et relue par un autre membre du trinôme.
4. **Intégration dans Git** : la branche a été fusionnée dans `main` après revue.
5. **Modèles/documents mis à jour** : les diagrammes UML et la documentation sont à jour si nécessaire.

---

*Document évolutif — sera mis à jour au fil des itérations et des échanges avec le client.*
