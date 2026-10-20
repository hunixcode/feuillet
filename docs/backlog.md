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
