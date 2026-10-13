import type { ApiError } from './api'

export interface LigneCommande {
  produitId: string
  quantite: number
}

export type OccasionCadeau = 'noel' | 'anniversaire' | 'fete'

export interface OptionsVente {
  occasionCadeau?: OccasionCadeau
  emballageCadeau?: boolean
  adresseLivraison?: string
}

export interface CommandePayload extends OptionsVente {
  lignes: LigneCommande[]
}

export interface LigneVente extends LigneCommande {
  designation: string
  prixUnitaire: number
  remise: number
  tauxTva: number
}

export type CanalVente = 'en_ligne' | 'comptoir'

export type StatutVente = 'a_preparer' | 'remise'

export interface Vente extends OptionsVente {
  id: string
  date: string
  canal: CanalVente
  statut: StatutVente
  lignes: LigneVente[]
  frais: number
  total: number
}

export interface LigneIndisponibleError extends ApiError {
  code: 'LIGNE_INDISPONIBLE'
  details: {
    lignes: LigneCommande[]
  }
}
