import type { LigneCommande } from './vente'

export type IssueRetour = 'remboursement' | 'echange' | 'remplacement'

export interface LigneRetournable {
  produitId: string
  reference: string
  designation: string
  quantite: number
  prixUnitaire: number
  quantiteRetournee: number
  quantiteRetournable: number
}

export interface Retour {
  id: string
  venteId: string
  produitId: string
  reference: string
  designation: string
  quantite: number
  date: string
  issue: IssueRetour
  revendable: boolean
  valeur: number
  montantRembourse: number
  complementPaye: number
  venteEchangeId?: string
  remplacementImpossible?: boolean
}

export interface EtatRetours {
  venteId: string
  dateLimiteRetour: string
  retourPossible: boolean
  lignes: LigneRetournable[]
  retours: Retour[]
}

export interface NouveauRetour {
  produitId: string
  quantite: number
  issue: IssueRetour
  revendable?: boolean
  echange?: { lignes: LigneCommande[] }
}
