import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  creerCommandeFournisseur,
  creerFournisseur,
  enregistrerReception,
  listerCommandesFournisseur,
  listerFournisseurs,
  listerProduitsAReapprovisionner,
  listerReceptions,
  modifierFournisseur,
  validerReception,
} from './reapproService'

function simulerFetch(corps: unknown = []) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(corps)))
}

function url(fetchMock: ReturnType<typeof simulerFetch>) {
  return String(fetchMock.mock.calls[0][0])
}

function envoi(fetchMock: ReturnType<typeof simulerFetch>) {
  const options = fetchMock.mock.calls[0][1]
  return { methode: options?.method, corps: JSON.parse(String(options?.body)) }
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

  it('crée une commande fournisseur', async () => {
    const fetchMock = simulerFetch({ id: 'cf-1' })
    const commande = {
      fournisseurId: 'f-1',
      produitId: 'p-1',
      quantiteCommandee: 10,
      dateArriveePrevue: '2026-11-20',
    }

    await creerCommandeFournisseur(commande)

    expect(url(fetchMock)).toBe('/api/commandes-fournisseur')
    expect(envoi(fetchMock)).toEqual({ methode: 'POST', corps: commande })
  })

  it('liste, crée et modifie les fournisseurs', async () => {
    let fetchMock = simulerFetch()
    await listerFournisseurs()
    expect(url(fetchMock)).toBe('/api/fournisseurs')

    vi.restoreAllMocks()
    fetchMock = simulerFetch({ id: 'f-1' })
    await creerFournisseur({ nom: 'Diffusion Océanie', contact: 'contact@do.pf' })
    expect(url(fetchMock)).toBe('/api/fournisseurs')
    expect(envoi(fetchMock)).toEqual({
      methode: 'POST',
      corps: { nom: 'Diffusion Océanie', contact: 'contact@do.pf' },
    })

    vi.restoreAllMocks()
    fetchMock = simulerFetch({ id: 'f-1' })
    await modifierFournisseur('f-1', { nom: 'Diffusion Océanie' })
    expect(url(fetchMock)).toBe('/api/fournisseurs/f-1')
    expect(envoi(fetchMock)).toEqual({ methode: 'PUT', corps: { nom: 'Diffusion Océanie' } })
  })

  it('liste, saisit puis valide les réceptions d une commande', async () => {
    let fetchMock = simulerFetch()
    await listerReceptions('cf-1')
    expect(url(fetchMock)).toBe('/api/commandes-fournisseur/cf-1/receptions')

    vi.restoreAllMocks()
    fetchMock = simulerFetch({ id: 'r-1' })
    await enregistrerReception('cf-1', { quantiteRecue: 4, quantiteAbimee: 1 })
    expect(url(fetchMock)).toBe('/api/commandes-fournisseur/cf-1/receptions')
    expect(envoi(fetchMock)).toEqual({ methode: 'POST', corps: { quantiteRecue: 4, quantiteAbimee: 1 } })

    vi.restoreAllMocks()
    fetchMock = simulerFetch({})
    await validerReception('r-1')
    expect(url(fetchMock)).toBe('/api/receptions/r-1/validation')
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST')
  })
})
