import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Produit } from '../types/produit'
import {
  ajouterPromotion,
  changerArchivage,
  listerProduits,
  renommerCategorie,
  supprimerPromotion,
} from './catalogueAdminService'

const produit: Produit = {
  id: 'p-1',
  reference: 'LIV-001',
  designation: "L'Île au trésor",
  type: 'livre',
  categorie: 'roman',
  prix: 1800,
  tauxTva: 5,
  archive: false,
  auteur: 'Robert Louis Stevenson',
  prixApplique: 1530,
  promotion: { id: 'pr-1', remise: 15, debut: '2026-10-10', fin: '2026-10-31' },
}

function simulerFetch(corps: unknown = [], status = 200) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(
      status === 204
        ? new Response(null, { status })
        : new Response(JSON.stringify(corps), { status }),
    )
}

function appel(fetchMock: ReturnType<typeof simulerFetch>) {
  const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
  return {
    url,
    methode: options.method,
    corps: options.body ? JSON.parse(String(options.body)) : undefined,
  }
}

describe('service du catalogue responsable', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('liste les produits actifs sans paramètre', async () => {
    const fetchMock = simulerFetch()
    await listerProduits()
    expect(appel(fetchMock).url).toBe('/api/produits')
  })

  it('envoie la recherche, les filtres et les archivés', async () => {
    const fetchMock = simulerFetch()
    await listerProduits({ q: '  île ', type: 'livre', categorie: 'roman', archive: true })
    expect(appel(fetchMock).url).toBe(
      '/api/produits?q=%C3%AEle&type=livre&categorie=roman&archive=true',
    )
  })

  it('archive en renvoyant la fiche sans les champs calculés', async () => {
    const fetchMock = simulerFetch({ ...produit, archive: true })
    await changerArchivage(produit, true)
    const { url, methode, corps } = appel(fetchMock)
    expect(url).toBe('/api/produits/p-1')
    expect(methode).toBe('PUT')
    expect(corps).toEqual({
      reference: 'LIV-001',
      designation: "L'Île au trésor",
      type: 'livre',
      categorie: 'roman',
      prix: 1800,
      tauxTva: 5,
      archive: true,
      auteur: 'Robert Louis Stevenson',
    })
  })

  it('programme une promotion', async () => {
    const fetchMock = simulerFetch(
      { id: 'pr-2', remise: 10, debut: '2026-11-01', fin: '2026-11-15' },
      201,
    )
    await ajouterPromotion('p-1', { remise: 10, debut: '2026-11-01', fin: '2026-11-15' })
    expect(appel(fetchMock)).toEqual({
      url: '/api/produits/p-1/promotions',
      methode: 'POST',
      corps: { remise: 10, debut: '2026-11-01', fin: '2026-11-15' },
    })
  })

  it('supprime une promotion', async () => {
    const fetchMock = simulerFetch(undefined, 204)
    await expect(supprimerPromotion('p-1', 'pr-2')).resolves.toBeUndefined()
    expect(appel(fetchMock)).toMatchObject({
      url: '/api/produits/p-1/promotions/pr-2',
      methode: 'DELETE',
    })
  })

  it('renomme une catégorie', async () => {
    const fetchMock = simulerFetch({ id: 'bd-et-manga', libelle: 'BD' })
    await renommerCategorie('bd-et-manga', 'BD')
    expect(appel(fetchMock)).toEqual({
      url: '/api/categories/bd-et-manga',
      methode: 'PUT',
      corps: { libelle: 'BD' },
    })
  })
})
