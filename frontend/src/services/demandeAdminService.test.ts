import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listerDemandes } from './demandeAdminService'

function simulerFetch() {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([])))
}

describe('service des demandes du responsable', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('liste toutes les demandes', async () => {
    const fetchMock = simulerFetch()

    await listerDemandes()

    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/demandes')
  })

  it('filtre les demandes par statut', async () => {
    const fetchMock = simulerFetch()

    await listerDemandes('mise_de_cote')

    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/demandes?statut=mise_de_cote')
  })
})
