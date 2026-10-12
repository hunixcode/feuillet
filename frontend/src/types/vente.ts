// Contrat d'API proposé, à valider avec le backend.
import type { ApiError } from './api'

export interface LigneCommande {
  produitId: string
  quantite: number
}

export interface CommandePayload {
  lignes: LigneCommande[]
  emballageCadeau?: boolean
  livraison?: boolean
}

export interface Vente {
  id: string
  lignes: LigneCommande[]
  date: string
}

export interface VenteResultat {
  vente: Vente
  total: number
}

export interface LigneIndisponibleError extends ApiError {
  code: 'LIGNE_INDISPONIBLE'
  details: {
    lignes: LigneCommande[]
  }
}
