# Contrat d'API

Toutes les routes sont préfixées par `/api` et échangent du JSON. Les types correspondants côté front sont dans `frontend/src/types/`.

## Erreurs

Toute erreur suit le format de `ApiError` (`frontend/src/types/api.ts`) :

```json
{ "code": "VALIDATION", "message": "Certains champs sont invalides.", "details": { "champs": { "email": "L'adresse e-mail n'est pas valide." } } }
```

`details.champs` (facultatif) associe un champ de formulaire à son message, pour afficher les erreurs de saisie sous chaque champ (écran 1).

| Statut | Code | Cas |
|---|---|---|
| 400 | `VALIDATION` | Champ manquant ou invalide (`details.champs`) |
| 400 | `JSON_INVALIDE` | Corps de requête mal formé |
| 401 | `IDENTIFIANTS_INVALIDES` | E-mail ou mot de passe incorrect (même message dans les deux cas) |
| 401 | `NON_AUTHENTIFIE` | Token absent, invalide ou expiré |
| 403 | `ACCES_REFUSE` | Rôle insuffisant pour l'espace demandé |
| 404 | `INTROUVABLE` | Route ou ressource inconnue |
| 409 | `EMAIL_DEJA_UTILISE` | Inscription avec un e-mail existant (`details.champs.email`) |
| 409 | `REFERENCE_DEJA_UTILISEE` | Produit avec une référence existante (`details.champs.reference`) |
| 409 | `PROMOTION_EN_CONFLIT` | Promotion qui chevauche une autre promotion du même produit |
| 409 | `CATEGORIE_DEJA_EXISTANTE` | Catégorie au nom déjà pris (`details.champs.libelle`) |
| 409 | `CATEGORIE_UTILISEE` | Suppression d'une catégorie encore utilisée par un produit |
| 409 | `PRODUIT_AVEC_HISTORIQUE` | Suppression d'un produit qui a des mouvements de stock, des demandes ou des commandes fournisseur (RG05) |
| 409 | `STOCK_INSUFFISANT` | Sortie de stock supérieure à la quantité disponible, ou compte inférieur au mis de côté |
| 409 | `STOCK_MODIFIE` | Le stock a changé pendant l'opération (correction de stock ou vente) |
| 409 | `LIGNE_INDISPONIBLE` | Vente refusée : un article n'est plus disponible dans la quantité demandée (`details.lignes`) |
| 409 | `COMMANDE_DEJA_EXPEDIEE` | Commande déjà expédiée |
| 409 | `PRODUIT_DISPONIBLE` | Demande sur un article qui a du stock vendable : l'ajouter au panier |
| 409 | `DEMANDE_EN_COURS` | Le client a déjà une demande en attente ou mise de côté pour ce produit |
| 409 | `DEMANDE_NON_ANNULABLE` | Annulation d'une demande qui n'est plus en attente |
| 409 | `DEMANDE_NON_RATTACHABLE` | Rattachement d'une demande déjà liée à un produit ou plus en attente |
| 409 | `COMMANDE_DEJA_RECUE` | Réception sur une commande fournisseur déjà entièrement reçue |
| 409 | `QUANTITE_SUPERIEURE_AU_RESTANT` | Réception supérieure à ce qui reste à recevoir (`details.restant`, RG07) |
| 409 | `RECEPTION_DEJA_VALIDEE` | Réception déjà validée : aucun mouvement n'est créé (RG07) |
| 500 | `ERREUR_SERVEUR` | Erreur inattendue |

## État de l'API

### `GET /api/health`

Indique si l'API tourne et si MongoDB répond (ping avec un délai de 2 s). Aucune authentification.

| Statut | Corps |
|---|---|
| `200` | `{ "status": "ok", "baseDeDonnees": "connectee", "uptimeSecondes": 42 }` |
| `503` | `{ "status": "degrade", "baseDeDonnees": "deconnectee", "uptimeSecondes": 42 }` |

`uptimeSecondes` : temps écoulé depuis le démarrage du serveur.

## Authentification (EX09, écran 1)

Les routes protégées attendent l'en-tête `Authorization: Bearer <token>` (déjà envoyé par `frontend/src/services/api.ts` depuis `localStorage.token`). Le token est un JWT HS256 valable 8 heures.

### `POST /api/auth/inscription`

Crée un compte **client** (le rôle envoyé est ignoré ; le compte responsable vient du seed).

| Champ | Règle |
|---|---|
| `nom` | Obligatoire, 100 caractères au plus (espaces de bord retirés) |
| `email` | Obligatoire, format e-mail, unique, enregistré en minuscules |
| `motDePasse` | 8 caractères au moins, 72 octets au plus ; stocké haché (bcrypt) |

Réponse `201` : `AuthResultat`

```json
{
  "utilisateur": { "id": "…", "nom": "Marie", "email": "marie@example.pf", "role": "client" },
  "token": "eyJhbGciOiJIUzI1NiIs…"
}
```

Erreurs : `400 VALIDATION`, `409 EMAIL_DEJA_UTILISE`.

### `POST /api/auth/connexion`

Corps : `{ "email": "…", "motDePasse": "…" }`. Même route pour le client et le responsable ; le front dirige vers l'espace correspondant à `utilisateur.role`.

Réponse `200` : `AuthResultat`. Erreurs : `400 VALIDATION`, `401 IDENTIFIANTS_INVALIDES`.

### `GET /api/auth/moi`

Route protégée : renvoie `{ "utilisateur": Utilisateur }` pour restaurer la session au chargement de l'application. Erreur : `401 NON_AUTHENTIFIE` (token absent, expiré, ou compte supprimé).

## Catégories

`Categorie` : `{ "id": "bd-et-manga", "libelle": "BD et manga" }`. L'`id` est tiré du libellé à la création (minuscules, sans accents, tirets) et ne change plus : renommer une catégorie ne touche ni ses produits ni les adresses `?categorie=`. Deux catégories ne portent pas le même nom, à la casse et aux accents près. Le seed crée la liste de départ.

| Route | Accès | Réponse | Erreurs |
|---|---|---|---|
| `GET /api/categories` | public | `200` : `Categorie[]` triées par libellé | |
| `POST /api/categories` | responsable | `201` : `Categorie` ; corps `{ "libelle": "…" }` | `400 VALIDATION` (vide, sans lettre ni chiffre, plus de 100 caractères), `409 CATEGORIE_DEJA_EXISTANTE` |
| `PUT /api/categories/:id` | responsable | `200` : `Categorie` renommée ; corps `{ "libelle": "…" }` | `400`, `404`, `409 CATEGORIE_DEJA_EXISTANTE` |
| `DELETE /api/categories/:id` | responsable | `204` | `404`, `409 CATEGORIE_UTILISEE` si un produit, même archivé, l'utilise |

## Produits (EX01, écrans 2, 3 et 7)

Lecture publique ; création, modification et suppression réservées au **responsable** (`401 NON_AUTHENTIFIE` sans token, `403 ACCES_REFUSE` pour un client).

`Produit` :

```json
{
  "id": "…",
  "reference": "LIV-001",
  "designation": "L'Île au trésor",
  "type": "livre",
  "categorie": "roman",
  "prix": 1800,
  "tauxTva": 5,
  "archive": false,
  "isbn": "9782070612758",
  "auteur": "Robert Louis Stevenson",
  "prixApplique": 1530,
  "promotion": { "id": "…", "remise": 15, "debut": "2026-10-10", "fin": "2026-10-31" }
}
```

`prixApplique`, `promotion` et `disponibilite` sont calculés, jamais envoyés par le client : `promotion` est la promotion du jour (absente s'il n'y en a pas), `prixApplique` = arrondi(prix × (100 − remise) / 100) (RG11), le jour étant celui de Tahiti ; `disponibilite` vaut `"disponible"` s'il reste au moins un exemplaire vendable, sinon `"epuise"` (RG04).

| Champ | Règle |
|---|---|
| `reference` | Obligatoire, unique, 200 caractères au plus |
| `designation` | Obligatoire, 200 caractères au plus |
| `categorie` | Identifiant d'une catégorie existante (`GET /api/categories`) |
| `type` | `livre`, `magazine` ou `papeterie` |
| `prix` | Prix TTC en XPF, entier ≥ 0 (RG01) |
| `tauxTva` | Entier de 0 à 100 (%) |
| `archive` | Booléen, `false` par défaut |
| `isbn`, `auteur` | Facultatifs, livre seulement |
| `issn`, `numero` (entier ≥ 0), `dateParution` (`AAAA-MM-JJ`) | Facultatifs, magazine seulement |
| `marque` | Facultatif, papeterie seulement |

Les champs d'un autre type sont ignorés.

### `GET /api/produits`

Liste triée par désignation. Paramètres facultatifs : `q` (recherche sans tenir compte de la casse dans la désignation, la référence, l'auteur, l'ISBN, l'ISSN et la marque ; accents exacts), `type`, `categorie` (identifiant), `archive=true` pour lister **seulement** les produits archivés (par défaut : seulement les non archivés).

Réponse `200` : `Produit[]`. Erreur : `400 VALIDATION` si `type` est inconnu (une catégorie sans produit donne une liste vide).

### `GET /api/produits/:id`

Réponse `200` : `Produit`. Erreur : `404 INTROUVABLE`.

### `POST /api/produits`

Corps : `Produit` sans `id`. Réponse `201` : `Produit`. Erreurs : `400 VALIDATION`, `409 REFERENCE_DEJA_UTILISEE`.

### `PUT /api/produits/:id`

Remplace le produit entier (un champ facultatif absent est retiré). Archiver ou réactiver = renvoyer le produit avec `archive` à `true` ou `false`. Un changement de prix ajoute une entrée à l'historique des prix (RG15).

Réponse `200` : `Produit`. Erreurs : `400 VALIDATION`, `404 INTROUVABLE`, `409 REFERENCE_DEJA_UTILISEE`.

### `GET /api/produits/:id/historique-prix`

Responsable seulement (EX11, courbe des prix). Entrées dans l'ordre chronologique : le prix à la création, puis chaque changement de prix. Jamais modifiées.

Réponse `200` : `[{ "date": "2026-10-15T08:00:00.000Z", "prix": 1800 }, …]`. Erreur : `404 INTROUVABLE`.

### Promotions (responsable seulement)

`Promotion` : `{ "id": "…", "remise": 15, "debut": "2026-10-10", "fin": "2026-10-31" }`. Remise entière de 1 à 100 %, du jour de début au jour de fin inclus. Au plus une promotion par produit à une date : les périodes d'un produit ne se chevauchent pas.

| Route | Réponse | Erreurs |
|---|---|---|
| `GET /api/produits/:id/promotions` | `200` : `Promotion[]` triées par début | `404` |
| `POST /api/produits/:id/promotions` | `201` : `Promotion` | `400 VALIDATION` (remise, dates, fin avant début ou déjà passée), `404`, `409 PROMOTION_EN_CONFLIT` |
| `DELETE /api/produits/:id/promotions/:promotionId` | `204` | `404` |

Les promotions sont conservées quand la fiche est modifiée.

### `DELETE /api/produits/:id`

Supprime un produit sans historique (RG05) ; un produit qui a des mouvements de stock s'archive (`PUT` avec `archive: true`).

Réponse `204` sans corps. Erreurs : `404 INTROUVABLE`, `409 PRODUIT_AVEC_HISTORIQUE`.

## Stock (EX02, EX04, écran 8)

Responsable seulement. Un produit jamais compté a un stock vide.

`EtatStock` :

```json
{
  "produitId": "…",
  "quantitePhysique": 12,
  "quantiteMiseDeCote": 2,
  "quantiteDefectueuse": 1,
  "quantiteVendable": 10
}
```

`quantiteVendable` = physique − mis de côté, jamais négatif (RG04) ; le défectueux est compté à part et n'est jamais vendable.

`Mouvement` (journal, jamais modifié) :

```json
{
  "id": "…",
  "produitId": "…",
  "date": "2026-10-22T20:00:00.000Z",
  "type": "ajustement",
  "quantite": -2,
  "motif": "Comptage annuel",
  "operateur": "responsable",
  "quantiteAvant": 12,
  "quantiteApres": 10
}
```

`type` : `entree`, `vente`, `retour`, `remplacement` ou `ajustement` ; `quantite` : variation du stock physique (négative pour une sortie) ; `operateur` : `responsable`, `client` ou `systeme` ; `quantiteAvant` et `quantiteApres` seulement pour un ajustement ; `venteId` seulement pour une vente (une ligne de vente = un mouvement).

| Route | Corps | Réponse | Erreurs |
|---|---|---|---|
| `GET /api/stock` | mêmes filtres que `GET /api/produits` (`q`, `type`, `categorie`, `archive`) | `200` : `EtatStock[]` avec `reference` et `designation` | `400` |
| `GET /api/produits/:id/stock` | | `200` : `EtatStock` | `404` |
| `GET /api/mouvements` | filtres facultatifs `produit` (identifiant) et `type` | `200` : `Mouvement[]`, du plus récent au plus ancien, 500 au plus | `400` |
| `POST /api/produits/:id/stock/inventaire` | `{ "quantiteComptee": 10, "motif": "Comptage annuel" }` | `200` : `EtatStock` ; ajustement avec l'avant et l'après (EX02) | `400`, `404`, `409 STOCK_INSUFFISANT` si le compte est inférieur au mis de côté |
| `POST /api/produits/:id/stock/defectueux` | `{ "quantite": 2, "motif": "Couverture déchirée" }` | `200` : `EtatStock` ; physique → défectueux, ajustement | `400`, `404`, `409 STOCK_INSUFFISANT` au-delà du vendable |
| `POST /api/produits/:id/stock/defectueux/sortie` | `{ "quantite": 2, "motif": "Renvoi fournisseur" }` | `200` : `EtatStock` ; renvoi ou destruction, pas de mouvement (le physique ne change pas) | `400`, `404`, `409 STOCK_INSUFFISANT` au-delà du défectueux |

Une écriture faite pendant qu'une autre modifiait le même stock est refusée (`409 STOCK_MODIFIE`) : recharger et recommencer. Le stock et son mouvement sont enregistrés ensemble dans une transaction MongoDB.

## Paramètres (écran 13)

Responsable seulement. Un seul jeu de paramètres pour la librairie ; le seed crée les valeurs de départ sans écraser celles déjà réglées.

`Parametres` :

```json
{
  "dureeMiseDeCoteJours": 7,
  "delaiRetourJours": 14,
  "delaiRetourCadeauJours": 30,
  "fraisEmballage": 300,
  "fraisLivraison": 800,
  "seuilAlerteDefaut": 20
}
```

Durées en jours (RG06, RG09), frais en XPF (RG13), seuil d'alerte en % de la quantité achetée à l'origine (RG10). Chaque valeur est un entier strictement positif ; le seuil va de 1 à 100.

| Route | Corps | Réponse | Erreurs |
|---|---|---|---|
| `GET /api/parametres` | | `200` : `Parametres` | |
| `PUT /api/parametres` | `Parametres` complet | `200` : `Parametres` enregistrés | `400 VALIDATION` (`details.champs` par valeur) |

## Ventes (EX03, écrans 4 et 9)

Tous les montants sont calculés par le back, en XPF entiers ; le front affiche ce qu'il reçoit et n'envoie jamais de prix.

### Panier envoyé

```json
{
  "lignes": [{ "produitId": "…", "quantite": 2 }],
  "occasionCadeau": "noel",
  "emballageCadeau": true,
  "adresseLivraison": "BP 12, Papeete"
}
```

| Champ | Règle |
|---|---|
| `lignes` | De 1 à 100 lignes ; `produitId` obligatoire, `quantite` entier ≥ 1. Deux lignes du même produit sont regroupées (999 au plus par produit) |
| `occasionCadeau` | Facultatif : `noel`, `anniversaire` ou `fete` ; une vente avec occasion est un cadeau (délai de retour allongé, RG09) |
| `emballageCadeau` | Booléen, `false` par défaut ; ajoute les frais d'emballage des paramètres |
| `adresseLivraison` | 300 caractères au plus. La librairie vend uniquement en ligne : toute commande est livrée, l'adresse est exigée à la confirmation et les frais de livraison sont toujours comptés |

### Calcul

Pour chaque ligne, au jour de Tahiti : `prixUnitaire` = prix appliqué avec la promotion du jour (RG11), `remise` (0 sans promotion), `tauxTva`, `montant` = `prixUnitaire × quantite`, `montantTva` = arrondi(`montant × tauxTva / (100 + tauxTva)`) (TVA incluse). Puis :

- `sousTotal` = somme des montants des lignes ; `montantTva` = somme des TVA des lignes
- `fraisEmballage`, `fraisLivraison` : frais fixes des paramètres, ou 0 ; `frais` = leur somme (RG13, frais hors TVA)
- `total` = `sousTotal + frais`

`Devis` (réponse d'un calcul, rien n'est enregistré ni réservé, RG03) :

```json
{
  "lignes": [
    {
      "produitId": "…",
      "quantite": 2,
      "reference": "LIV-001",
      "designation": "L'Île au trésor",
      "prixUnitaire": 1530,
      "remise": 15,
      "tauxTva": 5,
      "montant": 3060,
      "montantTva": 146
    }
  ],
  "lignesIndisponibles": [{ "produitId": "…", "quantite": 6 }],
  "sousTotal": 3060,
  "fraisEmballage": 300,
  "fraisLivraison": 800,
  "frais": 1100,
  "montantTva": 146,
  "total": 4160
}
```

`lignesIndisponibles` : lignes qui seraient refusées à la confirmation, avec la quantité demandée : produit inconnu ou archivé (absent de `lignes`, non chiffré), ou quantité supérieure au stock vendable (chiffrée dans `lignes`). Le stock exact n'est pas donné au client.

`Vente` : les champs du devis sans `lignesIndisponibles`, avec `id`, `date`, `statut` (`a_preparer` ou `expediee`), les options, `client` (`{ "id", "nom", "email" }`, figé à la vente) et `dateExpedition` quand la commande est expédiée. Les lignes gardent prix, remise, TVA, référence et désignation du jour de la vente (RG02) : elles ne changent pas si le catalogue change.

### Validation (RG03)

Tout ou rien : les disponibilités sont revérifiées à la confirmation sur le stock vendable (RG04). Si une ligne n'est pas disponible, rien n'est enregistré et la réponse est :

```json
{ "code": "LIGNE_INDISPONIBLE", "message": "…", "details": { "lignes": [{ "produitId": "…", "quantite": 6 }] } }
```

Sinon la vente et la sortie de stock de chaque ligne (un mouvement `vente` par ligne, opérateur `client`) sont écrites dans une même transaction ; si le stock a changé entre-temps, rien n'est écrit (`409 STOCK_MODIFIE`, recharger le panier et recommencer). Un produit vendu a des mouvements et n'est donc plus supprimable (RG05). Vendre au client titulaire d'une mise de côté la consomme (voir [Mises de côté](#mises-de-côté)).

### Commandes (client)

| Route | Accès | Réponse | Erreurs |
|---|---|---|---|
| `POST /api/commandes/devis` | public (panier sans compte) ; avec le token d'un client, ses mises de côté comptent comme disponibles (un token invalide est ignoré) | `200` : `Devis` en ligne | `400 VALIDATION` |
| `POST /api/commandes` | client | `201` : `Vente` au statut `a_preparer` | `400` (dont `adresseLivraison`), `409 LIGNE_INDISPONIBLE`, `409 STOCK_MODIFIE` |
| `GET /api/commandes` | client | `200` : ses commandes, de la plus récente à la plus ancienne | |
| `GET /api/commandes/:id` | client | `200` : `Vente` | `404` si la commande n'est pas la sienne |

Le responsable n'a pas accès à ces routes de commande (`403`), sauf au devis public.

### Suivi des commandes (responsable)

| Route | Réponse | Erreurs |
|---|---|---|
| `GET /api/ventes` | `200` : `Vente[]`, de la plus récente à la plus ancienne, 500 au plus ; filtre facultatif `statut` | `400` sur un statut inconnu |
| `GET /api/ventes/:id` | `200` : `Vente` | `404` |
| `POST /api/ventes/:id/expedition` | `200` : `Vente` passée de `a_preparer` à `expediee` (confiée au transporteur) | `404`, `409 COMMANDE_DEJA_EXPEDIEE` |

## Demandes et notifications (EX05, écrans 3, 5 et 10)

Une demande n'est pas une vente (RG06). Elle vise soit un produit **épuisé** du catalogue (`produitId`), soit un livre **absent du catalogue** (`titre`, `auteur` et `isbn` facultatifs).

`Demande` (type `Demande` de `frontend/src/types/demande.ts`) :

```json
{
  "id": "…",
  "client": { "id": "…", "nom": "Marie", "email": "marie@example.pf" },
  "produitId": "…",
  "titre": "L'Île au trésor",
  "auteur": "R. L. Stevenson",
  "isbn": "978-2-07-061234-5",
  "quantiteSouhaitee": 2,
  "date": "2026-11-08T20:00:00.000Z",
  "statut": "mise_de_cote",
  "miseDeCote": { "quantite": 2, "dateLimite": "2026-11-16T09:59:59.999Z" }
}
```

- `titre` est toujours rempli : la désignation du produit, ou le titre saisi pour un livre hors catalogue. `produitId` est absent tant qu'une demande hors catalogue n'est pas rattachée.
- `statut` : `en_attente` → `mise_de_cote` → `honoree` ; `mise_de_cote` → `expiree` ; `en_attente` → `annulee` (par le client). `dateFin` donne la date du passage à `honoree`, `expiree` ou `annulee`.
- `miseDeCote` (statut `mise_de_cote`) : quantité réservée, éventuellement inférieure à la quantité souhaitée, et date limite pour la commander : fin du jour (heure de Tahiti) situé `dureeMiseDeCoteJours` jours après l'arrivée (7 par défaut, écran 13).

| Route | Accès | Réponse | Erreurs |
|---|---|---|---|
| `POST /api/demandes` | client | `201` : `Demande` en attente | `400 VALIDATION`, `404` produit inconnu ou archivé, `409 PRODUIT_DISPONIBLE`, `409 DEMANDE_EN_COURS` |
| `GET /api/demandes` | client, responsable | `200` : le client reçoit ses demandes, le responsable toutes (filtre facultatif `statut`), de la plus récente à la plus ancienne, 500 au plus | `400` sur un statut inconnu |
| `POST /api/demandes/:id/annulation` | client | `200` : `Demande` passée à `annulee` | `404` si ce n'est pas la sienne, `409 DEMANDE_NON_ANNULABLE` si elle n'est plus en attente |
| `POST /api/demandes/:id/rattachement` | responsable | `200` : `Demande` hors catalogue rattachée au produit `{ "produitId": "…" }` créé pour elle (RG06) | `400` produit absent ou archivé, `404`, `409 DEMANDE_NON_RATTACHABLE` |

Corps de `POST /api/demandes` : `{ "produitId": "…", "quantiteSouhaitee": 2 }` ou `{ "titre": "…", "auteur": "…", "isbn": "…", "quantiteSouhaitee": 1 }`.

| Champ | Règle |
|---|---|
| `quantiteSouhaitee` | Entier de 1 à 99 |
| `produitId` | Produit du catalogue non archivé, sans stock vendable (sinon `409 PRODUIT_DISPONIBLE`) ; une seule demande en cours (en attente ou mise de côté) par client et par produit (`409 DEMANDE_EN_COURS`). `titre`, `auteur` et `isbn` viennent alors de la fiche produit |
| `titre` | Obligatoire sans `produitId`, 200 caractères au plus |
| `auteur` | Facultatif, 100 caractères au plus |
| `isbn` | Facultatif : 10 ou 13 chiffres, tirets et espaces acceptés |

### Mises de côté

- **Création** : à la validation d'une réception de commande fournisseur (voir [Réceptions](#réceptions-rg07-décision-20-diagramme-de-séquence)), les demandes en attente sont mises de côté par ordre d'arrivée tant qu'il reste du stock vendable, et chaque client est prévenu par une notification. `Stock.quantiteMiseDeCote` reste égal à la somme des mises de côté du produit.
- **Expiration** (décision 18) : après la date limite, la quantité est libérée et la demande passe à `expiree`, sans retour en attente. Le serveur vérifie les échéances chaque minute et avant chaque liste de demandes.
- **Commande du titulaire** : la mise de côté du client compte comme disponible pour lui (devis compris). Sa commande consomme sa mise de côté : ses demandes sur ce produit passent à `honoree` dans la même transaction, et ce qui restait mis de côté pour lui est libéré s'il en achète moins. Les autres clients et les visiteurs ne peuvent pas acheter les exemplaires mis de côté (RG04).
- Un produit qui a des demandes n'est plus supprimable (RG05).

### Notifications

`Notification` : `{ "id", "clientId", "produitId", "type": "reapprovisionnement", "date", "message", "lue" }`. Un client n'est prévenu qu'une fois par produit et par type (index unique). Exemple de `message` : « L'Île au trésor » est arrivé : 2 exemplaires mis de côté pour vous jusqu'au 15/11/2026.

| Route | Accès | Réponse | Erreurs |
|---|---|---|---|
| `GET /api/notifications` | client | `200` : ses notifications, de la plus récente à la plus ancienne | |
| `POST /api/notifications/:id/lue` | client | `200` : `Notification` avec `lue: true` | `404` si ce n'est pas la sienne |

## Réapprovisionnement (EX06, écrans 6, 11 et 12)

Routes réservées au responsable (`401` sans token, `403` pour un client).

### Fournisseurs

`Fournisseur` : `{ "id", "nom", "contact" }` (`contact` facultatif : e-mail, téléphone…).

| Route | Réponse | Erreurs |
|---|---|---|
| `GET /api/fournisseurs` | `200` : `Fournisseur[]` par nom | |
| `POST /api/fournisseurs` | `201` : `Fournisseur` | `400` (`nom` obligatoire, 100 caractères au plus ; `contact` 200 au plus) |
| `PUT /api/fournisseurs/:id` | `200` : `Fournisseur` | `400`, `404` |

### Commandes fournisseur

Une commande = un fournisseur et un produit (décision 19). `CommandeFournisseur` :

```json
{
  "id": "…",
  "fournisseur": { "id": "…", "nom": "Hachette Pacifique" },
  "produitId": "…",
  "reference": "LIV-001",
  "designation": "L'Île au trésor",
  "quantiteCommandee": 10,
  "quantiteRecue": 4,
  "date": "2026-11-08T20:00:00.000Z",
  "dateArriveePrevue": "2026-11-20",
  "statut": "partiellement_recue"
}
```

`statut` : `en_cours` → `partiellement_recue` → `recue` ; `dateReceptionComplete` apparaît quand tout est reçu. Restant à recevoir = `quantiteCommandee − quantiteRecue`.

| Route | Réponse | Erreurs |
|---|---|---|
| `GET /api/commandes-fournisseur` | `200` : de la plus récente à la plus ancienne, 500 au plus ; filtres facultatifs `statut`, `produitId`, `fournisseurId` | `400` sur un statut inconnu |
| `POST /api/commandes-fournisseur` | `201` : commande `en_cours` ; corps `{ "fournisseurId", "produitId", "quantiteCommandee", "dateArriveePrevue" }` | `400` (fournisseur inconnu, produit inconnu ou archivé, quantité entière de 1 à 9999, date AAAA-MM-JJ valide et pas passée) |
| `GET /api/commandes-fournisseur/:id` | `200` : `CommandeFournisseur` | `404` |
| `GET /api/commandes-fournisseur/:id/receptions` | `200` : `Reception[]`, de la plus récente à la plus ancienne | `404` |

**EX04** : un produit épuisé qui a une commande en cours montre `arriveePrevue` (AAAA-MM-JJ, la date la plus proche) dans `GET /api/produits` et `GET /api/produits/:id`. Un produit qui a une commande fournisseur n'est plus supprimable (RG05).

### Réceptions (RG07, décision 20, diagramme de séquence)

Une réception est **saisie**, puis **validée** : seule la validation fait entrer le stock.

`Reception` : `{ "id", "commandeId", "produitId", "date", "quantiteRecue", "quantiteAbimee", "validee", "dateValidation" }`.

| Route | Réponse | Erreurs |
|---|---|---|
| `POST /api/commandes-fournisseur/:id/receptions` | `201` : `Reception` non validée ; corps `{ "quantiteRecue": 4, "quantiteAbimee": 1 }` (`quantiteAbimee` facultatif, 0 par défaut) | `400` (entiers positifs ou nuls, au moins un article), `404`, `409 COMMANDE_DEJA_RECUE`, `409 QUANTITE_SUPERIEURE_AU_RESTANT` (`details.restant`) |
| `POST /api/receptions/:id/validation` | `200` : `{ "reception", "commande" }` à jour | `404`, `409 RECEPTION_DEJA_VALIDEE`, `409 QUANTITE_SUPERIEURE_AU_RESTANT`, `409 STOCK_MODIFIE` |

- Les articles abîmés à la livraison ne sont **pas comptés comme reçus** : ils restent à recevoir et n'entrent pas en stock (décision 20).
- La quantité reçue ne dépasse jamais le restant, vérifié à la saisie et de nouveau à la validation (deux réceptions saisies en parallèle ne peuvent pas dépasser la commande).
- La validation écrit dans **une transaction** : réception validée, commande mise à jour, mouvement `entree` (opérateur `responsable`, avec `receptionId`), puis mises de côté des demandes en attente du produit et notifications (voir [Mises de côté](#mises-de-côté)). Une réception validée deux fois ne crée pas de second mouvement (`409 RECEPTION_DEJA_VALIDEE`) ; si la commande ou le stock a changé pendant la validation, rien n'est écrit (`409 STOCK_MODIFIE`).

### Produits à recommander (RG10)

`GET /api/reapprovisionnement` : produits non archivés dont le stock vendable est ≤ seuil d'alerte (%) × quantité achetée à l'origine, du pourcentage vendu le plus haut au plus bas.

```json
[{
  "produitId": "…", "reference": "LIV-001", "designation": "L'Île au trésor",
  "quantiteVendable": 2, "quantiteAcheteeOrigine": 10, "seuilAlerte": 20,
  "pourcentageVendu": 80, "quantiteEnCommande": 6
}]
```

- `quantiteAcheteeOrigine` : total reçu de la dernière commande fournisseur entièrement reçue ; à défaut, le stock initial (quantité après le premier mouvement du produit). Un produit sans quantité achetée connue (ou nulle) n'est pas évalué.
- `pourcentageVendu` : part de la quantité achetée à l'origine qui n'est plus vendable, arrondie.
- `quantiteEnCommande` : restant à recevoir des commandes en cours, pour ne pas commander deux fois.
- `seuilAlerte` : celui du produit, sinon `seuilAlerteDefaut` des paramètres (20 % au départ).

`PUT /api/produits/:id/seuil-alerte` : corps `{ "seuilAlerte": 30 }` (entier de 0 à 100) ou `{ "seuilAlerte": null }` pour revenir au seuil par défaut. Réponse `200` : `{ "seuilAlerte": 30, "parDefaut": false }`. Erreurs : `400`, `404`.
