import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listerCategories } from './categorieService'
import { listerProduits, obtenirProduit, obtenirProduits } from './produitService'

function reponse(corps: unknown) {
  return new Response(JSON.stringify(corps), { status: 200 })
}

describe('services du catalogue', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('demande tous les produits sans filtre', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse([]))

    await expect(listerProduits()).resolves.toEqual([])

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/produits',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('ajoute la recherche, le type et la catégorie à l adresse', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse([]))

    await listerProduits({ q: ' Île au trésor ', type: 'livre', categorie: 'roman' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/produits?q=%C3%8Ele+au+tr%C3%A9sor&type=livre&categorie=roman',
      expect.any(Object),
    )
  })

  it('ignore une recherche vide', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse([]))

    await listerProduits({ q: '   ', type: '', categorie: '' })

    expect(fetchMock).toHaveBeenCalledWith('/api/produits', expect.any(Object))
  })

  it('demande un produit par son identifiant', async () => {
    const produit = { id: 'p-1', designation: 'Casino Royale' }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse(produit))

    await expect(obtenirProduit('p-1')).resolves.toEqual(produit)

    expect(fetchMock).toHaveBeenCalledWith('/api/produits/p-1', expect.any(Object))
  })

  it('recharge plusieurs produits et marque ceux qui n existent plus', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree) =>
      String(entree) === '/api/produits/p-1'
        ? reponse({ id: 'p-1', designation: 'Casino Royale' })
        : new Response(JSON.stringify({ code: 'INTROUVABLE', message: 'Introuvable.' }), {
            status: 404,
          }),
    )

    await expect(obtenirProduits(['p-1', 'p-9'])).resolves.toEqual({
      'p-1': { id: 'p-1', designation: 'Casino Royale' },
      'p-9': null,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('remonte une erreur réseau pendant le rechargement des produits', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))

    await expect(obtenirProduits(['p-1'])).rejects.toMatchObject({ code: 'RESEAU' })
  })

  it('demande la liste des catégories', async () => {
    const categories = [{ id: 'roman', libelle: 'Roman' }]
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse(categories))

    await expect(listerCategories()).resolves.toEqual(categories)

    expect(fetchMock).toHaveBeenCalledWith('/api/categories', expect.any(Object))
  })
})
