import { useEffect, useState, type ReactNode } from 'react'
import { PanierContext, type LignePanier } from './usePanier'

const CLE_PANIER = 'panier'

function quantiteValide(quantite: unknown): quantite is number {
  return typeof quantite === 'number' && Number.isSafeInteger(quantite) && quantite >= 1
}

function lirePanier(): LignePanier[] {
  try {
    const contenu: unknown = JSON.parse(localStorage.getItem(CLE_PANIER) ?? '[]')
    if (!Array.isArray(contenu)) {
      return []
    }
    return contenu.filter(
      (ligne): ligne is LignePanier =>
        typeof ligne === 'object' &&
        ligne !== null &&
        typeof ligne.produitId === 'string' &&
        ligne.produitId !== '' &&
        quantiteValide(ligne.quantite),
    )
  } catch {
    return []
  }
}

interface PanierProviderProps {
  children: ReactNode
}

export function PanierProvider({ children }: PanierProviderProps) {
  const [lignes, setLignes] = useState<LignePanier[]>(lirePanier)

  useEffect(() => {
    localStorage.setItem(CLE_PANIER, JSON.stringify(lignes))
  }, [lignes])

  function ajouter(produitId: string, quantite: number) {
    if (!quantiteValide(quantite)) {
      return
    }
    setLignes((actuelles) =>
      actuelles.some((ligne) => ligne.produitId === produitId)
        ? actuelles.map((ligne) =>
            ligne.produitId === produitId
              ? { ...ligne, quantite: ligne.quantite + quantite }
              : ligne,
          )
        : [...actuelles, { produitId, quantite }],
    )
  }

  function changerQuantite(produitId: string, quantite: number) {
    if (!quantiteValide(quantite)) {
      return
    }
    setLignes((actuelles) =>
      actuelles.map((ligne) => (ligne.produitId === produitId ? { ...ligne, quantite } : ligne)),
    )
  }

  function retirer(produitId: string) {
    setLignes((actuelles) => actuelles.filter((ligne) => ligne.produitId !== produitId))
  }

  function vider() {
    setLignes([])
  }

  const nombreArticles = lignes.reduce((total, ligne) => total + ligne.quantite, 0)

  return (
    <PanierContext
      value={{ lignes, nombreArticles, ajouter, changerQuantite, retirer, vider }}
    >
      {children}
    </PanierContext>
  )
}
