import type { Rapport } from '../types/rapport'
import { get } from './api'

export interface FiltresRapport {
  semaine?: string
  debut?: string
  fin?: string
  categorie?: string
}

export function lireRapport(filtres: FiltresRapport = {}): Promise<Rapport> {
  const parametres = new URLSearchParams()
  for (const [cle, valeur] of Object.entries(filtres)) {
    if (valeur) {
      parametres.set(cle, valeur)
    }
  }
  const requete = parametres.toString()
  return get<Rapport>(requete ? `/rapports?${requete}` : '/rapports')
}
