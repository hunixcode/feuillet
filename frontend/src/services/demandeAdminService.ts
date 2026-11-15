import type { Demande, StatutDemande } from '../types/demande'
import { get } from './api'

export function listerDemandes(statut: StatutDemande | '' = ''): Promise<Demande[]> {
  return get<Demande[]>(statut ? `/demandes?statut=${statut}` : '/demandes')
}
