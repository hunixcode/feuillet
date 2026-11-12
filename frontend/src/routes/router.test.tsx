import { render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../contexts/AuthContext.tsx'
import { PanierProvider } from '../contexts/PanierContext.tsx'
import { routes } from './router.tsx'

function afficher(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <AuthProvider>
      <PanierProvider>
        <RouterProvider router={router} />
      </PanierProvider>
    </AuthProvider>,
  )
}

describe('routes de l espace client', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('redirige la racine vers le catalogue', async () => {
    afficher('/')
    expect(await screen.findByRole('heading', { name: 'Catalogue' })).toBeInTheDocument()
  })

  it('affiche la fiche du produit demandé', async () => {
    const produit = {
      id: '42',
      reference: 'LIV-042',
      designation: 'Casino Royale',
      type: 'livre',
      categorie: 'policier',
      prix: 1450,
      tauxTva: 5,
      archive: false,
      prixApplique: 1450,
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree) =>
      new Response(JSON.stringify(String(entree).startsWith('/api/produits/') ? produit : [])),
    )
    afficher('/produits/42')
    expect(await screen.findByRole('heading', { name: 'Casino Royale' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/produits/42', expect.any(Object))
  })

  it('affiche une page introuvable pour une adresse inconnue', async () => {
    afficher('/adresse-inconnue')
    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour au catalogue' })).toHaveAttribute('href', '/catalogue')
    expect(document.title).toBe('Page introuvable · Feuillet')
  })

  it('affiche la page d erreur quand une page plante', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const produitInvalide = {
      id: '7',
      reference: 'LIV-007',
      designation: 'Prix invalide',
      type: 'livre',
      categorie: 'roman',
      prix: 1000,
      tauxTva: 5,
      archive: false,
      prixApplique: 12.5,
    }
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree) =>
      new Response(
        JSON.stringify(String(entree).startsWith('/api/produits/') ? produitInvalide : []),
      ),
    )

    afficher('/produits/7')

    expect(
      await screen.findByRole('heading', { name: 'Une erreur est survenue' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour au catalogue' })).toHaveAttribute(
      'href',
      '/catalogue',
    )
    expect(document.title).toBe('Erreur · Feuillet')
  })

  it('envoie vers la connexion un visiteur qui ouvre ses demandes', async () => {
    afficher('/demandes')
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
  })

  it('envoie vers la connexion un visiteur qui ouvre une commande', async () => {
    afficher('/commandes/v-1')
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
  })

  it('affiche le menu de l espace client', async () => {
    afficher('/catalogue')
    const menu = await screen.findByRole('navigation', { name: 'Menu principal' })
    for (const nom of ['Catalogue', 'Mes demandes', 'Panier', 'Connexion']) {
      expect(within(menu).getByRole('link', { name: nom })).toBeInTheDocument()
    }
  })
})

describe('routes de l espace responsable', () => {
  const responsable = {
    id: 'u-2',
    nom: 'Responsable',
    email: 'responsable@librairie.pf',
    role: 'responsable',
  }

  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  function connecter(utilisateur: object) {
    localStorage.setItem('token', crypto.randomUUID())
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ utilisateur })))
  }

  it('envoie vers la connexion un visiteur qui ouvre l espace admin', async () => {
    afficher('/admin/stock')
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
  })

  it('affiche le tableau de bord au responsable connecté', async () => {
    connecter(responsable)
    afficher('/admin')
    expect(await screen.findByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument()
  })

  it.each([
    ['/admin/catalogue', 'Catalogue et prix'],
    ['/admin/stock', 'Stock et mouvements'],
    ['/admin/ventes', 'Ventes et retours'],
    ['/admin/demandes', 'Demandes et mises de côté'],
    ['/admin/commandes', 'Fournisseurs, commandes et réceptions'],
    ['/admin/rapports', 'Réapprovisionnement et rapports'],
    ['/admin/parametres', 'Paramètres'],
  ])('affiche la page %s au responsable', async (url, titre) => {
    connecter(responsable)
    afficher(url)
    expect(await screen.findByRole('heading', { name: titre })).toBeInTheDocument()
  })

  it('renvoie un client connecté vers le catalogue', async () => {
    connecter({ ...responsable, role: 'client' })
    afficher('/admin')
    expect(await screen.findByRole('heading', { name: 'Catalogue' })).toBeInTheDocument()
  })

  it('affiche une page introuvable dans l espace admin', async () => {
    connecter(responsable)
    afficher('/admin/inconnue')
    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Menu responsable' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour au tableau de bord' })).toHaveAttribute('href', '/admin')
  })
})
