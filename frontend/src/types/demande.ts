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
  dateFin?: string
}

export interface DemandePayload {
  produitId?: string
  titre?: string
  auteur?: string
  isbn?: string
  quantiteSouhaitee: number
}

export interface NotificationClient {
  id: string
  clientId: string
  produitId: string
  type: 'reapprovisionnement'
  date: string
  message: string
  lue: boolean
}
