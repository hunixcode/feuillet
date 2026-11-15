export interface PeriodeRapport {
  debut: string
  fin: string
}

export interface TotauxRapport {
  ventesBrutes: number
  retours: number
  net: number
  quantiteVendue: number
  quantiteRetournee: number
  quantiteNette: number
}

export interface StatistiquesRapport {
  nombreVentes: number
  panierMoyen: number
  nombreRetours: number
}

export interface LigneRapport {
  produitId: string
  reference: string
  designation: string
  categorie: string
  quantiteVendue: number
  montantVentes: number
  quantiteRetournee: number
  montantRetours: number
  quantiteNette: number
  montantNet: number
  quantiteRemplacee: number
  stockRestant: number
  pourcentageVendu: number | null
}

export interface Rapport {
  periode: PeriodeRapport
  totaux: TotauxRapport
  statistiques: StatistiquesRapport
  produits: LigneRapport[]
}
