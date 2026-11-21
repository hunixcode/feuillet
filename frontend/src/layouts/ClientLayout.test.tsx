import { fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PanierProvider } from '../contexts/PanierContext.tsx'
import { AuthContext, type AuthContextValue } from '../contexts/useAuth'
import type { Utilisateur } from '../types/utilisateur'
import ClientLayout from './ClientLayout.tsx'

const client: Utilisateur = {
  id: 'u-1',
  nom: 'Tiare',
  email: 'tiare@exemple.pf',
  role: 'client',
}

function afficher(url: string, session: Partial<AuthContextValue>) {
  const valeur: AuthContextValue = {
    utilisateur: null,
    chargement: false,
    connexion: () => Promise.reject(new Error('non utilisé')),
    inscription: () => Promise.reject(new Error('non utilisé')),
    deconnexion: () => {},
    ...session,
  }
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <ClientLayout />,
        children: [
          { path: 'catalogue', element: <h1>Catalogue</h1> },
          { path: 'demandes', element: <h1>Mes demandes</h1> },
        ],
      },
    ],
    { initialEntries: [url] },
  )
  render(
    <AuthContext value={valeur}>
      <PanierProvider>
        <RouterProvider router={router} />
      </PanierProvider>
    </AuthContext>,
  )
  return within(document.querySelector('header.entete') as HTMLElement)
}

describe('en-tête de l espace client', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('n affiche pas de compteur quand le panier est vide', () => {
    const menu = afficher('/catalogue', {})

    expect(menu.getByRole('link', { name: 'Panier' })).toHaveAttribute('href', '/panier')
  })

  it('affiche le nombre d articles du panier', () => {
    localStorage.setItem(
      'panier',
      JSON.stringify([
        { produitId: 'p-1', quantite: 2 },
        { produitId: 'p-2', quantite: 1 },
      ]),
    )

    const menu = afficher('/catalogue', {})

    expect(menu.getByRole('link', { name: 'Panier, 3 articles' })).toHaveAttribute(
      'href',
      '/panier',
    )
  })

  it('propose la connexion à un visiteur', () => {
    const menu = afficher('/catalogue', {})

    expect(menu.getByRole('link', { name: 'Connexion' })).toBeInTheDocument()
    expect(menu.queryByRole('button', { name: 'Déconnexion' })).not.toBeInTheDocument()
  })

  it('affiche le nom du client connecté et le bouton de déconnexion', () => {
    const menu = afficher('/catalogue', { utilisateur: client })

    expect(menu.getByText('Tiare')).toBeInTheDocument()
    expect(menu.getByRole('button', { name: 'Déconnexion' })).toBeInTheDocument()
    expect(menu.queryByRole('link', { name: 'Connexion' })).not.toBeInTheDocument()
  })

  it('propose au responsable de revenir à son espace', () => {
    const menu = afficher('/catalogue', { utilisateur: { ...client, role: 'responsable' } })

    expect(menu.getByRole('link', { name: 'Espace responsable' })).toHaveAttribute('href', '/admin')
  })

  it('ne propose pas l espace responsable à un client', () => {
    const menu = afficher('/catalogue', { utilisateur: client })

    expect(menu.queryByRole('link', { name: 'Espace responsable' })).not.toBeInTheDocument()
  })

  it('n affiche ni connexion ni déconnexion pendant la vérification de la session', () => {
    const menu = afficher('/catalogue', { chargement: true })

    expect(menu.queryByRole('link', { name: 'Connexion' })).not.toBeInTheDocument()
    expect(menu.queryByRole('button', { name: 'Déconnexion' })).not.toBeInTheDocument()
  })

  it('déconnecte le client et le ramène au catalogue', async () => {
    const deconnexion = vi.fn()
    const menu = afficher('/demandes', { utilisateur: client, deconnexion })

    fireEvent.click(menu.getByRole('button', { name: 'Déconnexion' }))

    expect(deconnexion).toHaveBeenCalledOnce()
    expect(await screen.findByRole('heading', { name: 'Catalogue' })).toBeInTheDocument()
  })

  it('présente la librairie en ligne dans le pied de page, sans adresse de magasin', () => {
    afficher('/catalogue', {})
    const pied = within(screen.getByRole('contentinfo'))

    expect(pied.getByText('Librairie en ligne')).toBeInTheDocument()
    expect(pied.getByRole('link', { name: 'Demander un livre' })).toHaveAttribute('href', '/demandes')
    expect(screen.getByRole('contentinfo')).not.toHaveTextContent(/Papeete/)
  })
})
