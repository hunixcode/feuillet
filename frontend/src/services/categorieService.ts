import type { Categorie } from '../types/categorie'
import { get } from './api'

export function listerCategories(): Promise<Categorie[]> {
  return get<Categorie[]>('/categories')
}
