// Contrat d'API proposé, à valider avec le backend.
export interface Produit {
  id: string
  reference: string
  nom: string
  categorie: string
  prix: number
  promotion?: number
  disponible: boolean
}

export interface ProduitDetail extends Produit {
  description: string
  tva: number
  quantiteVendable?: number
}
