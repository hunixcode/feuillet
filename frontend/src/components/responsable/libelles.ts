import type { Produit, TypeProduit } from '../../types/produit'
import type { CommandeFournisseur, StatutCommandeFournisseur } from '../../types/reappro'
import type { IssueRetour } from '../../types/retour'
import type { EtatStock, Mouvement, Operateur, TypeMouvement } from '../../types/stock'
import type { OccasionCadeau, StatutVente } from '../../types/vente'

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

export const LIBELLES_STATUT_COMMANDE: Record<StatutCommandeFournisseur, string> = {
  en_cours: 'En cours',
  partiellement_recue: 'Partiellement reçue',
  recue: 'Reçue',
}

export function restantARecevoir(commande: CommandeFournisseur): number {
  return commande.quantiteCommandee - commande.quantiteRecue
}

export function enRetard(commande: CommandeFournisseur, aujourdhui: string): boolean {
  return commande.statut !== 'recue' && commande.dateArriveePrevue < aujourdhui
}

export const LIBELLES_STATUT_VENTE: Record<StatutVente, string> = {
  a_preparer: 'À préparer',
  expediee: 'Expédiée',
}

export const LIBELLES_OCCASION: Record<OccasionCadeau, string> = {
  noel: 'Noël',
  anniversaire: 'Anniversaire',
  fete: 'Fête',
}

export const LIBELLES_ISSUE: Record<IssueRetour, string> = {
  remboursement: 'Remboursement',
  echange: 'Échange',
  remplacement: 'Remplacement',
}
