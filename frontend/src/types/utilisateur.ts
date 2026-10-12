// Contrat d'API proposé, à valider avec le backend.
export interface Utilisateur {
  id: string
  nom: string
  email: string
}

export interface AuthResultat {
  utilisateur: Utilisateur
  token: string
}
