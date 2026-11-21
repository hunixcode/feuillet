import { createContext, useContext } from 'react'
import type { Produit } from '../types/produit'

export type Annoncer = (produit: Produit, quantite: number) => void

export const AnnonceContext = createContext<Annoncer>(() => {})

export function useAnnonce(): Annoncer {
  return useContext(AnnonceContext)
}
