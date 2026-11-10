# Description des écrans

L'application comporte deux espaces : le client et le responsable. La librairie vend uniquement en ligne : il n'y a ni magasin, ni vente au comptoir, ni retrait sur place. Toute commande est livrée.

Les règles citées (RGxx) et les décisions de cadrage sont définies dans [`rapport.md`](./rapport.md). Les prix sont des entiers en XPF, TTC.

## Espace client

### 1. Connexion et inscription

- **But :** permettre au client d'ouvrir son compte ou d'en créer un.
- **Contenu :** adresse e-mail et mot de passe ; formulaire d'inscription avec nom, e-mail et mot de passe.
- **Actions :** se connecter ou créer un compte.
- **Affichage :** erreurs de saisie et confirmation lorsque le compte est créé.

Le responsable se connecte avec le même formulaire ; il est alors dirigé vers son espace.

### 2. Accueil et catalogue

C'est la première page de l'application.

- **But :** aider le client à découvrir les articles et à trouver ce qu'il cherche.
- **Contenu :** meilleures ventes de la librairie (RG14) ; catégories de livres pour orienter le client ; liste des articles avec désignation, catégorie, prix, promotion éventuelle et disponibilité ; recherche et filtres par type et par catégorie.
- **Actions :** parcourir une catégorie, rechercher ou filtrer, ouvrir une fiche produit.
- **Affichage :** prix en XPF, prix barré et prix remisé en cas de promotion, « disponible » ou « épuisé », message si aucun article ne correspond. Les articles archivés ne sont pas affichés.

### 3. Fiche produit

- **But :** consulter un article avant de l'acheter ou de le demander.
- **Contenu :** désignation, référence, catégorie, attributs propres au type (ISBN et auteur, ISSN et numéro, marque), prix TTC en XPF, promotion éventuelle, taux de TVA et disponibilité.
- **Actions :** choisir une quantité et l'ajouter au panier si l'article est disponible ; demander l'article s'il est épuisé.
- **Affichage :** indiquer clairement si l'article est disponible ou épuisé. S'il est épuisé et qu'une commande fournisseur est en cours, afficher la date d'arrivée prévue.

### 4. Panier et commande

- **But :** vérifier les articles et les options avant de confirmer l'achat.
- **Contenu :** articles, quantités, prix unitaires remisés, TVA incluse et total en XPF ; options : cadeau (occasion : Noël, anniversaire, fête), emballage cadeau, livraison à une adresse (obligatoire), avec leurs frais.
- **Actions :** modifier les quantités, retirer un article, choisir les options, confirmer la commande.
- **Affichage :** préciser que la présence d'un article dans le panier ne le réserve pas (RG03). Afficher le total, la TVA incluse et les frais d'options avant confirmation. Si un article n'est plus disponible au moment de confirmer, rien n'est enregistré : indiquer les lignes en cause et laisser le client corriger son panier.

### 5. Mes demandes

- **But :** demander un livre indisponible et suivre ses demandes.
- **Contenu :** formulaire pour un livre absent du catalogue (titre, auteur, ISBN facultatif, quantité) ; liste des demandes avec l'article, la quantité, la date et le statut (en attente, mis de côté, honorée, expirée, annulée) ; notifications de réapprovisionnement.
- **Actions :** envoyer une demande, consulter le suivi, annuler une demande en attente.
- **Affichage :** distinguer une demande d'une vente. Lorsqu'un article est mis de côté, afficher la quantité et la date limite pour le commander.

Une demande sur un article épuisé du catalogue se fait depuis sa fiche produit (écran 3).

## Espace responsable

### 6. Tableau de bord

- **But :** voir les informations importantes dès l'ouverture de l'espace responsable.
- **Contenu :** alertes de stock bas (RG10), commandes fournisseurs en cours et arrivées prévues, mises de côté qui arrivent à échéance, quelques statistiques globales.
- **Actions :** ouvrir la liste des produits concernés, consulter une commande ou accéder aux rapports.
- **Affichage :** statistiques globales uniquement, aucune statistique par employé.

### 7. Catalogue et prix

- **But :** consulter et gérer les articles de la librairie.
- **Contenu :** liste avec référence, désignation, type, catégorie, prix TTC en XPF, taux de TVA, promotion éventuelle, seuil d'alerte et disponibilité ; formulaire de création ou modification avec les attributs du type ; promotions (remise en %, dates de début et de fin) ; courbe de l'évolution du prix (RG15).
- **Actions :** rechercher et filtrer, créer ou modifier une fiche, programmer une promotion, archiver ou réactiver un article, supprimer un article sans historique (RG05), rattacher une demande hors catalogue à un article créé.
- **Affichage :** afficher séparément les articles actifs et archivés. Le bouton de suppression n'est proposé que pour un article sans historique.

### 8. Stock et mouvements

- **But :** consulter les quantités et suivre les changements de stock.
- **Contenu :** stock physique, quantités mises de côté, stock vendable et stock défectueux ; journal des mouvements avec date, article, type, quantité, motif et opérateur.
- **Actions :** rechercher un article, consulter ses mouvements, enregistrer une correction d'inventaire (quantité avant et après le comptage), déclarer un article abîmé (passage en stock défectueux) ou sortir du stock défectueux (renvoi, destruction).
- **Affichage :** différencier les articles vendables des défectueux ; un livre défectueux n'apparaît jamais comme disponible. L'opérateur est `responsable`, `client` ou `systeme`, jamais un employé.

### 9. Ventes et retours

- **But :** suivre les commandes des clients jusqu'à leur expédition et traiter les retours reçus par colis.
- **Contenu :** liste et détail des commandes avec client, adresse de livraison et statut (à préparer, expédiée) ; pour une commande, articles et quantités déjà retournés.
- **Actions :** filtrer par statut, marquer une commande comme expédiée, enregistrer un retour avec son issue : remboursement, échange (plastique intact, le nouvel article est expédié à l'adresse de la commande) ou remplacement d'un défectueux par un neuf (RG12).
- **Affichage :** prix figés, remises et TVA de la commande en XPF. Afficher la date limite de retour (14 jours, ou 1 mois pour un cadeau, RG09), la quantité encore retournable et le montant remboursé. Pour un article revendable rendu ouvert, indiquer qu'il peut être remis en vente sous cellophane.

### 10. Demandes et mises de côté

- **But :** suivre les demandes des clients et les articles mis de côté.
- **Contenu :** liste des demandes avec l'article (ou le titre demandé s'il est hors catalogue), le client, la quantité, la date et le statut ; mises de côté avec quantité et date limite.
- **Actions :** filtrer par statut, consulter une demande, créer l'article d'une demande hors catalogue (écran 7).
- **Affichage :** distinguer les livres absents du catalogue des articles temporairement épuisés, et les demandes des ventes confirmées. Les mises de côté sont créées automatiquement à la réception (voir diagramme de séquence) et expirent seules (RG06).

### 11. Fournisseurs, commandes et réceptions

- **But :** gérer les fournisseurs et suivre les articles commandés jusqu'à leur réception.
- **Contenu :** fournisseurs (nom, contact) ; commandes avec fournisseur, produit, quantités commandées, reçues et restantes, date de commande, date d'arrivée prévue et statut.
- **Actions :** créer ou modifier un fournisseur, créer une commande, enregistrer une réception (éventuellement partielle).
- **Affichage :** montrer clairement les quantités encore attendues et leur date d'arrivée prévue. Une réception supérieure au restant est refusée (RG07).

### 12. Réapprovisionnement et rapports

- **But :** repérer les produits à recommander et consulter l'activité de la librairie.
- **Contenu :** produits à recommander avec le pourcentage de la quantité achetée à l'origine déjà vendu ; ventes brutes, retours, net, quantités et stock restant sur une période ; statistiques globales ; filtre par catégorie.
- **Actions :** choisir une semaine ou une période libre et une catégorie, consulter les résultats, exporter en CSV.
- **Affichage :** séparer ventes et retours, aucune statistique par employé.

### 13. Paramètres

- **But :** régler les paramètres métier.
- **Contenu :** durée des mises de côté (7 jours), délai de retour (14 jours), délai de retour d'un cadeau (30 jours), frais d'emballage cadeau, frais de livraison, seuil d'alerte par défaut (%).
- **Actions :** modifier et enregistrer.
- **Affichage :** valeurs entières strictement positives (frais en XPF).

## Hors périmètre

- Emprunt de livres (consigne de l'enseignant)
- Paiement réel (simulé)
- Suivi de livraison (la commande passe simplement à « expédiée »)
