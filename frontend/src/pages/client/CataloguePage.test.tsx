import { fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Categorie } from '../../types/categorie'
import type { Produit } from '../../types/produit'
import CataloguePage from './CataloguePage.tsx'

const ileAuTresor: Produit = {
  id: 'p-1',
  reference: 'LIV-001',
  designation: 'L\'Île au trésor',
  type: 'livre',
  categorie: 'roman',
  prix: 1800,
  tauxTva: 5,
  archive: false,
  auteur: 'Robert Louis Stevenson',
  prixApplique: 1530,
  promotion: { id: 'promo-1', remise: 15, debut: '2026-10-10', fin: '2026-10-31' },
}

const carnet: Produit = {
  id: 'p-2',
  reference: 'PAP-001',
  designation: 'Carnet ligné',
  type: 'papeterie',
  categorie: 'papeterie',
  prix: 650,
  tauxTva: 16,
  archive: false,
  marque: 'Clairefontaine',
  prixApplique: 650,
}

const categories: Categorie[] = [
  { id: 'papeterie', libelle: 'Papeterie' },
  { id: 'roman', libelle: 'Roman' },
]

function reponse(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

function simulerApi(produits: Produit[]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree) => {
    if (String(entree).startsWith('/api/categories')) {
      return reponse(categories)
    }
    return reponse(produits)
  })
}

function appelsProduits(fetchMock: ReturnType<typeof simulerApi>) {
  return fetchMock.mock.calls
    .map(([entree]) => String(entree))
    .filter((url) => url.startsWith('/api/produits'))
}

function afficher(url = '/catalogue') {
  const router = createMemoryRouter(
    [
      { path: '/catalogue', element: <CataloguePage /> },
      { path: '/produits/:id', element: <h1>Fiche produit</h1> },
      { path: '/demandes', element: <h1>Mes demandes</h1> },
    ],
    { initialEntries: [url] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('page du catalogue', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('affiche un chargement puis les articles du backend', async () => {
    simulerApi([ileAuTresor, carnet])
    afficher()

    expect(screen.getByRole('status')).toHaveTextContent('Chargement du catalogue')
    expect(await screen.findByText('2 articles')).toBeInTheDocument()
    const liste = screen.getAllByRole('listitem').filter((item) => item.querySelector('.livre'))
    expect(liste).toHaveLength(2)
    expect(screen.getAllByText('Robert Louis Stevenson').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Clairefontaine').length).toBeGreaterThan(0)
    expect(screen.getByText('650 XPF')).toBeInTheDocument()
  })

  it('affiche le prix remisé, le prix barré et la remise d une promotion', async () => {
    simulerApi([ileAuTresor])
    afficher()

    expect(await screen.findByText('1 530 XPF')).toBeInTheDocument()
    expect(screen.getByText('1 800 XPF')).toBeInTheDocument()
    expect(screen.getByText('−15 %')).toBeInTheDocument()
  })

  it('ouvre la fiche d un article', async () => {
    simulerApi([ileAuTresor])
    afficher()

    fireEvent.click(await screen.findByRole('link', { name: /L'Île au trésor/ }))

    expect(await screen.findByRole('heading', { name: 'Fiche produit' })).toBeInTheDocument()
  })

  it('affiche les rayons du backend et filtre par catégorie', async () => {
    const fetchMock = simulerApi([ileAuTresor])
    afficher()
    const rayons = within(screen.getByRole('navigation', { name: 'Rayons' }))

    expect(rayons.getByRole('link', { name: 'Tous' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(await rayons.findByRole('link', { name: 'Roman' }))

    expect(await rayons.findByRole('link', { name: 'Roman' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(appelsProduits(fetchMock)).toContain('/api/produits?categorie=roman')
  })

  it('cherche un article', async () => {
    const fetchMock = simulerApi([ileAuTresor])
    afficher()
    await screen.findByText('1 article')

    fireEvent.change(screen.getByLabelText('Rechercher dans le catalogue'), {
      target: { value: 'Stevenson' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }))

    await vi.waitFor(() =>
      expect(appelsProduits(fetchMock)).toContain('/api/produits?q=Stevenson'),
    )
  })

  it('filtre par type', async () => {
    const fetchMock = simulerApi([carnet])
    afficher()
    await screen.findByText('1 article')

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'papeterie' } })

    await vi.waitFor(() =>
      expect(appelsProduits(fetchMock)).toContain('/api/produits?type=papeterie'),
    )
    expect(screen.getByLabelText('Type')).toHaveValue('papeterie')
  })

  it('reprend les filtres de l adresse', async () => {
    const fetchMock = simulerApi([ileAuTresor])
    afficher('/catalogue?q=tr%C3%A9sor&categorie=roman')

    await screen.findByText('1 article')

    expect(appelsProduits(fetchMock)).toContain('/api/produits?q=tr%C3%A9sor&categorie=roman')
    expect(screen.getByLabelText('Rechercher dans le catalogue')).toHaveValue('trésor')
  })

  it('explique quand aucun article ne correspond à la recherche', async () => {
    simulerApi([])
    afficher('/catalogue?q=Rivage')

    expect(
      await screen.findByRole('heading', { name: 'Aucun article ne correspond à « Rivage ».' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Demander ce livre' })).toHaveAttribute(
      'href',
      '/demandes',
    )
    expect(screen.getByRole('link', { name: 'Voir tout le catalogue' })).toHaveAttribute(
      'href',
      '/catalogue',
    )
  })

  it('affiche une erreur et permet de réessayer', async () => {
    let appels = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree) => {
      if (String(entree).startsWith('/api/categories')) {
        return reponse(categories)
      }
      appels += 1
      if (appels === 1) {
        throw new TypeError('offline')
      }
      return reponse([ileAuTresor])
    })
    afficher()

    const alerte = await screen.findByRole('alert')
    expect(alerte).toHaveTextContent('Le catalogue n\'a pas pu être chargé.')
    expect(alerte).toHaveTextContent('Impossible de joindre le serveur. Vérifiez votre connexion.')

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(await screen.findByText('1 article')).toBeInTheDocument()
  })
})
