import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../contexts/AuthContext.tsx'
import { AuthContext, type AuthContextValue } from '../contexts/useAuth'
import type { Utilisateur } from '../types/utilisateur'
import ProtectedRoute from './ProtectedRoute.tsx'

const client: Utilisateur = {
  id: 'u-1',
  nom: 'Tiare',
  email: 'tiare@exemple.pf',
  role: 'client',
}

const responsable: Utilisateur = {
  id: 'u-2',
  nom: 'Responsable',
  email: 'responsable@librairie.pf',
  role: 'responsable',
}

function creerRouter(url: string) {
  return createMemoryRouter(
    [
      { path: '/connexion', element: <h1>Connexion</h1> },
      { path: '/catalogue', element: <h1>Catalogue</h1> },
      {
        element: <ProtectedRoute role="client" />,
        children: [{ path: '/demandes', element: <h1>Mes demandes</h1> }],
      },
      {
        element: <ProtectedRoute role="responsable" />,
        children: [{ path: '/responsable', element: <h1>Tableau de bord</h1> }],
      },
    ],
    { initialEntries: [url] },
  )
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
  const router = creerRouter(url)
  render(
    <AuthContext value={valeur}>
      <RouterProvider router={router} />
    </AuthContext>,
  )
  return router
}

describe('route protégée', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('attend la vérification de la session', () => {
    afficher('/demandes', { chargement: true })

    expect(screen.getByRole('status')).toHaveTextContent('Vérification de la session…')
  })

  it('envoie un visiteur vers la connexion en gardant la page demandée', async () => {
    const router = afficher('/demandes', {})

    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expect(router.state.location.state).toEqual({ depuis: '/demandes' })
  })

  it('affiche la page au client connecté', async () => {
    afficher('/demandes', { utilisateur: client })

    expect(await screen.findByRole('heading', { name: 'Mes demandes' })).toBeInTheDocument()
  })

  it('renvoie le responsable vers son espace depuis une page client', async () => {
    afficher('/demandes', { utilisateur: responsable })

    expect(await screen.findByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument()
  })

  it('renvoie le client vers le catalogue depuis l espace responsable', async () => {
    afficher('/responsable', { utilisateur: client })

    expect(await screen.findByRole('heading', { name: 'Catalogue' })).toBeInTheDocument()
  })

  it('envoie un visiteur de l espace responsable vers la connexion', async () => {
    const router = afficher('/responsable', {})

    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expect(router.state.location.state).toEqual({ depuis: '/responsable' })
  })

  it('affiche l espace responsable quand le token de session est déjà enregistré', async () => {
    localStorage.setItem('token', crypto.randomUUID())
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ utilisateur: responsable })),
    )

    render(
      <AuthProvider>
        <RouterProvider router={creerRouter('/responsable')} />
      </AuthProvider>,
    )

    expect(await screen.findByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument()
  })
})
