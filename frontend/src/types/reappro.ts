export interface Fournisseur {
  id: string
  nom: string
  contact?: string
}

export type StatutCommandeFournisseur = 'en_cours' | 'partiellement_recue' | 'recue'

export interface CommandeFournisseur {
  id: string
  fournisseur: Pick<Fournisseur, 'id' | 'nom'>
  produitId: string
  reference: string
  designation: string
  quantiteCommandee: number
  quantiteRecue: number
  date: string
  dateArriveePrevue: string
  statut: StatutCommandeFournisseur
  dateReceptionComplete?: string
}

export interface ProduitAReapprovisionner {
  produitId: string
  reference: string
  designation: string
  quantiteVendable: number
  quantiteAcheteeOrigine: number
  seuilAlerte: number
  pourcentageVendu: number
  quantiteEnCommande: number
}
