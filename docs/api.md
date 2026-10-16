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
| 404 | `INTROUVABLE` | Route inconnue |
| 409 | `EMAIL_DEJA_UTILISE` | Inscription avec un e-mail existant (`details.champs.email`) |
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
| `typeClient` | `jeunesse`, `etudiant`, `adulte` ou `professionnel` |

Réponse `201` : `AuthResultat`

```json
{
  "utilisateur": { "id": "…", "nom": "Marie", "email": "marie@example.pf", "role": "client", "typeClient": "etudiant" },
  "token": "eyJhbGciOiJIUzI1NiIs…"
}
```

Erreurs : `400 VALIDATION`, `409 EMAIL_DEJA_UTILISE`.

### `POST /api/auth/connexion`

Corps : `{ "email": "…", "motDePasse": "…" }`. Même route pour le client et le responsable ; le front dirige vers l'espace correspondant à `utilisateur.role`.

Réponse `200` : `AuthResultat` (sans `typeClient` pour le responsable). Erreurs : `400 VALIDATION`, `401 IDENTIFIANTS_INVALIDES`.

### `GET /api/auth/moi`

Route protégée : renvoie `{ "utilisateur": Utilisateur }` pour restaurer la session au chargement de l'application. Erreur : `401 NON_AUTHENTIFIE` (token absent, expiré, ou compte supprimé).
