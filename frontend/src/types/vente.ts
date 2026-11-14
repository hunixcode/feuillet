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
  reference: string
  designation: string
  prixUnitaire: number
  remise: number
  tauxTva: number
  montant: number
  montantTva: number
}

export interface Montants {
  sousTotal: number
  fraisEmballage: number
  fraisLivraison: number
  frais: number
  montantTva: number
  total: number
}

export interface Devis extends Montants {
  lignes: LigneVente[]
  lignesIndisponibles: LigneCommande[]
}

export type StatutVente = 'a_preparer' | 'expediee'

export interface ClientVente {
  id: string
  nom: string
  email: string
}

export interface Vente extends OptionsVente, Montants {
  id: string
  date: string
  statut: StatutVente
  client: ClientVente
  lignes: LigneVente[]
  dateExpedition?: string
}

export interface LigneIndisponibleError extends ApiError {
  code: 'LIGNE_INDISPONIBLE'
  details: {
    lignes: LigneCommande[]
  }
}
