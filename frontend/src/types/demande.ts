export type StatutDemande =
  | 'en_attente'
  | 'mise_de_cote'
  | 'honoree'
  | 'expiree'
  | 'annulee'

export interface Demande {
  id: string
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
