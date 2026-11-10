import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PanierProvider } from './PanierContext.tsx'
import { usePanier } from './usePanier'

function afficher() {
  return renderHook(() => usePanier(), { wrapper: PanierProvider })
}

function panierEnregistre() {
  return JSON.parse(localStorage.getItem('panier') ?? '[]')
}

describe('panier', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('démarre vide', () => {
    const { result } = afficher()

    expect(result.current.lignes).toEqual([])
    expect(result.current.nombreArticles).toBe(0)
  })

  it('ajoute un article et le garde dans le navigateur', () => {
    const { result } = afficher()

    act(() => result.current.ajouter('p-1', 2))

    expect(result.current.lignes).toEqual([{ produitId: 'p-1', quantite: 2 }])
    expect(result.current.nombreArticles).toBe(2)
    expect(panierEnregistre()).toEqual([{ produitId: 'p-1', quantite: 2 }])
  })

  it('additionne les quantités d un même article et compte tous les exemplaires', () => {
    const { result } = afficher()

    act(() => {
      result.current.ajouter('p-1', 1)
      result.current.ajouter('p-2', 3)
      result.current.ajouter('p-1', 2)
    })

    expect(result.current.lignes).toEqual([
      { produitId: 'p-1', quantite: 3 },
      { produitId: 'p-2', quantite: 3 },
    ])
    expect(result.current.nombreArticles).toBe(6)
  })

  it('change la quantité d une ligne', () => {
    const { result } = afficher()
    act(() => result.current.ajouter('p-1', 1))

    act(() => result.current.changerQuantite('p-1', 4))

    expect(result.current.lignes).toEqual([{ produitId: 'p-1', quantite: 4 }])
  })

  it('refuse une quantité nulle, négative ou décimale', () => {
    const { result } = afficher()
    act(() => result.current.ajouter('p-1', 2))

    act(() => {
      result.current.changerQuantite('p-1', 0)
      result.current.changerQuantite('p-1', -1)
      result.current.changerQuantite('p-1', 1.5)
      result.current.ajouter('p-2', 0)
    })

    expect(result.current.lignes).toEqual([{ produitId: 'p-1', quantite: 2 }])
  })

  it('retire un article puis vide le panier', () => {
    const { result } = afficher()
    act(() => {
      result.current.ajouter('p-1', 1)
      result.current.ajouter('p-2', 1)
    })

    act(() => result.current.retirer('p-1'))
    expect(result.current.lignes).toEqual([{ produitId: 'p-2', quantite: 1 }])

    act(() => result.current.vider())
    expect(result.current.lignes).toEqual([])
    expect(panierEnregistre()).toEqual([])
  })

  it('retrouve le panier enregistré après un rechargement', () => {
    localStorage.setItem('panier', JSON.stringify([{ produitId: 'p-1', quantite: 2 }]))

    const { result } = afficher()

    expect(result.current.lignes).toEqual([{ produitId: 'p-1', quantite: 2 }])
  })

  it.each([
    ['du texte qui n est pas du JSON', '{panier cassé'],
    ['un objet au lieu d une liste', '{"produitId":"p-1"}'],
    ['des lignes invalides', '[{"produitId":"","quantite":1},{"produitId":"p-2","quantite":0},{"quantite":3}]'],
  ])('ignore un panier enregistré abîmé : %s', (_cas, contenu) => {
    localStorage.setItem('panier', contenu)

    const { result } = afficher()

    expect(result.current.lignes).toEqual([])
  })

  it('signale une utilisation en dehors du fournisseur', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => usePanier())).toThrow(
      'usePanier doit être utilisé dans un PanierProvider.',
    )
  })
})
