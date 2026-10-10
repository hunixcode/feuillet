# Description des écrans

L'application comporte deux espaces : le client et le responsable. Les employés ne possèdent pas de compte et n'ouvrent pas de session dans l'application. Les opérations effectuées au comptoir sont enregistrées dans l'espace du responsable, sans classement des ventes par employé.

## Espace client

### 1. Connexion et inscription

- **But :** permettre au client d'ouvrir son compte ou d'en créer un.
- **Contenu :** adresse e-mail et mot de passe ; formulaire d'inscription avec nom et coordonnées de connexion.
- **Actions :** se connecter ou créer un compte.
- **Affichage :** erreurs de saisie et confirmation lorsque le compte est créé.

### 2. Accueil et catalogue

- **But :** aider le client à découvrir les articles et à trouver ce qu'il cherche.
- **Contenu :** catégories de livres, sélections de meilleures ventes adaptées au type de client, recherche et filtres par catégorie. Chaque article présente son nom, son prix et sa disponibilité.
- **Actions :** parcourir une catégorie, rechercher ou filtrer les articles, ouvrir une fiche produit.
- **Affichage :** montrer le prix en XPF, la promotion éventuelle et un message si aucun article ne correspond. Les articles archivés ne sont pas proposés à l'achat.

### 3. Fiche produit

- **But :** consulter les informations d'un article avant de l'acheter ou de le demander.
- **Contenu :** nom, référence, catégorie, description, prix en XPF, promotion éventuelle, TVA et disponibilité.
- **Actions :** choisir une quantité et l'ajouter au panier si l'article est disponible ; demander un livre épuisé ou absent du catalogue.
- **Affichage :** indiquer clairement si l'article est disponible ou épuisé.

### 4. Panier et commande

- **But :** vérifier les articles et les options avant de confirmer l'achat.
- **Contenu :** articles, quantités, prix, promotions, TVA et total en XPF ; choix éventuel d'un emballage cadeau et de la livraison.
- **Actions :** modifier les quantités, retirer un article, choisir les options et confirmer la commande.
- **Affichage :** préciser que la présence d'un article dans le panier ne le réserve pas. Afficher le prix total et les options avant confirmation. Si un article n'est plus disponible au moment de confirmer, l'indiquer et laisser le client corriger son panier.

### 5. Demandes et mises de côté

- **But :** demander un livre indisponible et consulter l'état des demandes.
- **Contenu :** formulaire pour identifier le livre recherché ; liste des demandes avec le titre, la date et le statut.
- **Actions :** envoyer une demande et consulter son suivi.
- **Affichage :** distinguer une demande d'une vente. Lorsqu'un article est mis de côté, afficher la quantité et la date limite de retrait.

## Espace responsable

### 6. Tableau de bord

- **But :** voir les informations importantes dès l'ouverture de l'espace responsable.
- **Contenu :** alertes de stock bas, produits à recommander, commandes fournisseurs en cours, arrivages prévus et quelques statistiques générales.
- **Actions :** ouvrir la liste des produits concernés, consulter une commande ou accéder aux rapports.
- **Affichage :** présenter les statistiques de façon globale, sans indiquer quel employé a vendu quoi.

### 7. Catalogue et prix

- **But :** consulter et gérer les articles de la librairie.
- **Contenu :** liste avec référence, nom, catégorie, prix en XPF, promotion éventuelle et disponibilité ; formulaire de création ou modification ; historique des prix présenté sous forme de graphique.
- **Actions :** rechercher et filtrer les articles, créer ou modifier une fiche, archiver un article ou supprimer un article sans historique.
- **Affichage :** afficher séparément les articles actifs et archivés. Sur le graphique, montrer l'évolution du prix dans le temps (historique des prix).

### 8. Stock et mouvements

- **But :** consulter les quantités et suivre les changements de stock.
- **Contenu :** stock physique, stock vendable, quantités mises de côté et stock défectueux ; journal des mouvements avec date, article, type, quantité et motif.
- **Actions :** rechercher un article, consulter ses mouvements et enregistrer une correction d'inventaire en indiquant la quantité avant et après le comptage.
- **Affichage :** différencier les articles vendables des articles défectueux. Un livre défectueux retourné apparaît dans le stock défectueux, et non parmi les articles disponibles à la vente.

### 9. Ventes et retours au comptoir

- **But :** enregistrer et consulter les opérations faites en magasin depuis l'espace du responsable.
- **Contenu :** recherche d'articles et panier de vente ; liste et détail des ventes ; recherche d'une vente pour consulter les articles et quantités déjà retournés.
- **Actions :** enregistrer une vente, consulter une vente ou afficher les choix de retour, échange et remplacement. Pour un livre défectueux, enregistrer son remplacement par un exemplaire neuf.
- **Affichage :** montrer prix en XPF, promotions et TVA appliqués à la vente. Afficher les délais de retour : 14 jours normalement, jusqu'à un mois pour un cadeau lié à une occasion déjà passée. Si le plastique de protection est intact, afficher la possibilité de remplacement ; un emballage type cellophane peut être indiqué pour un article remis en vente.

### 10. Demandes de livres indisponibles

- **But :** consulter les demandes des clients et les articles à mettre de côté.
- **Contenu :** liste des demandes avec le livre recherché, le client, la date et le statut ; mises de côté avec quantité et date limite.
- **Actions :** consulter une demande et afficher les informations nécessaires à son suivi.
- **Affichage :** distinguer les articles absents du catalogue des articles temporairement épuisés, et les demandes des ventes confirmées.

### 11. Fournisseurs, commandes et arrivages

- **But :** consulter les fournisseurs et suivre les articles commandés jusqu'à leur réception.
- **Contenu :** fournisseurs, commandes associées, produits, quantités commandées, reçues et restantes, dates de commande et dates d'arrivée prévues.
- **Actions :** consulter une commande ou une réception, y compris une réception partielle.
- **Affichage :** montrer clairement les quantités encore attendues et leur date d'arrivée prévue.

### 12. Réapprovisionnement et rapports

- **But :** repérer les produits à recommander et consulter l'activité de la librairie.
- **Contenu :** alertes de stock bas, pourcentage de la quantité achetée à l'origine déjà vendu, ventes, retours et stock sur une période ; filtre par catégorie.
- **Actions :** choisir une période ou une catégorie, consulter les résultats et exporter le rapport en CSV.
- **Affichage :** séparer ventes et retours, montrer les indicateurs généraux et ne pas afficher de statistiques par employé.

