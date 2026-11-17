import type { Categorie } from '../types/categorie'

const ORDRE = ['roman', 'policier', 'bd-et-manga', 'jeunesse', 'documentaire', 'scolaire', 'presse', 'fournitures']

function rang(id: string): number {
  const position = ORDRE.indexOf(id)
  return position === -1 ? ORDRE.length : position
}

export function trierRayons(categories: Categorie[]): Categorie[] {
  return [...categories].sort(
    (a, b) => rang(a.id) - rang(b.id) || a.libelle.localeCompare(b.libelle, 'fr'),
  )
}
