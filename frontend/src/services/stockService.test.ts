import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EtatStock } from '../types/stock'
import { ApiRequestError } from './api'
import {
  corrigerInventaire,
  declarerDefectueux,
  listerMouvements,
  listerStock,
  sortirDefectueux,
} from './stockService'

const etat: EtatStock = {
  produitId: 'p-1',
  quantitePhysique: 10,
  quantiteMiseDeCote: 2,
  quantiteDefectueuse: 1,
  quantiteVendable: 8,
}

function simulerFetch(corps: unknown = [], status = 200) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(corps), { status }))
}

function appel(fetchMock: ReturnType<typeof simulerFetch>) {
  const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
  return {
    url,
    methode: options.method,
    corps: options.body ? JSON.parse(String(options.body)) : undefined,
  }
}

describe('service du stock', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('liste le stock sans paramètre', async () => {
    const fetchMock = simulerFetch()
    await listerStock()
    expect(appel(fetchMock).url).toBe('/api/stock')
  })

  it('envoie la recherche et les filtres du catalogue', async () => {
    const fetchMock = simulerFetch()
    await listerStock({ q: '  île ', type: 'livre', categorie: 'roman' })
    expect(appel(fetchMock).url).toBe('/api/stock?q=%C3%AEle&type=livre&categorie=roman')
  })

  it('ignore une recherche vide et un type vide', async () => {
    const fetchMock = simulerFetch()
    await listerStock({ q: '   ', type: '' })
    expect(appel(fetchMock).url).toBe('/api/stock')
  })

  it('liste les mouvements sans paramètre', async () => {
    const fetchMock = simulerFetch()
    await listerMouvements()
    expect(appel(fetchMock)).toMatchObject({ url: '/api/mouvements', methode: 'GET' })
  })

  it('filtre les mouvements par article et par type', async () => {
    const fetchMock = simulerFetch()
    await listerMouvements({ produit: 'p-1', type: 'ajustement' })
    expect(appel(fetchMock).url).toBe('/api/mouvements?produit=p-1&type=ajustement')
  })

  it('enregistre une correction d inventaire', async () => {
    const fetchMock = simulerFetch(etat)
    await expect(
      corrigerInventaire('p-1', { quantiteComptee: 10, motif: 'Comptage annuel' }),
    ).resolves.toEqual(etat)
    expect(appel(fetchMock)).toEqual({
      url: '/api/produits/p-1/stock/inventaire',
      methode: 'POST',
      corps: { quantiteComptee: 10, motif: 'Comptage annuel' },
    })
  })

  it('déclare des exemplaires abîmés', async () => {
    const fetchMock = simulerFetch(etat)
    await declarerDefectueux('p-1', { quantite: 2, motif: 'Couverture déchirée' })
    expect(appel(fetchMock)).toEqual({
      url: '/api/produits/p-1/stock/defectueux',
      methode: 'POST',
      corps: { quantite: 2, motif: 'Couverture déchirée' },
    })
  })

  it('sort des exemplaires du stock défectueux', async () => {
    const fetchMock = simulerFetch(etat)
    await sortirDefectueux('p-1', { quantite: 1, motif: 'Renvoi fournisseur' })
    expect(appel(fetchMock)).toEqual({
      url: '/api/produits/p-1/stock/defectueux/sortie',
      methode: 'POST',
      corps: { quantite: 1, motif: 'Renvoi fournisseur' },
    })
  })

  it('encode l identifiant du produit', async () => {
    const fetchMock = simulerFetch(etat)
    await corrigerInventaire('p/1', { quantiteComptee: 3, motif: 'Recomptage' })
    expect(appel(fetchMock).url).toBe('/api/produits/p%2F1/stock/inventaire')
  })

  it.each([
    [400, 'VALIDATION'],
    [404, 'INTROUVABLE'],
    [409, 'STOCK_INSUFFISANT'],
    [409, 'STOCK_MODIFIE'],
  ])('transmet une erreur %i %s du serveur', async (status, code) => {
    simulerFetch({ code, message: 'Refusé.' }, status)
    const promesse = declarerDefectueux('p-1', { quantite: 5, motif: 'Abîmé' })
    await expect(promesse).rejects.toBeInstanceOf(ApiRequestError)
    await expect(promesse).rejects.toMatchObject({ code })
  })
})
