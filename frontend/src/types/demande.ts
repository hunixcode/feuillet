export type StatutDemande =
  | 'en_attente'
  | 'mise_de_cote'
  | 'honoree'
  | 'expiree'
  | 'annulee'

export interface ClientDemande {
  id: string
  nom: string
  email: string
}

export interface Demande {
  id: string
  client?: ClientDemande
  produitId?: string
  titre: string
  auteur?: string
  isbn?: string
  quantiteSouhaitee: number
  date: string
  statut: StatutDemande
  miseDeCote?: {
    quantite: number
    dateLimite: string
  }
}

export interface DemandePayload {
  produitId?: string
  titre?: string
  auteur?: string
  isbn?: string
  quantiteSouhaitee: number
}
