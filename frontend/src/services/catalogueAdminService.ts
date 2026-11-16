import type { Categorie } from '../types/categorie'
import type { EntreePrix, FicheProduit, Produit, Promotion, TypeProduit } from '../types/produit'
import { deleteRequest, get, post, put } from './api'

export interface FiltresCatalogue {
  q?: string
  type?: TypeProduit | ''
  categorie?: string
  archive?: boolean
}

export interface NouvellePromotion {
  remise: number
  debut: string
  fin: string
}

export function cheminAvecFiltres(chemin: string, filtres: FiltresCatalogue): string {
  const parametres = new URLSearchParams()
  if (filtres.q?.trim()) {
    parametres.set('q', filtres.q.trim())
  }
  if (filtres.type) {
    parametres.set('type', filtres.type)
  }
  if (filtres.categorie) {
    parametres.set('categorie', filtres.categorie)
  }
  if (filtres.archive) {
    parametres.set('archive', 'true')
  }
  const requete = parametres.toString()
  return requete ? `${chemin}?${requete}` : chemin
}

export function listerProduits(filtres: FiltresCatalogue = {}): Promise<Produit[]> {
  return get<Produit[]>(cheminAvecFiltres('/produits', filtres))
}

export function creerProduit(fiche: FicheProduit): Promise<Produit> {
  return post<Produit>('/produits', fiche)
}

export function modifierProduit(id: string, fiche: FicheProduit): Promise<Produit> {
  return put<Produit>(`/produits/${encodeURIComponent(id)}`, fiche)
}

export function ficheDuProduit(produit: Produit): FicheProduit {
  const {
    id: _id,
    prixApplique: _prixApplique,
    promotion: _promotion,
    disponibilite: _disponibilite,
    ...fiche
  } = produit
  return fiche
}

export function changerArchivage(produit: Produit, archive: boolean): Promise<Produit> {
  return modifierProduit(produit.id, { ...ficheDuProduit(produit), archive })
}

export function obtenirProduit(id: string): Promise<Produit> {
  return get<Produit>(`/produits/${encodeURIComponent(id)}`)
}

export function supprimerProduit(id: string): Promise<void> {
  return deleteRequest<void>(`/produits/${encodeURIComponent(id)}`)
}

export function historiquePrix(id: string): Promise<EntreePrix[]> {
  return get<EntreePrix[]>(`/produits/${encodeURIComponent(id)}/historique-prix`)
}

export function listerPromotions(id: string): Promise<Promotion[]> {
  return get<Promotion[]>(`/produits/${encodeURIComponent(id)}/promotions`)
}

export function ajouterPromotion(
  id: string,
  promotion: NouvellePromotion,
): Promise<Promotion> {
  return post<Promotion>(`/produits/${encodeURIComponent(id)}/promotions`, promotion)
}

export function supprimerPromotion(id: string, promotionId: string): Promise<void> {
  return deleteRequest<void>(
    `/produits/${encodeURIComponent(id)}/promotions/${encodeURIComponent(promotionId)}`,
  )
}

export function creerCategorie(libelle: string): Promise<Categorie> {
  return post<Categorie>('/categories', { libelle })
}

export function renommerCategorie(id: string, libelle: string): Promise<Categorie> {
  return put<Categorie>(`/categories/${encodeURIComponent(id)}`, { libelle })
}

export function supprimerCategorie(id: string): Promise<void> {
  return deleteRequest<void>(`/categories/${encodeURIComponent(id)}`)
}
