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

21/10/2026 - Noah (front A) : fiche produit (écran 3)

Fait :
- Page /produits/:id reliée à GET /api/produits/:id (obtenirProduit dans services/produitService.ts)
- Désignation, auteur ou marque, prix TTC en XPF, taux de TVA, référence et catégorie ; en promotion : prix barré, remise et date de fin
- Champs selon le type : auteur et ISBN (livre), ISSN, numéro et date de parution (magazine), marque (papeterie)
- Fil d'Ariane vers le catalogue et vers le rayon du produit ; page introuvable si le produit n'existe pas (404) ; erreur avec « Réessayer »
- Couverture partagée avec le catalogue (components/client/Couverture)
- utils/format.ts : formatJour pour les dates AAAA-MM-JJ de l'API, sans décalage d'un jour à l'heure de Tahiti (formatDate affichait le 30 au lieu du 31)
- Quantité et bouton « Ajouter au panier » de la maquette, désactivés avec « L'ajout au panier sera bientôt disponible » en attendant le panier
- 176 tests (vérifiés à l'heure de Tahiti et en UTC), le build et le lint passent ; fiche vérifiée avec la vraie base
- Titre de l'onglet propre à chaque page (« Catalogue · Feuillet », « L'Île au trésor · Feuillet », Connexion, Créer un compte, Page introuvable) avec la balise title de React 19 ; 179 tests
- Page d'erreur générale (pages/ErreurPage) branchée en haut du routeur (errorElement) : si une page plante, « Une erreur est survenue » avec Réessayer et Retour au catalogue, au lieu de l'écran brut de React Router ; 180 tests
- Chargement de la fiche produit en squelette (blocs gris animés à la place de la couverture, du titre, du prix et des détails), comme le catalogue ; les styles des squelettes sont maintenant communs dans index.css

Reste à faire :
- Disponibilité, ajout au panier et demande d'un article épuisé, quand le stock, le panier et les demandes existeront

21/10/2026 - Front : catalogue du responsable (écran 7, EX01, EX11)

Fait :
- Page /admin/catalogue branchée sur `/api/produits` et `/api/categories` : articles actifs et archivés dans deux onglets, recherche, filtres par type et par catégorie ; prix barré et prix appliqué en cas de promotion
- Panneau d'un article : modification de la fiche (champs du type choisi), archiver ou réactiver, supprimer après confirmation, promotions (programmer, supprimer, « en cours »), historique du prix en marches (SVG, sans bibliothèque) : prix catalogue, promotion en cours en pointillés, mois sous l'axe et légende
- Colonne Promotion : remise ou « Aucune »
- Création d'un article et gestion des catégories (ajouter, renommer, supprimer) dans le même panneau ; erreurs du backend affichées sous chaque champ
- `services/catalogueAdminService.ts` (création, modification, archivage, suppression, promotions, historique des prix, catégories) ; réutilise `Produit`, `Promotion` et `Categorie` du catalogue client, ajoute `FicheProduit` et `EntreePrix` à `types/produit.ts` ; composant commun `Select`
- `formatDate` garde le jour d'une date AAAA-MM-JJ (avant, une promotion du 10 octobre s'affichait « 9 octobre » à Tahiti) ; profite aussi au catalogue client
- Vérifié contre la vraie API (repositories en mémoire) : création, modification, historique des prix, promotions, archivage, suppression et catégories, avec les erreurs 400 / 409
- 183 tests frontend (20 nouveaux), lint et build passent

Reste à faire :
- Colonne Disponibilité prête : elle affiche « 9 vendables » / « Épuisé » à partir d'un champ `quantiteVendable` (nom du diagramme de classes) que l'API doit ajouter à chaque produit avec le stock ; en attendant « Non renseigné ». Nom du champ à valider avec le back
- Seuil d'alerte dans la liste : avec le stock
- Bouton Supprimer seulement pour un article sans historique (RG05) : il faut que l'API indique si l'article est supprimable
- Rattacher une demande hors catalogue à un article créé : avec les demandes

22/10/2026 - Noah (front A) : page Mes demandes (écran 5)

Fait :
- Page /demandes (client connecté) de la maquette V2 : formulaire « Demander un livre » pour un livre absent du catalogue (titre, auteur et ISBN facultatifs, quantité)
- Bouton « Envoyer la demande » grisé avec « L'envoi des demandes sera bientôt disponible » : le backend n'a pas encore de route pour les demandes
- Zone de suivi avec un message d'attente qui annonce les statuts (en attente, mis de côté, honorée, expirée, annulée)
- Styles du grand titre de page et du message vide mis en commun dans index.css (catalogue et demandes)
- Entrée « fiche produit (écran 3) » du 21/10 remise dans le backlog : elle avait été perdue en réglant le conflit de la PR d'Hiva
- « Demander ce livre » du catalogue (aucun résultat) pré-remplit le titre cherché dans le formulaire (/demandes?titre=...) ; la route protégée garde aussi ces paramètres quand elle renvoie vers la connexion
- formatJour supprimé : formatDate gère maintenant les dates AAAA-MM-JJ (correction d'Hiva), la fiche produit l'utilise
- README du front mis à jour : contrat dans docs/api.md, branche commune dev-front, tests avec fetch simulé
- 206 tests (heure de Tahiti et UTC), le build et le lint passent
- Parcours client vérifié avec la vraie base (rayons, recherche, tri, fiche, 404, accès protégé, téléphone) ; rayon vide : le message ne parle plus d'orthographe quand rien n'a été cherché ; 207 tests
- À savoir : la recherche est sensible aux accents (« tresor » ne trouve pas « trésor »), limite déjà notée côté back

Reste à faire, quand le backend aura les routes des demandes :
- Envoyer la demande et afficher les erreurs du serveur sous chaque champ
- Liste des demandes avec quantité, date, statut, et la date limite de retrait d'un article mis de côté
- Annuler une demande en attente ; notifications de réapprovisionnement

29/10/2026 - Noah (front A) : page Panier (écran 4, issue #37)

Fait :
- Panier partagé entre les pages (contexts/PanierContext et usePanier), gardé dans le navigateur (localStorage) ; un panier enregistré abîmé est ignoré
- Disponibilité (EX04) envoyée par l'API : « Disponible » ou « Épuisé » sur les cartes du catalogue et sur la fiche produit
- Fiche produit : quantité et « Ajouter au panier » actifs si l'article est disponible ; s'il est épuisé, bouton grisé et « Demander ce livre »
- Compteur d'articles sur le lien Panier de l'en-tête
- Page /panier de la maquette V2 : articles rechargés depuis l'API à l'ouverture (prix et disponibilité à jour), quantité modifiable, retrait, article épuisé ou retiré du catalogue signalé, panier vide
- Options : cadeau avec occasion (Noël, anniversaire, fête), emballage cadeau, adresse de livraison ; pas de retrait en magasin (vente uniquement en ligne)
- Total, TVA et frais affichés « calculés par la librairie » et bouton « Confirmer la commande » grisé, en attendant la route des ventes du back ; aucun calcul de prix dans le front
- Visiteur : « Se connecter pour commander » ramène au panier après la connexion
- Composants communs ChoixQuantite (fiche et panier) et LignePanier
- Backlog réparé après la fusion de main : marqueurs de conflit retirés et entrée « fiche produit (écran 3) » remise
- 240 tests (heure de Tahiti et UTC), le build et le lint passent

Reste à faire, quand le back aura la route des ventes :
- Afficher le vrai total, la TVA et les frais ; confirmer la commande (tout ou rien, RG03) ; signaler les lignes refusées ; page « Commande confirmée »

08/11/2026 - Noah (front A) : vraies couvertures des livres (issue #47)

Fait :
- Composant Couverture : la vraie couverture est chargée depuis Open Library avec l'ISBN du livre, par-dessus la couverture dessinée
- Sans ISBN, ou si Open Library n'a pas d'image, la couverture dessinée reste affichée (aussi pendant le chargement)
- Les images ne sont chargées qu'en arrivant à l'écran (loading="lazy")
- 244 tests, le build et le lint passent


08/11/2026 - Sécurité des dépendances (issue #52)

Fait :
- `npm audit fix` dans `backend/` (lockfile seulement) : body-parser 2.3.0 vers 2.4.0 (haute, déni de service), qs 6.16.0 vers 6.17.1 (moyenne), follow-redirects 1.16.1 vers 1.16.3 (développement) ; plus aucune vulnérabilité, 136 tests et build passent
- Workflows backend et frontend : étape `npm audit --omit=dev --audit-level=high`, la CI échoue sur une vulnérabilité haute ou critique d'une dépendance de production
- `.github/dependabot.yml` : mises à jour hebdomadaires (lundi, heure de Tahiti) de `backend/`, `frontend/` et des actions GitHub, mineures regroupées
- README : marche à suivre quand une alerte arrive
- 13/11/2026 : la nouvelle étape de CI a bloqué la PR sur une faille haute de mongoose publiée entre-temps ; `npm audit fix` (mongoose 9.11.1 vers 9.12.1, mongodb 7.7.0 vers 7.8.0), 272 tests et build passent

Reste à faire :
- Activer les alertes et les mises à jour de sécurité Dependabot dans les réglages du dépôt (Settings, Code security), qui ne se configurent pas par fichier

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

11/11/2026 - Noah (front A) : panier branché sur les commandes (issue #42, partie 1)

Fait :
- main récupérée dans dev-front (routes du back #38 à #41)
- types/vente.ts aligné sur le back : Devis, Montants, lignes avec montant et TVA, client, statut expédiée
- services/commandeService : devis (POST /api/commandes/devis), commande (POST /api/commandes) et détail d'une commande
- Panier : sous-total, emballage, livraison, total et TVA affichés tels que renvoyés par le devis du back, recalculés à chaque changement (quantité, emballage, occasion) ; montant de chaque ligne ; aucun calcul de prix dans le front (RG11, RG13)
- Lignes que la librairie ne peut plus servir signalées grâce au devis
- « Confirmer la commande » actif pour un client : panier vidé puis page de la commande ouverte ; refus LIGNE_INDISPONIBLE (rien n'est enregistré, lignes signalées, RG03), STOCK_MODIFIE et adresse manquante (message sous le champ) expliqués
- Page /commandes/:id (client connecté) : « Commande confirmée » après la commande, articles à prix figés, remise, adresse, options et montants
- 324 tests (heure de Tahiti et UTC), le build et le lint passent

Reste à faire (#42) :
- Liste « Mes commandes » avec le statut
- Demandes depuis la fiche produit et la page Mes demandes : envoi, suivi, annulation, notifications
- Date d'arrivée prévue sur la fiche, meilleures ventes sur le catalogue

11/11/2026 - Noah (front A) : Mes commandes (issue #42, partie 2)

Fait :
- Page /commandes (client connecté) : liste des commandes de la plus récente à la plus ancienne (GET /api/commandes), avec la date, le nombre d'articles, le total renvoyé par le back et le statut (à préparer, expédiée le …) ; clic vers le détail
- Lien « Mes commandes » dans le menu du site et lien « Voir toutes mes commandes » sur le détail d'une commande
- Message quand il n'y a aucune commande, erreur avec bouton Réessayer
- 330 tests (heure de Tahiti et UTC), le build et le lint passent

Reste à faire (#42) :
- Demandes depuis la fiche produit et la page Mes demandes : envoi, suivi, annulation, notifications
- Date d'arrivée prévue sur la fiche, meilleures ventes sur le catalogue

11/11/2026 - Noah (front A) : demandes et notifications (issue #42, partie 3)

Fait :
- services/demandeService : envoi, liste et annulation des demandes, notifications et lecture (routes du back #39)
- Fiche produit d'un article épuisé : le client le demande directement avec la quantité souhaitée (POST /api/demandes) ; visiteur invité à se connecter ; DEMANDE_EN_COURS et PRODUIT_DISPONIBLE expliqués ; date de retour prévue affichée quand une commande fournisseur est en cours (arriveePrevue, EX04)
- Page Mes demandes : suivi de chaque demande (quantité, date, statut en attente, mise de côté, honorée, expirée ou annulée avec sa date), date limite d'une mise de côté, annulation d'une demande en attente, ajout au panier des exemplaires mis de côté
- Notifications de réapprovisionnement en haut de la page, masquées une fois lues
- Formulaire pour un livre absent du catalogue branché : erreurs du back sous chaque champ, confirmation et ajout immédiat au suivi ; « bientôt disponible » retiré
- Panier : un article épuisé mis de côté pour le client n'est plus bloqué, seules les lignes refusées par le devis du back sont signalées
- formatJourTahiti : dates de demande et de mise de côté affichées au jour de Tahiti
- 341 tests (heure de Tahiti et UTC), le build et le lint passent

Reste à faire (#42) :
- Meilleures ventes (RG14) en haut du catalogue

11/11/2026 - Noah (front A) : meilleures ventes sur le catalogue (issue #42, partie 4)

Fait :
- produitService : listerMeilleuresVentes (GET /api/meilleures-ventes, RG14)
- Catalogue : rangée « Les meilleures ventes » en haut de la page complète, dans l'ordre renvoyé par le back ; cachée pendant une recherche, dans un rayon ou s'il n'y a encore aucune vente
- Plus aucun « bientôt disponible » dans les pages client
- Route vérifiée avec le vrai back (réponse vide tant qu'aucune vente n'est enregistrée dans la base partagée)
- 344 tests (heure de Tahiti et UTC), le build et le lint passent
- Parcours client vérifié de bout en bout avec le vrai back et le vrai front sur une base MongoDB temporaire locale remplie par le seed (la base partagée n'est pas touchée) : commande, Mes commandes, demande depuis la fiche, réception du responsable, notification, commande du livre mis de côté, demande hors catalogue et annulation (22 étapes réussies)

Reste à faire :
- Issue #42 terminée : PR dev-front vers main à ouvrir
- Issue #43 : page Ventes et retours du responsable
09/11/2026 - Sécurité : limites de requêtes (#50)

Fait :
- `express-rate-limit` : connexion limitée à 10 essais échoués par 15 minutes (par IP et e-mail), inscription à 5 comptes par heure et par IP, routes publiques (`GET /api/produits`, `GET /api/meilleures-ventes`, `POST /api/commandes/devis`) à 120 requêtes par minute et par IP
- Réponse `429 TROP_DE_REQUETES` au format commun avec `Retry-After` ; contrat dans `docs/api.md`, message affiché par la page de connexion
- `TRUST_PROXY` pour lire l'IP réelle derrière le proxy de Render ; limites réglables dans `createApp` (valeurs basses dans les tests)

Reste à faire :
- Compteurs en mémoire, pour une seule instance du serveur : passer à Redis ou à la base si l'API tourne un jour sur plusieurs instances

09/11/2026 - Sécurité : en-têtes HTTP, CORS et taille des requêtes (#51)

Fait :
- helmet : `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `Strict-Transport-Security` en production seulement
- Content Security Policy sans script inline, compatible avec le front compilé et Google Fonts (vérifiée dans Chrome sur accueil, catalogue, connexion, inscription et panier, sans violation)
- CORS : même origine par défaut, `CORS_ORIGINES` si le front est servi ailleurs
- Corps JSON limité à 100 ko ; aucune trace d'erreur renvoyée au client (testé) ; contrat dans `docs/api.md`

Reste à faire :
- Décider en équipe : token dans `localStorage` (actuel, protégé par la CSP) ou cookie `httpOnly`, `Secure`, `SameSite=Strict` ; noter la décision dans `docs/rapport.md`
- Ajouter les domaines des images de couverture à la CSP avec #47

09/11/2026 - Production : front servi par l'API, arrêt propre, journaux (#54)

Fait :
- En production, l'API sert le front compilé (`frontend/dist`) sur la même origine et renvoie `index.html` pour les routes de React Router ; `/api` inconnue reste un 404 JSON, un asset absent aussi ; assets en cache un an, `index.html` sans cache
- Vérification de toutes les variables d'environnement au démarrage, avec tous les problèmes signalés d'un coup
- Arrêt propre sur `SIGTERM` : plus de nouvelles requêtes, fin de celles en cours (10 s au plus), fermeture de MongoDB
- Journal d'une ligne par requête sans corps ni en-têtes ; erreur 500 avec un identifiant de requête (`X-Request-Id`)
- Index MongoDB créés au démarrage (`autoIndex` coupé en production)
- `package.json` à la racine : `npm run installer`, `npm run build`, `npm start`, `npm run seed` ; section « Déployer » du README

Reste à faire :
- Docker (#53) et déploiement sur Render (#55)

09/11/2026 - Docker : back, front et MongoDB en replica set (#53)

Fait :
- `backend/Dockerfile` en plusieurs étapes (contexte : racine du dépôt) : dépendances, build du front et du back, image finale `node:22-alpine` avec les seules dépendances de production, utilisateur `node`, `HEALTHCHECK` sur `/api/health` ; l'API y sert le front compilé
- `docker-compose.yml` de développement : MongoDB 7 en replica set à un nœud initialisé tout seul, API en `tsx watch`, front Vite avec le proxy `/api` vers le conteneur ; rechargement par scrutation des fichiers montés ; ports réglables
- Seed : `docker compose run --rm backend npm run seed` ; secrets dans `backend/.env`, aucun dans les fichiers Docker ; `.dockerignore`
- Vérifié depuis un clone propre : `docker compose up`, seed, connexion du responsable, catalogue, correction d'inventaire en transaction, rechargement de l'API ; image de production saine et arrêt propre sur `docker stop`

Reste à faire :
- Déploiement sur Render (#55)

13/11/2026 - Back : paiement fictif de démonstration (#57)

Fait :
- `POST /api/commandes` exige `paiementDemo` (`accepte` ou `refuse`) : résultat simulé envoyé par le front, aucune donnée de carte reçue ni gardée ; le devis n'en a pas besoin
- Articles vérifiés d'abord (RG03), puis un refus répond `402 PAIEMENT_REFUSE` sans rien écrire : ni vente, ni sortie de stock, ni mise de côté consommée
- La vente garde `paiement` (mode `demo`, statut `accepte`, date) ; la commande d'un échange n'en a pas (la différence se règle avec le retour)
- Seed des ventes de démonstration au paiement accepté ; contrat dans `docs/api.md`, décision dans `docs/rapport.md` ; 320 tests backend

Reste à faire :
- Front : fait dans la PR #77 (étape « Paiement (démonstration) » du panier)

13/11/2026 - Déploiement : démo en local avec Docker (#55)

Fait :
- Décision : pas de mise en ligne, c'est un projet de classe ; la démo se fait avec `docker compose` et le seed, noté dans `docs/rapport.md`
- #55 (environnement de dev sur Render) fermée sans suite

14/11/2026 - Noah (front A) : paiement fictif de démonstration dans le panier (issue #57)

Fait :
- Panier : étape « Paiement (démonstration) » dans le récapitulatif, avec « Paiement fictif : aucun montant n'est débité », sans aucun champ de carte
- Bouton « Payer (démo) » qui envoie paiementDemo « accepte » à POST /api/commandes, et bouton « Simuler un refus » qui envoie « refuse »
- Paiement refusé (402 PAIEMENT_REFUSE) : message dans le récapitulatif, rien n'est enregistré, panier et adresse gardés, le client peut payer à nouveau
- Types : paiementDemo dans le panier envoyé, paiement (mode demo, statut accepte, date) dans la commande
- 348 tests (heure de Tahiti et UTC), le build et le lint passent
- Vérifié avec le back de la PR #74 sur une base MongoDB temporaire locale (la base partagée n'est pas touchée) : refus sans commande enregistrée, puis paiement accepté et commande qui garde le paiement ; le parcours client complet passe toujours (22 étapes)

Reste à faire :
- Merge de la PR #74 (back du paiement) avec ce front


15/11/2026 - Tests de bout en bout du parcours d'achat avec Playwright (#56)

Fait :
- Dossier `e2e/` : `serveur.mjs` lance l'application comme en production (MongoDB temporaire en replica set, seed, API qui sert le front compilé sur le port 4173), sans lire `backend/.env`
- Parcours client : inscription, catalogue, fiche, panier, paiement refusé puis accepté, commande confirmée et visible dans Mes commandes, panier vidé
- Parcours responsable : commande passée par l'API, expédiée depuis Ventes et retours, vente de −2 dans le journal du stock et stock en rayon qui passe de 5 à 3
- Article épuisé au moment de payer : l'inventaire tombe à 0 pendant que le client est sur son panier, rien n'est enregistré, la ligne est signalée et le panier est gardé
- Workflow `E2E` sur les PR qui touchent le back, le front ou `e2e/`, avec les captures et les traces en artefact en cas d'échec ; Dependabot surveille `e2e/`
- Vérifié en local : 3 tests sur 3, quatre lancements de suite, aucun mongod laissé ouvert

15/11/2026 - Sécurité : couvertures des livres autorisées par la CSP (#47)

Fait :
- La CSP de production n'autorisait que les images du même domaine : les couvertures Open Library de la #77 étaient bloquées quand l'API sert le front (image Docker), et chaque livre gardait sa couverture dessinée
- `img-src` autorise `covers.openlibrary.org`, `archive.org` et `*.us.archive.org` (Open Library redirige vers les deux derniers) ; test de la CSP et `docs/api.md` à jour
- Vérifié dans Chrome sur l'API en production avec une base temporaire : 20 images bloquées avant, les couvertures s'affichent après, sans aucune violation de CSP
