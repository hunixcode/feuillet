export type TypeProduit = 'livre' | 'magazine' | 'papeterie'

export type Disponibilite = 'disponible' | 'epuise'

export interface Promotion {
  id: string
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
  tauxTva: number
  archive: boolean
  prixApplique: number
  promotion?: Promotion
  isbn?: string
  auteur?: string
  issn?: string
  numero?: number
  dateParution?: string
  marque?: string
  disponibilite?: Disponibilite
}

export interface ProduitDetail extends Produit {
  arriveePrevue?: string
}

export type FicheProduit = Omit<Produit, 'id' | 'prixApplique' | 'promotion' | 'disponibilite'>

export interface EntreePrix {
  date: string
  prix: number
}
