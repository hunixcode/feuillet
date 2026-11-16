import { beforeEach, describe, expect, it, vi } from 'vitest'
import { exporterRapport, lireRapport } from './rapportService'

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

  it('exporte en CSV avec les mêmes filtres', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('a;b'))

    const fichier = await exporterRapport({ debut: '2026-11-01', fin: '2026-11-30', categorie: 'manga' })

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      '/api/rapports/export.csv?debut=2026-11-01&fin=2026-11-30&categorie=manga',
    )
    expect(fichier.nom).toBe('rapport.csv')
  })
})
