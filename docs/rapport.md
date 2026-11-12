# Rapport — Gestion du stock de librairie

Ce document est la **source de vérité** du projet : en cas de désaccord entre deux documents, c'est lui qui fait foi. `ecrans.md` décrit l'interface, `architecture.md` le modèle et les diagrammes.

---

## 1. Choix techniques

### Langage — **TypeScript**

Typage statique : les règles métier (calculs de stock, invariants) sont vérifiées à la compilation plutôt qu'à l'exécution. Le groupe maîtrise JS et veut se former au typage. Alternative écartée : JavaScript pur (erreurs silencieuses sur les types de données).

### Tests — **Vitest**

Conçu pour Vite, configuration partagée avec le front-end, rapide, couverture native. Utilisé côté front (déjà en place) et côté back (à installer avec la première logique métier, avec supertest pour les tests d'API). Alternative écartée : Jest (moins intégré à Vite), Mocha (trop de config).

**Règle d'organisation :** les règles métier vivent dans des services (`VenteService`, `StockService`…) exposés par une API REST, **jamais dans les composants React** → exigence de tester le métier sans l'interface.

### Back-end — **Node.js + Express**

Même langage que le front → un seul typage, un seul outillage, partage de code possible entre les deux. Express expose l'API REST qui découple la logique métier de l'interface : les services sont appelables et testables sans navigateur. Alternative écartée : NestJS (surdimensionné pour un CRUD avec quelques règles métier), Java Spring (cycle dev plus lourd).

### Interface — **React + Vite**

Composants réutilisables, build instantané, une seule base de code pour les 2 espaces (client / responsable). Alternative écartée : Vue.js (écosystème moins large), React Native / Electron (pas de besoin mobile ou desktop).

### Base de données — **MongoDB + Mongoose**

Flexibilité sur les attributs variables par type de produit, framework d'agrégation pour les rapports hebdo et les stocks à date, seed réinitialisable. Alternative écartée : PostgreSQL (pourtant valable — choix assumé pour découvrir le NoSQL).

La validation d'une vente (RG03) modifie plusieurs documents : elle s'exécute dans une **transaction MongoDB** (replica set requis, fourni par MongoDB Atlas).

### Dates et horloge — **service `Clock` injectable + UTC**

Les règles impliquent des calculs temporels (délai de retour, échéance de mise de côté, semaine de rapport). L'horloge injectable rend les tests déterministes : on peut simuler n'importe quelle date. Les dates sont stockées en UTC ; les bornes de jour et de semaine sont calculées dans le fuseau `Pacific/Tahiti`.

### Notifications — **collection MongoDB**

Créées par les services métier, vérifiables dans les tests, persistantes. Unicité sur (client, produit, type) pour éviter les doublons. Le client les voit dans l'écran « Mes demandes ». Alternative écartée : email/SMS réels (hors périmètre du sujet).

### Paiement — **simulation**

Le sujet ne demande pas de paiement : la validation du panier enregistre la vente.

### CI — **GitHub Actions**

Lancera les tests, le lint et le build TypeScript du front et du back à chaque PR (workflow à créer dans `.github/workflows/`). Gratuit et intégré au dépôt. Alternative écartée : Jenkins (serveur dédié, trop lourd).

---

## 2. Spécification

### Vocabulaire

| Terme | Définition |
|---|---|
| **Produit** | Article du catalogue : référence unique, type, catégorie, désignation, prix TTC, taux de TVA |
| **Type de produit** | Liste fixe : livre, magazine (un numéro = un produit), papeterie |
| **Catégorie** | Rayon qui guide le client (roman, policier, BD et manga, jeunesse, documentaire, scolaire, presse, fournitures…). Liste gérée par le responsable (créer, renommer, supprimer si aucun produit ne l'utilise) ; le seed crée la liste de départ |
| **Promotion** | Remise en pourcentage sur un produit, valable entre deux dates |
| **Historique des prix** | Suite datée des prix catalogue d'un produit, affichée en courbe |
| **Stock physique** | Exemplaires en bon état présents dans le stock de la librairie |
| **Stock défectueux** | Exemplaires défectueux rapportés par des clients ; jamais vendables |
| **Mise de côté** | Quantité réservée pour un client après un réapprovisionnement, jusqu'à une échéance |
| **Stock vendable** | Stock physique − quantités mises de côté |
| **Mouvement** | Entrée (réception), vente, retour, remplacement ou ajustement (date, quantité, motif, opérateur) |
| **Opérateur** | Origine d'un mouvement : `responsable`, `client` (commande) ou `systeme` (traitement automatique). Jamais un employé nominatif |
| **Vente** | Commande validée par un client : lignes à prix figé, options, adresse de livraison, total |
| **Commande (client)** | Vente passée en ligne depuis le panier, toujours livrée à une adresse |
| **Option cadeau** | Vente marquée comme cadeau pour une occasion (Noël, anniversaire, fête) ; allonge le délai de retour, emballage cadeau possible |
| **Demande** | Requête d'un client sur un livre indisponible : produit épuisé du catalogue ou livre absent du catalogue |
| **Fournisseur** | Entreprise auprès de laquelle la librairie commande ; il y en a plusieurs |
| **Réapprovisionnement** | Commande fournisseur et ses réceptions (éventuellement partielles) |

### Acteurs et droits

| Acteur | Droits |
|---|---|
| **Client** (compte) | Consulter le catalogue et les meilleures ventes, commander en ligne, demander des livres indisponibles, suivre ses demandes |
| **Responsable de stock** (compte) | Gérer le catalogue, les prix, les fournisseurs, les approvisionnements, les inventaires et les rapports ; suivre et expédier les commandes, enregistrer les retours, échanges et remplacements |

La librairie vend uniquement en ligne : pas de magasin, pas de vente au comptoir, pas de retrait sur place. Aucune statistique par employé (consigne de l'enseignant). Les traitements automatiques (expiration des mises de côté) sont déclenchés par l'horloge du système.

### Exigences fonctionnelles

| ID | Exigence | Priorité | Critères d'acceptation |
|---|---|---|---|
| **EX01** | Gérer le catalogue | Haute | Créer, modifier, rechercher, archiver ou réactiver des produits. Référence unique, type, catégorie, désignation, prix TTC, taux de TVA, promotions. Filtre par type et par catégorie |
| **EX02** | Enregistrer les mouvements de stock | Haute | Chaque mouvement a une date, une quantité, un motif et un opérateur. Une correction d'inventaire conserve la quantité avant et après |
| **EX03** | Constituer un panier et valider un achat | Haute | Le client commande en ligne, depuis son compte. Options : cadeau (occasion), emballage cadeau ; livraison obligatoire. Vente entière ou rien ; si une ligne n'est plus disponible, les lignes en cause sont indiquées |
| **EX04** | Afficher la disponibilité | Haute | Le client voit « disponible » ou « épuisé » et, si une commande fournisseur est en cours, la date d'arrivée prévue. Le responsable voit stock physique, mis de côté, vendable et défectueux |
| **EX05** | Enregistrer les demandes de livres indisponibles | Moyenne | Produit épuisé du catalogue ou livre absent du catalogue (titre, auteur, ISBN facultatif), client, quantité, date. À la réception : mise de côté et notification du client |
| **EX06** | Gérer le réapprovisionnement | Haute | Plusieurs fournisseurs. Alerte quand le stock passe sous un pourcentage de la quantité achetée à l'origine. Commandes fournisseur avec date d'arrivée prévue, réceptions (y compris partielles) |
| **EX07** | Traiter les retours | Haute | Retrouver la vente, vérifier le délai (14 jours, 1 mois pour un cadeau) et la quantité retournable. Issue : remboursement, échange (plastique intact) ou remplacement d'un défectueux par un neuf |
| **EX08** | Produire des rapports | Moyenne | Ventes, retours, net, stock restant, pourcentage vendu de la quantité achetée, statistiques globales. Semaine ou période libre, filtre par catégorie, export CSV |
| **EX09** | Authentifier les utilisateurs | Haute | Inscription et connexion client ; connexion du responsable (compte créé par le seed). Chaque espace n'est accessible qu'au bon rôle |
| **EX10** | Mettre en avant les meilleures ventes | Moyenne | Sur la première page : meilleures ventes de la librairie (RG14), accès par catégorie |
| **EX11** | Suivre l'évolution des prix | Basse | Chaque changement de prix est historisé et affiché en courbe dans l'espace responsable |

Hors périmètre : emprunt de livres (consigne de l'enseignant), paiement réel, suivi de livraison.

### Règles métier

| ID | Règle |
|---|---|
| **RG01** | Prix et montants en XPF entiers, quantités entières, jamais négatifs ; stock vendable jamais négatif |
| **RG02** | Une ligne de vente fige le prix unitaire payé, la remise et le taux de TVA ; ils ne changent pas si le catalogue change |
| **RG03** | Validation du panier : tout ou rien, disponibilités revérifiées à la confirmation. Le panier ne réserve rien |
| **RG04** | Stock vendable = stock physique − mises de côté ; 0 unité vendable = épuisé. Le stock défectueux n'entre jamais dans le stock physique |
| **RG05** | Produit sans historique (aucun mouvement, vente, demande ou commande) = supprimable ; sinon il est archivé |
| **RG06** | Une demande n'est pas une vente. Une mise de côté a une échéance (paramètre, 7 jours par défaut) ; à expiration la quantité est libérée et la demande passe à `expiree`. Vendre au client titulaire consomme sa mise de côté. Une demande hors catalogue est rattachée au produit quand le responsable le crée |
| **RG07** | Une réception ou un retour validé deux fois ne crée pas de second mouvement. Quantité reçue ≤ quantité restant à recevoir. Retour ≤ quantité vendue non encore retournée |
| **RG08** | Rapport : ventes brutes, retours, net, quantités. Un stock à une date passée est recalculé depuis les mouvements |
| **RG09** | Délai de retour : 14 jours après la vente ; 1 mois (30 jours) si la vente porte l'option cadeau avec une occasion (Noël, anniversaire, fête). Les deux délais sont des paramètres |
| **RG10** | Un produit est à recommander quand son stock vendable est ≤ seuil d'alerte (%) × quantité achetée à l'origine. Quantité achetée à l'origine = total reçu lors de la dernière commande fournisseur reçue (à défaut, le stock initial) |
| **RG11** | Prix appliqué = arrondi(prix TTC × (100 − remise) / 100), remise de la promotion active à la date de vente (au plus une par produit et par date). TVA incluse : montant de TVA = arrondi(prix appliqué × taux / (100 + taux)). Arrondi à l'unité la plus proche |
| **RG12** | Issue d'un retour : **remboursement** (prix figé × quantité) ; **échange** si le plastique de protection est intact (l'article revient en stock, un autre est vendu, la différence est réglée ou remboursée) ; **remplacement** si l'article est défectueux (il passe en stock défectueux, un exemplaire neuf identique sort du stock ; sans exemplaire disponible → remboursement). Un article revendable retourné revient en stock physique, éventuellement remis sous cellophane |
| **RG13** | Options de vente : emballage cadeau et livraison ont chacun des frais fixes (paramètres). La livraison exige une adresse. Les frais s'ajoutent au total et ne sont pas remboursés lors d'un retour |
| **RG14** | Meilleures ventes : les 10 produits les plus vendus (quantités nettes des retours) sur les 30 derniers jours, tous clients confondus ; la même liste pour tous, connecté ou non |
| **RG15** | La création d'un produit puis chaque changement de prix catalogue ajoutent une entrée datée à l'historique des prix (au moins une entrée par produit) ; cet historique n'est jamais modifié |

### Statuts

| Objet | Statuts |
|---|---|
| Demande | `en_attente` → `mise_de_cote` → `honoree` ; `mise_de_cote` → `expiree` ; `en_attente` → `annulee` (par le client) |
| Commande client | `a_preparer` → `expediee` |
| Commande fournisseur | `en_cours` → `partiellement_recue` → `recue` |

### Qualité

| ID | Exigence |
|---|---|
| **EQ01** | La logique métier est testable **sans l'interface** |
| **EQ02** | Les tests sont déterministes : horloge injectable, données isolées |
| **EQ03** | Les données de démonstration (dont le compte responsable, les catégories de départ, des produits et des ventes pour les meilleures ventes) se réinitialisent en une commande |
| **EQ04** | Les erreurs sont compréhensibles et ne corrompent jamais les données |

### Définition de "terminé"

1. Comportement de l'exigence implémenté et fonctionnel.
2. Tests liés au ticket au vert.
3. PR relue par un autre membre.
4. Fusionnée dans `main`.
5. Docs/diagrammes à jour si besoin.

---

## 3. Décisions de cadrage

Source **Prof** : réponse de l'enseignant (notes dans `questions-prof.md`). Source **Équipe** : pas de réponse ou réponse ambiguë, choix de l'équipe. Ces choix sont définitifs pour le développement ; on ne les rouvre que si l'enseignant dit le contraire.

| Q | Décision | Source |
|---|---|---|
| 1 | Spécification au niveau exigence + critères d'acceptation + règles métier | Équipe |
| 2 | Livre : ISBN, auteur. Magazine : ISSN, numéro, date de parution. Papeterie : marque | Équipe |
| 3 | Catégories de livres pour guider le client ; liste gérée par le responsable, créée au départ par le seed. Types de produit fixes | Prof (catégories), Équipe (liste modifiable) |
| 4 | `reference` : code interne unique ; ISBN / ISSN sont des attributs à part | Équipe |
| 5 | Chaque numéro de magazine est un produit distinct | Équipe |
| 6 | Historique des prix conservé et affiché en courbe ; prix payé figé dans la vente | Prof |
| 7 | XPF, gestion des promotions et de la TVA (calcul : RG11) | Prof (calcul : Équipe) |
| 8 | Un produit archivé peut être réactivé | Équipe |
| 9 | Produit défectueux : stock défectueux séparé ; abîmé dans le stock → ajustement vers le stock défectueux | Prof |
| 10 | Le client commande en ligne avec livraison. La librairie vend uniquement en ligne : pas de magasin ni de vente au comptoir | Prof (en ligne), Équipe (pas de magasin) |
| 11 | Compte client obligatoire pour commander | Équipe |
| 12 | Un article dans le panier n'est pas réservé (RG03) | Prof |
| 13 | Retour sous 14 jours, 1 mois pour un cadeau lié à une occasion passée (RG09) | Prof |
| 14 | Remboursement, échange si plastique intact, remplacement si défectueux (RG12) | Prof (remboursement : Équipe) |
| 15 | Article défectueux retourné → stock défectueux, neuf fourni au client | Prof |
| 16 | Un client peut demander un livre absent du catalogue | Prof |
| 17 | Mise de côté de 7 jours par défaut, modifiable dans les paramètres | Équipe |
| 18 | À expiration, la demande passe à `expiree` (pas de remise en attente) | Équipe |
| 19 | Plusieurs fournisseurs ; une commande fournisseur = un fournisseur et un produit ; un produit peut venir de plusieurs fournisseurs | Prof (plusieurs), Équipe (reste) |
| 20 | Livraison supérieure au restant : refusée ; articles abîmés à la réception : non comptés comme reçus | Équipe |
| 21 | Semaine du lundi 00:00 au dimanche 23:59 (heure de Tahiti) ; période libre possible | Équipe |
| 22 | Ventes, retours, net, stock restant, pourcentage vendu de la quantité achetée, statistiques globales, aucune par employé | Prof |
| — | Frais d'emballage cadeau et de livraison : montants fixes paramétrables | Équipe |
| | Toute commande est livrée (pas de retrait sur place) : adresse obligatoire, frais de livraison toujours comptés. Les retours et échanges arrivent par colis | Équipe |
| — | Pas d'emprunt de livres | Prof |
| — | Pas de type de client : les meilleures ventes sont les mêmes pour tous (RG14). Écart assumé à la demande de l'enseignant (meilleures ventes selon le type du client) | Équipe |

---

## 4. Périmètre des écrans et traçabilité

Le détail de chaque écran est dans [`ecrans.md`](./ecrans.md). Les routes responsable sont créées sous `/admin`, réservées au rôle responsable ; leurs pages restent à remplir.

| # | Écran | Route | Exigences |
|---|---|---|---|
| 1 | Connexion et inscription | `/connexion`, `/inscription` | EX09 |
| 2 | Accueil et catalogue | `/catalogue` | EX01, EX04, EX10 |
| 3 | Fiche produit | `/produits/:id` | EX03, EX04, EX05 |
| 4 | Panier et commande | `/panier` | EX03 |
| 5 | Mes demandes | `/demandes` | EX05 |
| 6 | Tableau de bord | `/admin` | EX06, EX08 |
| 7 | Catalogue et prix | `/admin/catalogue` | EX01, EX11 |
| 8 | Stock et mouvements | `/admin/stock` | EX02, EX04 |
| 9 | Ventes et retours | `/admin/ventes` | EX03, EX07 |
| 10 | Demandes et mises de côté | `/admin/demandes` | EX05 |
| 11 | Fournisseurs, commandes et réceptions | `/admin/commandes` | EX06 |
| 12 | Réapprovisionnement et rapports | `/admin/rapports` | EX06, EX08 |
| 13 | Paramètres | `/admin/parametres` | RG06, RG09, RG13 |

| Exigence | Service prévu | Diagramme |
|---|---|---|
| EX01 | `ProduitService` | Classes |
| EX02 | `StockService` | Classes |
| EX03 | `VenteService` | Cas d'utilisation |
| EX04 | `StockService` | Classes (`quantiteVendable`) |
| EX05 | `DemandeService` | Séquence réception |
| EX06 | `ReapproService` | Séquence réception |
| EX07 | `RetourService` | Classes |
| EX08 | `RapportService` | — |
| EX09 | `AuthService` | — |
| EX10 | `RapportService` | — |
| EX11 | `ProduitService` | Classes (`HistoriquePrix`) |

---

*Document évolutif.*
