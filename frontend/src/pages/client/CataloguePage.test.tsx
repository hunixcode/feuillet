import { fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PanierProvider } from '../../contexts/PanierContext.tsx'
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

function titresAffiches() {
  return Array.from(document.querySelectorAll('.catalogue-produits .produit-titre')).map((titre) => titre.textContent)
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
  render(
    <PanierProvider>
      <RouterProvider router={router} />
    </PanierProvider>,
  )
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
    const liste = screen.getAllByRole('listitem').filter((item) => item.querySelector('.produit'))
    expect(liste).toHaveLength(2)
    expect(screen.getAllByText('Robert Louis Stevenson').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Clairefontaine').length).toBeGreaterThan(0)
    expect(screen.getByText('650 XPF')).toBeInTheDocument()
  })

  it('donne son titre à l onglet, à la place du titre par défaut de index.html', async () => {
    const titreParDefaut = document.createElement('title')
    titreParDefaut.textContent = 'Feuillet'
    document.head.appendChild(titreParDefaut)
    try {
      simulerApi([ileAuTresor])
      afficher()
      await screen.findByText('1 article')

      expect(document.title).toBe('Catalogue · Feuillet')
    } finally {
      titreParDefaut.remove()
    }
  })

  it('affiche le prix remisé, le prix barré et la remise d une promotion', async () => {
    simulerApi([ileAuTresor])
    afficher()

    expect(await screen.findByText('1 530 XPF')).toBeInTheDocument()
    expect(screen.getByText('1 800 XPF')).toBeInTheDocument()
    expect(screen.getByText('−15 %')).toBeInTheDocument()
  })

  it('affiche la disponibilité envoyée par l API', async () => {
    simulerApi([
      { ...ileAuTresor, disponibilite: 'disponible' },
      { ...carnet, disponibilite: 'epuise' },
    ])
    afficher()

    const ile = await screen.findByRole('link', { name: /L'Île au trésor/ })
    const carte = screen.getByRole('link', { name: /Carnet ligné/ })

    expect(within(ile).queryByText('Disponible sur demande')).not.toBeInTheDocument()
    expect(within(carte).getByText('Disponible sur demande')).toBeInTheDocument()
    expect(screen.getByText('Épuisé')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajouter L\'Île au trésor au panier' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ajouter Carnet ligné au panier' })).not.toBeInTheDocument()
  })

  it('ajoute un article au panier depuis sa carte', async () => {
    simulerApi([ileAuTresor])
    afficher()

    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter L\'Île au trésor au panier' }))

    expect(JSON.parse(localStorage.getItem('panier') ?? '[]')).toEqual([
      { produitId: 'p-1', quantite: 1 },
    ])
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

  it('affiche la recherche lancée depuis l en-tête et permet de tout afficher', async () => {
    const fetchMock = simulerApi([ileAuTresor])
    const router = afficher('/catalogue?q=Stevenson')
    await screen.findByText('1 article')

    expect(appelsProduits(fetchMock)).toContain('/api/produits?q=Stevenson')
    expect(screen.getByText(/Recherche : « Stevenson »/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Tout afficher' }))

    await vi.waitFor(() => expect(router.state.location.search).toBe(''))
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

  it('trie les articles par prix sans redemander la liste au serveur', async () => {
    const fetchMock = simulerApi([ileAuTresor, carnet])
    afficher()
    await screen.findByText('2 articles')
    expect(titresAffiches()).toEqual(['L\'Île au trésor', 'Carnet ligné'])
    const appelsAvant = appelsProduits(fetchMock).length

    fireEvent.click(screen.getByRole('button', { name: 'Prix croissant' }))
    await vi.waitFor(() => expect(titresAffiches()).toEqual(['Carnet ligné', 'L\'Île au trésor']))
    expect(screen.getByRole('button', { name: 'Prix croissant' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Prix décroissant' }))
    await vi.waitFor(() => expect(titresAffiches()).toEqual(['L\'Île au trésor', 'Carnet ligné']))

    expect(appelsProduits(fetchMock)).toHaveLength(appelsAvant)
  })

  it('reprend le tri de l adresse', async () => {
    simulerApi([ileAuTresor, carnet])
    afficher('/catalogue?tri=prix-croissant')

    await screen.findByText('2 articles')

    expect(titresAffiches()).toEqual(['Carnet ligné', 'L\'Île au trésor'])
    expect(screen.getByRole('button', { name: 'Prix croissant' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('reprend les filtres de l adresse', async () => {
    const fetchMock = simulerApi([ileAuTresor])
    afficher('/catalogue?q=tr%C3%A9sor&categorie=roman')

    await screen.findByText('1 article')

    expect(appelsProduits(fetchMock)).toContain('/api/produits?q=tr%C3%A9sor&categorie=roman')
    expect(screen.getByText(/Recherche : « trésor »/)).toBeInTheDocument()
    expect(
      within(screen.getByRole('navigation', { name: 'Rayons' })).getByRole('link', { name: 'Roman' }),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('explique qu un rayon est vide sans parler d orthographe', async () => {
    simulerApi([])
    afficher('/catalogue?categorie=policier')

    expect(
      await screen.findByRole('heading', { name: 'Aucun article dans cette sélection.' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Ce rayon n'a pas encore d'article\./)).toBeInTheDocument()
    expect(screen.queryByText(/Vérifiez l'orthographe/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Demander ce livre' })).toHaveAttribute(
      'href',
      '/demandes',
    )
  })

  it('explique quand aucun article ne correspond à la recherche', async () => {
    simulerApi([])
    afficher('/catalogue?q=Rivage')

    expect(
      await screen.findByRole('heading', { name: 'Aucun article ne correspond à « Rivage ».' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Demander ce livre' })).toHaveAttribute(
      'href',
      '/demandes?titre=Rivage',
    )
    expect(screen.getByRole('link', { name: 'Voir tout le catalogue' })).toHaveAttribute(
      'href',
      '/catalogue',
    )
  })

  it('garde les articles affichés pendant le chargement d un autre rayon', async () => {
    let liberer: (valeur: Response) => void = () => {}
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree) => {
      const url = String(entree)
      if (url.startsWith('/api/categories')) {
        return reponse(categories)
      }
      if (url.includes('categorie=roman')) {
        return new Promise<Response>((resoudre) => {
          liberer = resoudre
        })
      }
      return reponse([ileAuTresor, carnet])
    })
    afficher()
    await screen.findByText('2 articles')

    const rayons = within(screen.getByRole('navigation', { name: 'Rayons' }))
    fireEvent.click(await rayons.findByRole('link', { name: 'Roman' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Chargement du catalogue')
    expect(titresAffiches()).toEqual(['L\'Île au trésor', 'Carnet ligné'])

    liberer(reponse([ileAuTresor]))

    expect(await screen.findByText('1 article')).toBeInTheDocument()
    expect(titresAffiches()).toEqual(['L\'Île au trésor'])
  })

  it('affiche une erreur et permet de réessayer', async () => {
    let appels = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree) => {
      if (!String(entree).startsWith('/api/produits')) {
        return reponse(String(entree).startsWith('/api/categories') ? categories : [])
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
