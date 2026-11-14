import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  annulerDemande,
  envoyerDemande,
  listerDemandes,
  listerNotifications,
  marquerNotificationLue,
} from './demandeService'

function reponse(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

describe('service des demandes', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('envoie une demande sur un produit épuisé', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse({ id: 'd-1' }, 201))

    await envoyerDemande({ produitId: 'p-1', quantiteSouhaitee: 2 })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/demandes')
    expect(options?.method).toBe('POST')
    expect(JSON.parse(String(options?.body))).toEqual({ produitId: 'p-1', quantiteSouhaitee: 2 })
  })

  it('liste les demandes et les notifications du client', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => reponse([]))

    await expect(listerDemandes()).resolves.toEqual([])
    await expect(listerNotifications()).resolves.toEqual([])

    expect(fetchMock).toHaveBeenCalledWith('/api/demandes', expect.objectContaining({ method: 'GET' }))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/notifications',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('annule une demande et marque une notification comme lue', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => reponse({}))

    await annulerDemande('d 1')
    await marquerNotificationLue('n-1')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/demandes/d%201/annulation',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/notifications/n-1/lue',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
