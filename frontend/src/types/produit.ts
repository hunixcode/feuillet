export type TypeProduit = 'livre' | 'magazine' | 'papeterie'

export type Disponibilite = 'disponible' | 'epuise'

export interface Promotion {
  remise: number
  debut: string
  fin: string
}

export interface Produit {
  id: string
  reference: string
  designation: string
  type: TypeProduit
  categorie: string
  prix: number
  prixApplique: number
  promotion?: Promotion
  disponibilite: Disponibilite
}

export interface ProduitDetail extends Produit {
  tauxTva: number
  arriveePrevue?: string
  isbn?: string
  auteur?: string
  issn?: string
  numero?: number
  dateParution?: string
  marque?: string
}
