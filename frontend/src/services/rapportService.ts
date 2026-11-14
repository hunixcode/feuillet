import type { Rapport } from '../types/rapport'
import { get, telecharger, type Fichier } from './api'

export interface FiltresRapport {
  semaine?: string
  debut?: string
  fin?: string
  categorie?: string
}

function parametres(filtres: FiltresRapport): string {
  const recherche = new URLSearchParams()
  for (const [cle, valeur] of Object.entries(filtres)) {
    if (valeur) {
      recherche.set(cle, valeur)
    }
  }
  const texte = recherche.toString()
  return texte ? `?${texte}` : ''
}

export function lireRapport(filtres: FiltresRapport = {}): Promise<Rapport> {
  return get<Rapport>(`/rapports${parametres(filtres)}`)
}

export function exporterRapport(filtres: FiltresRapport = {}): Promise<Fichier> {
  return telecharger(`/rapports/export.csv${parametres(filtres)}`, 'rapport.csv')
}
