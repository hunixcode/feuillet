import type { EtatRetours, NouveauRetour, Retour } from '../types/retour'
import type { StatutVente, Vente } from '../types/vente'
import { get, post } from './api'

function chemin(id: string): string {
  return `/ventes/${encodeURIComponent(id)}`
}

export function listerVentes(statut: StatutVente | '' = ''): Promise<Vente[]> {
  return get<Vente[]>(statut ? `/ventes?statut=${statut}` : '/ventes')
}

export function obtenirVente(id: string): Promise<Vente> {
  return get<Vente>(chemin(id))
}

export function expedierVente(id: string): Promise<Vente> {
  return post<Vente>(`${chemin(id)}/expedition`, {})
}

export function lireRetours(id: string): Promise<EtatRetours> {
  return get<EtatRetours>(`${chemin(id)}/retours`)
}

export function enregistrerRetour(id: string, retour: NouveauRetour): Promise<Retour> {
  return post<Retour>(`${chemin(id)}/retours`, retour)
}
