import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  enregistrerRetour,
  expedierVente,
  lireRetours,
  listerVentes,
  obtenirVente,
} from './venteAdminService'

function simulerFetch(corps: unknown = []) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(corps)))
}

describe('service des ventes du responsable', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('liste les ventes, avec ou sans statut', async () => {
    let fetchMock = simulerFetch()
    await listerVentes()
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/ventes')

    vi.restoreAllMocks()
    fetchMock = simulerFetch()
    await listerVentes('a_preparer')
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/ventes?statut=a_preparer')
  })

  it('lit une vente et la marque expédiée', async () => {
    let fetchMock = simulerFetch({ id: 'v-1' })
    await obtenirVente('v-1')
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/ventes/v-1')

    vi.restoreAllMocks()
    fetchMock = simulerFetch({ id: 'v-1' })
    await expedierVente('v-1')
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/ventes/v-1/expedition')
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST')
  })

  it('lit les retours possibles et enregistre un échange', async () => {
    let fetchMock = simulerFetch({})
    await lireRetours('v-1')
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/ventes/v-1/retours')

    vi.restoreAllMocks()
    fetchMock = simulerFetch({ id: 'r-1' })
    const retour = {
      produitId: 'p-1',
      quantite: 1,
      issue: 'echange' as const,
      revendable: true,
      echange: { lignes: [{ produitId: 'p-2', quantite: 1 }] },
    }
    await enregistrerRetour('v-1', retour)
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/ventes/v-1/retours')
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST')
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual(retour)
  })
})
