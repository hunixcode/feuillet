import type { Produit } from '../types/produit'
import { get } from './api'

export interface FiltresProduits {
  q?: string
  type?: string
  categorie?: string
}

export function listerProduits(filtres: FiltresProduits = {}): Promise<Produit[]> {
  const parametres = new URLSearchParams()
  const recherche = filtres.q?.trim()
  if (recherche) {
    parametres.set('q', recherche)
  }
  if (filtres.type) {
    parametres.set('type', filtres.type)
  }
  if (filtres.categorie) {
    parametres.set('categorie', filtres.categorie)
  }

  const texte = parametres.toString()
  return get<Produit[]>(texte ? `/produits?${texte}` : '/produits')
}

export function obtenirProduit(id: string): Promise<Produit> {
  return get<Produit>(`/produits/${encodeURIComponent(id)}`)
}
