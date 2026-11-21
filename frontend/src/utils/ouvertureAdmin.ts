import { useEffect, useRef } from 'react'

export type CibleOuverture =
  | 'article'
  | 'nouvel-article'
  | 'vente'
  | 'demande'
  | 'fournisseur'
  | 'nouvelle-commande'
  | 'journal'

export interface Ouverture {
  cible: CibleOuverture
  id?: string
}

let enAttente: Ouverture | null = null
const abonnes = new Set<() => void>()

export function demanderOuverture(ouverture: Ouverture) {
  enAttente = ouverture
  abonnes.forEach((prevenir) => prevenir())
}

export function useOuverture(cibles: CibleOuverture[], rappel: (ouverture: Ouverture) => void) {
  const dernierRappel = useRef(rappel)
  const cle = cibles.join(',')

  useEffect(() => {
    dernierRappel.current = rappel
  })

  useEffect(() => {
    const acceptees = cle.split(',')
    const consommer = () => {
      if (enAttente && acceptees.includes(enAttente.cible)) {
        const ouverture = enAttente
        enAttente = null
        dernierRappel.current(ouverture)
      }
    }
    consommer()
    abonnes.add(consommer)
    return () => {
      abonnes.delete(consommer)
    }
  }, [cle])
}
