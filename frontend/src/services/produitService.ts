import type { Produit, ProduitDetail } from '../types/produit'
import { ApiRequestError, get } from './api'

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

export function obtenirProduit(id: string): Promise<ProduitDetail> {
  return get<ProduitDetail>(`/produits/${encodeURIComponent(id)}`)
}

export async function obtenirProduits(ids: string[]): Promise<Record<string, Produit | null>> {
  const paires = await Promise.all(
    ids.map(async (id) => {
      try {
        return [id, await obtenirProduit(id)] as const
      } catch (raison) {
        if (raison instanceof ApiRequestError && raison.code === 'INTROUVABLE') {
          return [id, null] as const
        }
        throw raison
      }
    }),
  )
  return Object.fromEntries(paires)
}
