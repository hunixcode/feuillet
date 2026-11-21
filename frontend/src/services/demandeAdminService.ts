import type { Demande, StatutDemande } from '../types/demande'
import { get, post } from './api'

export function listerDemandes(statut: StatutDemande | '' = ''): Promise<Demande[]> {
  return get<Demande[]>(statut ? `/demandes?statut=${statut}` : '/demandes')
}

export function rattacherDemande(id: string, produitId: string): Promise<Demande> {
  return post<Demande>(`/demandes/${id}/rattachement`, { produitId })
}
