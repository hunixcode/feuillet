import type { CommandePayload, Devis, LigneCommande, Vente } from '../types/vente'
import { ApiRequestError, get, post } from './api'

export function calculerDevis(panier: CommandePayload): Promise<Devis> {
  return post<Devis>('/commandes/devis', panier)
}

export function passerCommande(panier: CommandePayload): Promise<Vente> {
  return post<Vente>('/commandes', panier)
}

export function listerCommandes(): Promise<Vente[]> {
  return get<Vente[]>('/commandes')
}

export function obtenirCommande(id: string): Promise<Vente> {
  return get<Vente>(`/commandes/${encodeURIComponent(id)}`)
}

export function lignesRefusees(erreur: unknown): LigneCommande[] {
  if (!(erreur instanceof ApiRequestError) || erreur.code !== 'LIGNE_INDISPONIBLE') {
    return []
  }
  const details = erreur.details
  if (typeof details !== 'object' || details === null || !('lignes' in details)) {
    return []
  }
  const lignes = details.lignes
  if (!Array.isArray(lignes)) {
    return []
  }
  return lignes.filter(
    (ligne): ligne is LigneCommande =>
      typeof ligne === 'object' &&
      ligne !== null &&
      typeof ligne.produitId === 'string' &&
      typeof ligne.quantite === 'number',
  )
}
