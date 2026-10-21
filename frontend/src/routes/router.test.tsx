import { render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../contexts/AuthContext.tsx'
import { routes } from './router.tsx'

function afficher(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

describe('routes de l espace client', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('redirige la racine vers le catalogue', async () => {
    afficher('/')
    expect(await screen.findByRole('heading', { name: 'Catalogue' })).toBeInTheDocument()
  })

  it('affiche la fiche du produit demandé', async () => {
    afficher('/produits/42')
    expect(await screen.findByRole('heading', { name: 'Produit 42' })).toBeInTheDocument()
  })

  it('affiche une page introuvable pour une adresse inconnue', async () => {
    afficher('/adresse-inconnue')
    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour au catalogue' })).toHaveAttribute('href', '/catalogue')
  })

  it('envoie vers la connexion un visiteur qui ouvre ses demandes', async () => {
    afficher('/demandes')
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
    ['/admin/ventes', 'Ventes et retours au comptoir'],
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
