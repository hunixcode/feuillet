export type Role = 'client' | 'responsable'

export interface Utilisateur {
  id: string
  nom: string
  email: string
  role: Role
}

export interface AuthResultat {
  utilisateur: Utilisateur
  token: string
}
