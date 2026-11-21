import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listerDemandes, rattacherDemande } from './demandeAdminService'

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

  it('rattache une demande hors catalogue à un article', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({})))

    await rattacherDemande('d-1', 'p-9')

    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('/api/demandes/d-1/rattachement')
    expect(options?.method).toBe('POST')
    expect(JSON.parse(String(options?.body))).toEqual({ produitId: 'p-9' })
  })
})
