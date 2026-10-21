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

### `GET /api/categories`

Liste fixe, publique : `[{ "id": "roman", "libelle": "Roman" }, …]`.

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
  "auteur": "Robert Louis Stevenson"
}
```

| Champ | Règle |
|---|---|
| `reference` | Obligatoire, unique, 200 caractères au plus |
| `designation` | Obligatoire, 200 caractères au plus |
| `categorie` | Identifiant d'une catégorie de `GET /api/categories` |
| `type` | `livre`, `magazine` ou `papeterie` |
| `prix` | Prix TTC en XPF, entier ≥ 0 (RG01) |
| `tauxTva` | Entier de 0 à 100 (%) |
| `archive` | Booléen, `false` par défaut |
| `isbn`, `auteur` | Facultatifs, livre seulement |
| `issn`, `numero` (entier ≥ 0), `dateParution` (`AAAA-MM-JJ`) | Facultatifs, magazine seulement |
| `marque` | Facultatif, papeterie seulement |

Les champs d'un autre type sont ignorés.

### `GET /api/produits`

Liste triée par désignation. Paramètres facultatifs : `type`, `categorie` (identifiant), `archive=true` pour lister **seulement** les produits archivés (par défaut : seulement les non archivés).

Réponse `200` : `Produit[]`. Erreur : `400 VALIDATION` si `type` ou `categorie` est inconnu.

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

### `DELETE /api/produits/:id`

Réponse `204` sans corps. Erreur : `404 INTROUVABLE`.

Pas encore implémenté : suppression limitée aux produits sans historique (RG05), promotions, prix appliqué et disponibilité (attendus par les types du front), recherche texte.
