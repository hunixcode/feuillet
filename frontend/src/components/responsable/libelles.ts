import type { Produit, TypeProduit } from '../../types/produit'
import type { EtatStock, Mouvement, Operateur, TypeMouvement } from '../../types/stock'

export const LIBELLES_TYPE: Record<TypeProduit, string> = {
  livre: 'Livre',
  magazine: 'Magazine',
  papeterie: 'Papeterie',
}

export const LIBELLES_MOUVEMENT: Record<TypeMouvement, string> = {
  entree: 'Entrée',
  vente: 'Vente',
  retour: 'Retour',
  remplacement: 'Remplacement',
  ajustement: 'Ajustement',
}

export const LIBELLES_OPERATEUR: Record<Operateur, string> = {
  responsable: 'Responsable',
  client: 'Client',
  systeme: 'Système',
}

export function libelleEtatStock(etat: EtatStock): string {
  return etat.quantiteVendable === 0 ? 'Épuisé' : 'Disponible'
}

export function libelleQuantiteMouvement(mouvement: Mouvement): string {
  if (mouvement.quantiteAvant !== undefined && mouvement.quantiteApres !== undefined) {
    return `${mouvement.quantiteAvant} → ${mouvement.quantiteApres}`
  }
  if (mouvement.quantite > 0) {
    return `+${mouvement.quantite}`
  }
  if (mouvement.quantite < 0) {
    return `−${Math.abs(mouvement.quantite)}`
  }
  return '0'
}

export function libelleDisponibilite(produit: Produit): string {
  if (produit.disponibilite) {
    return produit.disponibilite === 'disponible' ? 'Disponible' : 'Épuisé'
  }
  return 'Non renseigné'
}
