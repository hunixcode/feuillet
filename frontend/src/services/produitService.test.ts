import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listerCategories } from './categorieService'
import { listerProduits } from './produitService'

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

  it('demande la liste des catégories', async () => {
    const categories = [{ id: 'roman', libelle: 'Roman' }]
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse(categories))

    await expect(listerCategories()).resolves.toEqual(categories)

    expect(fetchMock).toHaveBeenCalledWith('/api/categories', expect.any(Object))
  })
})
