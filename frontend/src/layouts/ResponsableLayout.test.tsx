import { fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../contexts/useAuth'
import type { Utilisateur } from '../types/utilisateur'
import ResponsableLayout from './ResponsableLayout.tsx'

const responsable: Utilisateur = {
  id: 'u-2',
  nom: 'Responsable',
  email: 'responsable@librairie.pf',
  role: 'responsable',
}

function afficher(url: string, session: Partial<AuthContextValue>) {
  const valeur: AuthContextValue = {
    utilisateur: responsable,
    chargement: false,
    connexion: () => Promise.reject(new Error('non utilisé')),
    inscription: () => Promise.reject(new Error('non utilisé')),
    deconnexion: () => {},
    ...session,
  }
  const router = createMemoryRouter(
    [
      { path: '/connexion', element: <h1>Connexion</h1> },
      {
        path: '/admin',
        element: <ResponsableLayout />,
        children: [
          { index: true, element: <h1>Tableau de bord</h1> },
          { path: 'stock', element: <h1>Stock et mouvements</h1> },
        ],
      },
    ],
    { initialEntries: [url] },
  )
  render(
    <AuthContext value={valeur}>
      <RouterProvider router={router} />
    </AuthContext>,
  )
}

function menu() {
  return within(screen.getByRole('navigation', { name: 'Menu responsable' }))
}

describe('cadre de l espace responsable', () => {
  it('propose un lien vers chaque écran du responsable', () => {
    afficher('/admin', {})

    const noms = [
      'Tableau de bord',
      'Catalogue',
      'Stock',
      'Ventes et retours',
      'Demandes',
      'Commandes',
      'Rapports',
      'Paramètres',
    ]
    for (const nom of noms) {
      expect(menu().getByRole('link', { name: nom })).toBeInTheDocument()
    }
  })

  it('marque seulement la page ouverte dans le menu', () => {
    afficher('/admin/stock', {})

    expect(menu().getByRole('link', { name: 'Stock' })).toHaveAttribute('aria-current', 'page')
    expect(menu().getByRole('link', { name: 'Tableau de bord' })).not.toHaveAttribute('aria-current')
  })

  it('affiche le nom du responsable connecté', () => {
    afficher('/admin', {})

    expect(screen.getByText('Responsable')).toBeInTheDocument()
  })

  it('déconnecte le responsable et le ramène à la connexion', async () => {
    const deconnexion = vi.fn()
    afficher('/admin/stock', { deconnexion })

    fireEvent.click(screen.getByRole('button', { name: 'Déconnexion' }))

    expect(deconnexion).toHaveBeenCalledOnce()
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
  })
})
