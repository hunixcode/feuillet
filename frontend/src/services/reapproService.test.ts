import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listerCommandesFournisseur, listerProduitsAReapprovisionner } from './reapproService'

function simulerFetch(corps: unknown = []) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(corps)))
}

function url(fetchMock: ReturnType<typeof simulerFetch>) {
  return String(fetchMock.mock.calls[0][0])
}

describe('service du réapprovisionnement', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('liste les produits à recommander', async () => {
    const fetchMock = simulerFetch([{ produitId: 'p-1' }])

    await expect(listerProduitsAReapprovisionner()).resolves.toEqual([{ produitId: 'p-1' }])
    expect(url(fetchMock)).toBe('/api/reapprovisionnement')
  })

  it('liste les commandes fournisseur sans filtre', async () => {
    const fetchMock = simulerFetch()

    await listerCommandesFournisseur()

    expect(url(fetchMock)).toBe('/api/commandes-fournisseur')
  })

  it('envoie seulement les filtres renseignés', async () => {
    const fetchMock = simulerFetch()

    await listerCommandesFournisseur({ statut: 'en_cours', produitId: '', fournisseurId: 'f-1' })

    expect(url(fetchMock)).toBe('/api/commandes-fournisseur?statut=en_cours&fournisseurId=f-1')
  })
})
