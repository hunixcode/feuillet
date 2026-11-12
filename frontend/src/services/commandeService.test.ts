import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from './api'
import { calculerDevis, lignesRefusees, obtenirCommande, passerCommande } from './commandeService'

function reponse(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

const panier = {
  lignes: [{ produitId: 'p-1', quantite: 2 }],
  emballageCadeau: true,
  occasionCadeau: 'noel' as const,
}

describe('service des commandes', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('envoie le panier au devis sans aucun prix', async () => {
    const devis = { lignes: [], lignesIndisponibles: [], total: 0 }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse(devis))

    await expect(calculerDevis(panier)).resolves.toEqual(devis)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/commandes/devis')
    expect(options?.method).toBe('POST')
    expect(JSON.parse(String(options?.body))).toEqual(panier)
  })

  it('passe la commande avec l adresse de livraison', async () => {
    const vente = { id: 'v-1', statut: 'a_preparer' }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse(vente, 201))

    await expect(
      passerCommande({ ...panier, adresseLivraison: 'BP 12, Papeete' }),
    ).resolves.toEqual(vente)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/commandes')
    expect(JSON.parse(String(options?.body))).toEqual({
      ...panier,
      adresseLivraison: 'BP 12, Papeete',
    })
  })

  it('demande une commande par son identifiant', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse({ id: 'v 1' }))

    await obtenirCommande('v 1')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/commandes/v%201',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('lit les lignes refusées d une commande', () => {
    const refus = new ApiRequestError({
      code: 'LIGNE_INDISPONIBLE',
      message: 'Commande refusée.',
      details: { lignes: [{ produitId: 'p-1', quantite: 6 }, { quantite: 2 }] },
    })

    expect(lignesRefusees(refus)).toEqual([{ produitId: 'p-1', quantite: 6 }])
    expect(lignesRefusees(new ApiRequestError({ code: 'VALIDATION', message: 'x' }))).toEqual([])
    expect(lignesRefusees(new Error('x'))).toEqual([])
  })
})
