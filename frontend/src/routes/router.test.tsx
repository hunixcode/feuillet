import { render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
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
