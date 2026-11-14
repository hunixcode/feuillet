Backlog

11/10/2026 - Noah (front A)

Fait :
- Création du projet frontend (React + Vite + TypeScript) dans frontend/
- Installation de react-router-dom, Vitest et Testing Library
- Proxy /api vers le backend dans vite.config.ts (port 3000, le même que le backend)
- Routes de l'espace client : /catalogue, /produits/:id, /panier, /demandes, /connexion, /inscription, plus une page introuvable
- ClientLayout avec l'en-tête, le menu et le pied de page
- Une page vide par écran, à remplir dans les prochaines tâches
- Dossiers prévus par le guide : services, contexts, types, utils, components, pages/responsable
- 4 tests sur les routes, le build et le lint passent
- Couleurs du thème café / moka dans index.css
- Fiche pour front B dans frontend/README.md (lancer le projet, dossiers, règles)
- Vérifié avec le backend et la doc récupérés sur main : dossiers frontend/ et backend/, API sous /api, routes client conformes aux 5 écrans client de docs/ecrans.md

Reste à faire :
- ~~Faire relire la PR du socle par front B puis la fusionner dans main~~ (fusionnée, PR #13)
- A1 : pages de connexion et d'inscription

À voir avec l'équipe :
- Qui fait la fiche produit, le panier et la commande ? Le guide frontend et l'emploi du temps ne disent pas la même chose
- Ajouter le build et les tests du frontend dans la CI (pas encore de GitHub Actions dans le dépôt)

11/10/2026 - Front B

Socle commun B0 (fusionné dans main, PR #14) :
- Types proposés pour les erreurs API, produits, ventes, utilisateurs et demandes ; contrats à valider avec le backend
- Client HTTP générique dans `frontend/src/services/api.ts` : préfixe `/api`, JSON, token `localStorage` et normalisation des erreurs réseau/HTTP
- Composants communs `Button`, `Input`, `ErrorMessage` et `Loader`
- Formatage des montants entiers XPF et des dates en français
- Tests Vitest du client HTTP, du formatage, des composants communs et des routes
- Vérifications locales : 78 tests, build et lint passent
- Le client HTTP n'est relié à aucun formulaire ni page ; aucun endpoint n'est supposé

13/10/2026 - Mise en cohérence de la documentation

- `docs/rapport.md` devient la source de vérité : exigences EX01–EX11, règles RG01–RG15, statuts, décisions de cadrage avec leur source (enseignant ou équipe), table de traçabilité écran → route → exigence
- Réponses de l'enseignant intégrées (notées dans `docs/questions-prof.md`) : TVA et promotions, courbe des prix, options cadeau / emballage / livraison, retours 14 jours ou 1 mois, échange si plastique intact, stock défectueux et remplacement, demandes hors catalogue, plusieurs fournisseurs, alerte en % de la quantité achetée, meilleures ventes par type de client, catégories de livres, pas d'emprunt
- Délai de retour harmonisé (le rapport disait 24 h) ; opérateur d'un mouvement défini (`responsable`, `client`, `systeme`)
- `docs/ecrans.md` aligné sur la spécification ; écran 13 Paramètres ajouté
- Les trois diagrammes UML redessinés avec PlantUML (sources dans `docs/diagrammes/src/`) : cas d'utilisation simplifié (2 acteurs, 8 cas, sans Vendeur), modèle de classes complet (fournisseurs, promotions, historique des prix, stock défectueux, options de vente, issues de retour, demandes hors catalogue), séquence de réception avec cas d'erreur et transaction
- Types du front réalignés sur le modèle

Reste à faire :
- Créer le workflow GitHub Actions (tests, lint, build front et back), plus tard
- Écrire le contrat d'API à partir du modèle de référence avant de brancher les pages
- Choisir une bibliothèque de graphiques pour la courbe des prix

15/10/2026 - Back : authentification (EX09)

Fait :
- `POST /api/auth/inscription` (compte client avec type de client), `POST /api/auth/connexion` (client et responsable), `GET /api/auth/moi` (session)
- `AuthService` : validation des champs avec messages par champ, e-mail normalisé et unique, mot de passe haché (bcrypt, 8 caractères minimum), token JWT HS256 de 8 h, même erreur pour e-mail inconnu et mauvais mot de passe
- Middlewares `authentifier` et `exigerRole` pour réserver chaque espace au bon rôle
- Format d'erreur commun `{ code, message, details? }` aligné sur `ApiError` du front ; contrat dans `docs/api.md`
- Horloge injectable (premier usage : expiration des tokens) ; repository utilisateur Mongoose (+ version en mémoire réservée aux tests)
- `npm run seed` crée ou réinitialise le compte responsable (variables `RESPONSABLE_EMAIL` et `RESPONSABLE_MOT_DE_PASSE`)
- `GET /api/health` vérifie aussi MongoDB (200 si la base répond, 503 sinon, délai de 2 s)
- Vitest + supertest + mongodb-memory-server installés : 74 tests (service, API, middleware, persistance, état de l'API) ; API lancée et vérifiée de bout en bout

Reste à faire :
- Brancher les pages Connexion et Inscription du front sur ces routes (A1), avec un contexte utilisateur
- Faire valider par l'équipe la règle de mot de passe (8 caractères minimum, décision technique) et la durée de session (8 h)
- Compléter le seed (catégories, produits, ventes de démonstration) pour EQ03

19/10/2026 - Retrait du type de client

- Le type de client est retiré du code (modèle, inscription, schéma, types front) et de la documentation
- EX09 : inscription sans type de client ; EX10 et RG14 : meilleures ventes communes à tous les visiteurs sur 30 jours
- Décision d'équipe ajoutée dans `rapport.md` §3 : écart assumé à la réponse de l'enseignant (meilleures ventes selon le type du client), consignée telle quelle dans `questions-prof.md`
- L'entrée du 15/10 qui mentionne l'inscription « avec type de client » n'est plus à jour

19/10/2026 - Noah (front A) : pages de connexion et d'inscription

Fait :
- Page de connexion reliée à POST /api/auth/connexion : client vers /catalogue, responsable vers /admin, retour à la page demandée si on venait d'une page protégée
- Page d'inscription reliée à POST /api/auth/inscription (nom, e-mail, mot de passe) : le client est connecté tout de suite et voit « Votre compte est créé » avec un bouton Continuer
- Les erreurs du backend s'affichent sous chaque champ (VALIDATION, EMAIL_DEJA_UTILISE), « E-mail ou mot de passe incorrect » dans un bandeau, message clair si le serveur est injoignable
- Mise en page de la maquette V2 commune aux deux pages (components/client/AccesCadre), sans en-tête ni pied de page
- L'espace responsable s'appelle /admin dans le front, comme demandé par le chef de projet
- 133 tests, le build et le lint passent

Reste à faire :
- Créer la page /admin (un responsable connecté tombe pour l'instant sur la page introuvable)

20/10/2026 - Noah (front A) : vérification automatique du frontend (issue #20)

Fait :
- .github/workflows/frontend.yml sur le modèle de backend.yml : à chaque push sur main et à chaque pull request qui touche frontend/, GitHub lance npm ci, npm run lint, npm test et npm run build
- Vérifié avant l'envoi dans une copie propre du frontend : installation avec npm ci, lint, 133 tests (aussi en heure UTC comme sur GitHub) et build passent

20/10/2026 - Back : produits (EX01, CRUD simple)

Fait :
- Modèle `Produit` (référence unique, désignation, type livre / magazine / papeterie, catégorie, prix TTC entier, taux de TVA, archivé) avec les champs propres à chaque type du diagramme de classes
- `GET /api/produits` (filtres type, catégorie, archivés), `GET /api/produits/:id` publics ; `POST`, `PUT`, `DELETE` réservés au responsable ; archivage et réactivation par `PUT` ; contrat dans `docs/api.md`
- `ProduitService` (validation par champ, erreur `409 REFERENCE_DEJA_UTILISEE`), repositories Mongoose et en mémoire ; `lireObjet` et `erreurValidation` déplacés dans `validation.ts` pour être partagés avec `AuthService`
- 93 tests backend (25 nouveaux : API produits et persistance Mongoose) ; API lancée et vérifiée de bout en bout sur une base temporaire

Reste à faire :
- Historique des prix (RG15) et règle « supprimer seulement sans historique, sinon archiver » (RG05)
- Catégories (liste fixe du seed) : `categorie` est pour l'instant un texte libre
- Recherche texte, promotions, prix appliqué et disponibilité attendus par le front
- Produits de démonstration dans le seed (EQ03)

21/10/2026 - Back : catalogue complet (EX01, EX11)

Fait :
- Historique des prix (RG15) : une entrée datée à la création puis à chaque changement de prix, jamais modifiée ; `GET /api/produits/:id/historique-prix` pour la courbe (responsable)
- Catégories gérées par le responsable : `GET` public, `POST`, `PUT` (renommage, identifiant inchangé) et `DELETE` (refusé si un produit l'utilise) sur `/api/categories` ; la catégorie d'un produit doit exister ; le seed crée la liste de départ
- Recherche `?q=` sans tenir compte de la casse (désignation, référence, auteur, ISBN, ISSN, marque)
- Promotions (responsable) : programmer, lister, supprimer ; au plus une promotion par produit à une date (409 `PROMOTION_EN_CONFLIT`) ; `prixApplique` et `promotion` du jour dans chaque produit (RG11), jour compté à l'heure de Tahiti
- Historique et promotions rangés dans le document produit (composition du diagramme de classes)
- Seed : catégories de départ (ajoutées si absentes) et 12 produits de démonstration (références `DEMO-…`), réinitialisés à chaque lancement sans toucher aux autres produits
- 120 tests backend

Reste à faire :
- Disponibilité et suppression limitée aux produits sans historique (RG05) : avec le stock
- Recherche insensible aux accents (« ile » ne trouve pas « Île »)
- Front : brancher les écrans 2, 3 et 7 sur ces routes

21/10/2026 - Noah (front A) : page catalogue (écran 2)

Fait :
- Page /catalogue reliée à GET /api/produits et GET /api/categories (services/produitService.ts et services/categorieService.ts)
- Recherche, rayons (catégories du backend) et filtre par type ; les filtres sont dans l'adresse (/catalogue?categorie=roman&q=...)
- Carte d'article de la maquette V2 (components/client/ProduitCarte) : couverture dessinée avec l'initiale, titre, auteur ou marque, prix en XPF, prix barré et remise en cas de promotion ; clic vers /produits/:id
- Chargement, aucun résultat (avec « Demander ce livre ») et erreur avec « Réessayer », comme dans la maquette
- types/produit.ts aligné sur docs/api.md (tauxTva, archive, champs par type, id de la promotion) et types/categorie.ts ajouté
- Catégorie de chaque article affichée sur sa carte (libellé tiré de GET /api/categories), comme le demande l'écran 2
- 164 tests, le build et le lint passent
- Tri des articles « Trier par » de la maquette : titre, prix croissant, prix décroissant (sur le prix payé) ; gardé dans l'adresse (?tri=), fait dans le navigateur sans redemander la liste ; 178 tests

Reste à faire :
- Afficher « disponible » ou « épuisé » quand le backend enverra la disponibilité (dépend du stock)
- Meilleures ventes (RG14) en haut de la page quand la route existera

22/10/2026 - Back : stock et mouvements (EX02, EX04)

Fait :
- Stock par produit (physique, mis de côté, défectueux) et journal des mouvements (date, type, quantité, motif, opérateur ; avant et après pour un ajustement)
- Correction d'inventaire, article abîmé (ajustement vers le stock défectueux, décision 9), sortie du stock défectueux ; jamais sous le mis de côté (RG04)
- `GET /api/stock`, `GET /api/produits/:id/stock`, `GET /api/mouvements` pour l'écran 8 ; contrat dans `docs/api.md`
- `disponibilite` (« disponible » ou « épuisé ») dans chaque produit du catalogue ; suppression refusée pour un produit qui a des mouvements (RG05, 409 `PRODUIT_AVEC_HISTORIQUE`)
- Stock et mouvement écrits ensemble dans une transaction MongoDB, avec refus si le stock a changé entre-temps (409 `STOCK_MODIFIE`)
- Seed : stock de départ des produits de démonstration (DEMO-LIV-006 épuisé)
- Lecture des anciens produits sans historique des prix ni promotions (correctif séparé)
- 136 tests backend ; le build n'embarque plus les repositories en mémoire

Reste à faire :
- RG05 : compter aussi les demandes et les commandes fournisseur quand elles existeront
- Mis de côté : alimenté par les demandes (EX05)
- Seuil d'alerte et quantité achetée à l'origine : avec le réapprovisionnement (EX06)
- Front : écran 8 et affichage de la disponibilité


08/11/2026 - Back : paramètres et ventes (EX03, issue #38)

Fait :
- Paramètres (écran 13) : `GET` et `PUT /api/parametres` (responsable), entiers strictement positifs, seuil d'alerte ≤ 100 % ; valeurs de départ créées par le seed sans écraser celles réglées
- `VenteService` : panier et commande en ligne du client connecté
- Devis sans enregistrement (`POST /api/commandes/devis` public) : prix du jour, remise, TVA incluse par ligne, frais d'emballage et de livraison des paramètres, total ; lignes indisponibles signalées
- Validation tout ou rien (RG03) : 409 `LIGNE_INDISPONIBLE` avec les lignes en cause ; vente et sortie de stock dans une même transaction, un mouvement `vente` par ligne lié à la vente, 409 `STOCK_MODIFIE` si le stock a changé entre-temps
- Livraison et adresse obligatoires, commande `a_preparer` puis `expediee` ; mes commandes (client), liste filtrée par statut et détail des commandes (responsable)
- Lignes à prix figés (RG02) ; un produit vendu n'est plus supprimable (RG05, par ses mouvements)
- Seed : 7 commandes de démonstration d'un client fictif sur les 30 derniers jours (EQ03), expédiées sauf la plus récente
- Décision d'équipe consignée dans `rapport.md` : commande toujours livrée
- 10/11/2026 : vente au comptoir retirée, la librairie vend uniquement en ligne (pas de magasin ni de retrait sur place)
- 168 tests backend (service, API, persistance avec transaction) ; seed et API vérifiés de bout en bout sur une base temporaire

Reste à faire :
- Vendre au client titulaire d'une mise de côté doit la consommer (avec les demandes, #39)
- Front : brancher le panier (#37) et la page Ventes et retours sur ces routes

09/11/2026 - Back : demandes, mises de côté et notifications (EX05, #39)

Fait :
- Demandes d'un client sur un produit épuisé ou sur un livre absent du catalogue (titre, auteur et ISBN facultatifs) ; suivi, annulation d'une demande en attente ; liste de toutes les demandes avec filtre par statut pour le responsable ; rattachement d'une demande hors catalogue au produit créé (RG06)
- Mises de côté par ordre d'arrivée tant qu'il reste du stock vendable, avec l'échéance des paramètres (fin du jour à Tahiti) et une notification par client et par produit ; prêtes pour la réception des commandes fournisseur (#40)
- Expiration à l'échéance : quantité libérée, demande `expiree` sans remise en attente (décision 18) ; vérifiée chaque minute et avant chaque liste
- Commande du client titulaire : sa mise de côté compte comme disponible (devis compris) et sa commande la consomme, demande `honoree` dans la même transaction
- Notifications lues et marquées comme lues par le client ; RG05 : un produit demandé n'est plus supprimable
- Contrat dans `docs/api.md`, aligné sur `frontend/src/types/demande.ts` ; 211 tests backend

Reste à faire :
- Création des mises de côté à la réception d'une commande fournisseur (#40)
- Front : brancher « Mes demandes », la demande depuis la fiche produit et l'écran 10 (#42, #44)

09/11/2026 - Back : fournisseurs, commandes et réceptions (EX06, #40)

Fait :
- Fournisseurs (nom, contact) ; commandes fournisseur d'un fournisseur et d'un produit avec date d'arrivée prévue, statuts `en_cours`, `partiellement_recue`, `recue`
- Réceptions saisies puis validées : quantité ≤ restant (RG07), abîmés non comptés comme reçus (décision 20), validation unique sans second mouvement
- Validation dans une transaction comme le diagramme de séquence : mouvement `entree`, commande à jour, mises de côté des demandes en attente et notifications
- Produits à recommander (RG10) avec la quantité achetée à l'origine, le pourcentage vendu et ce qui est déjà en commande ; seuil d'alerte par produit, sinon celui des paramètres
- Date d'arrivée prévue d'un produit épuisé dans le catalogue (EX04, `arriveePrevue` du front) ; RG05 : un produit commandé n'est plus supprimable
- Seed : deux fournisseurs et deux commandes en cours de démonstration
- Contrat dans `docs/api.md` ; 240 tests backend

Reste à faire :
- Front : écran 11 (fournisseurs, commandes, réceptions), alertes du tableau de bord et de l'écran 12 (#45, #46)

09/11/2026 - Back : retours, rapports et meilleures ventes (EX07, EX08, EX10, #41)

Fait :
- Retours par colis sur une ligne d'une commande expédiée : délai de 14 jours, 30 pour un cadeau avec occasion, jusqu'à la fin du jour à Tahiti (RG09) ; quantité encore retournable (RG07) ; détail d'une commande avec les quantités rendues et la date limite (écran 9)
- Issues (RG12) : remboursement au prix figé sans les frais, article revendable remis en stock ou défectueux ; échange (plastique intact, nouvel article commandé pour le même client et expédié à la même adresse, livraison offerte, différence réglée ou remboursée) ; remplacement d'un défectueux par un neuf, remboursement s'il n'y en a plus
- Un mouvement `retour` ou `remplacement` par retour, écrit avec le retour dans une transaction
- Rapports (RG08) : ventes brutes, retours, net, quantités, stock restant recalculé depuis les mouvements, pourcentage vendu de la quantité achetée, statistiques globales sans statistique par employé ; semaine du lundi au dimanche ou période libre, filtre par catégorie ; export CSV
- Meilleures ventes (RG14) : 10 produits, nets des retours, sur 30 jours, route publique, filtre par catégorie (EX10)
- Contrat dans `docs/api.md` ; 272 tests backend

Reste à faire :
- Front : retours de l'écran 9, rapports de l'écran 12, meilleures ventes de l'accueil (#42, #43, #46)

09/11/2026 - Production : front servi par l'API, arrêt propre, journaux (#54)

Fait :
- En production, l'API sert le front compilé (`frontend/dist`) sur la même origine et renvoie `index.html` pour les routes de React Router ; `/api` inconnue reste un 404 JSON, un asset absent aussi ; assets en cache un an, `index.html` sans cache
- Vérification de toutes les variables d'environnement au démarrage, avec tous les problèmes signalés d'un coup
- Arrêt propre sur `SIGTERM` : plus de nouvelles requêtes, fin de celles en cours (10 s au plus), fermeture de MongoDB
- Journal d'une ligne par requête sans corps ni en-têtes ; erreur 500 avec un identifiant de requête (`X-Request-Id`)
- Index MongoDB créés au démarrage (`autoIndex` coupé en production)
- `package.json` à la racine : `npm run installer`, `npm run build`, `npm start`, `npm run seed` ; section « Déployer » du README

Reste à faire :
- HSTS en production : PR #60 (#51)
- Docker (#53) et déploiement sur Render (#55)
