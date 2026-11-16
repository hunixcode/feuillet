import { createContext, useContext } from 'react'

export interface LignePanier {
  produitId: string
  quantite: number
}

export interface PanierContextValue {
  lignes: LignePanier[]
  nombreArticles: number
  ajouter: (produitId: string, quantite: number) => void
  changerQuantite: (produitId: string, quantite: number) => void
  retirer: (produitId: string) => void
  vider: () => void
}

export const PanierContext = createContext<PanierContextValue | null>(null)

export function usePanier(): PanierContextValue {
  const valeur = useContext(PanierContext)
  if (!valeur) {
    throw new Error('usePanier doit être utilisé dans un PanierProvider.')
  }
  return valeur
}
