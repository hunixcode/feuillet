import { beforeEach, describe, expect, it, vi } from 'vitest'
import { lireRapport } from './rapportService'

function simulerFetch() {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({})))
}

describe('service des rapports', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('lit le rapport de la semaine en cours par défaut', async () => {
    const fetchMock = simulerFetch()

    await lireRapport()

    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/rapports')
  })

  it('envoie la semaine et la catégorie', async () => {
    const fetchMock = simulerFetch()

    await lireRapport({ semaine: '2026-11-04', categorie: 'roman' })

    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/rapports?semaine=2026-11-04&categorie=roman')
  })
})
