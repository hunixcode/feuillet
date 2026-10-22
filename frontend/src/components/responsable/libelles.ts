import type { Produit, TypeProduit } from '../../types/produit'

export const LIBELLES_TYPE: Record<TypeProduit, string> = {
  livre: 'Livre',
  magazine: 'Magazine',
  papeterie: 'Papeterie',
}

export function libelleDisponibilite(produit: Produit): string {
  if (produit.quantiteVendable !== undefined) {
    if (produit.quantiteVendable === 0) {
      return 'Épuisé'
    }
    return `${produit.quantiteVendable} vendable${produit.quantiteVendable > 1 ? 's' : ''}`
  }
  if (produit.disponibilite) {
    return produit.disponibilite === 'disponible' ? 'Disponible' : 'Épuisé'
  }
  return 'Non renseigné'
}
