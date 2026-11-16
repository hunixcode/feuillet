import type { Parametres } from '../types/parametres'
import { get, put } from './api'

export function lireParametres(): Promise<Parametres> {
  return get<Parametres>('/parametres')
}

export function enregistrerParametres(parametres: Parametres): Promise<Parametres> {
  return put<Parametres>('/parametres', parametres)
}
