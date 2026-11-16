import { describe, expect, it } from 'vitest'
import type { EtatStock, Mouvement } from '../../types/stock'
import { libelleEtatStock, libelleQuantiteMouvement } from './libelles'

const etat: EtatStock = {
  produitId: 'p-1',
  quantitePhysique: 3,
  quantiteMiseDeCote: 0,
  quantiteDefectueuse: 0,
  quantiteVendable: 3,
}

const mouvement: Mouvement = {
  id: 'm-1',
  produitId: 'p-1',
  date: '2026-10-22T20:00:00.000Z',
  type: 'entree',
  quantite: 25,
  motif: 'Réception',
  operateur: 'responsable',
}

describe('libellés du stock', () => {
  it('indique un article disponible quand il reste un exemplaire vendable', () => {
    expect(libelleEtatStock(etat)).toBe('Disponible')
  })

  it('indique un article épuisé quand le vendable vaut 0', () => {
    expect(libelleEtatStock({ ...etat, quantiteVendable: 0 })).toBe('Épuisé')
  })

  it('n affiche jamais disponible un article dont seuls les défectueux restent', () => {
    expect(
      libelleEtatStock({ ...etat, quantitePhysique: 0, quantiteVendable: 0, quantiteDefectueuse: 4 }),
    ).toBe('Épuisé')
  })

  it.each([
    [25, '+25'],
    [-1, '−1'],
    [0, '0'],
  ])('signe la quantité %i d un mouvement', (quantite, attendu) => {
    expect(libelleQuantiteMouvement({ ...mouvement, quantite })).toBe(attendu)
  })

  it('affiche l avant et l après d un ajustement', () => {
    expect(
      libelleQuantiteMouvement({
        ...mouvement,
        type: 'ajustement',
        quantite: -2,
        quantiteAvant: 12,
        quantiteApres: 10,
      }),
    ).toBe('12 → 10')
  })
})
