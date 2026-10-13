export type Role = 'client' | 'responsable'

export type TypeClient = 'jeunesse' | 'etudiant' | 'adulte' | 'professionnel'

export interface Utilisateur {
  id: string
  nom: string
  email: string
  role: Role
  typeClient?: TypeClient
}

export interface AuthResultat {
  utilisateur: Utilisateur
  token: string
}
