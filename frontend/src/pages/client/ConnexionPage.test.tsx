import { fireEvent, render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../contexts/AuthContext.tsx'
import type { Utilisateur } from '../../types/utilisateur'
import ConnexionPage from './ConnexionPage.tsx'

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

function reponse(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

function afficher(depuis?: string) {
  const router = createMemoryRouter(
    [
      { path: '/connexion', element: <ConnexionPage /> },
      { path: '/catalogue', element: <h1>Catalogue</h1> },
      { path: '/demandes', element: <h1>Mes demandes</h1> },
      { path: '/admin', element: <h1>Tableau de bord</h1> },
      { path: '/inscription', element: <h1>Inscription</h1> },
    ],
    { initialEntries: [{ pathname: '/connexion', state: depuis ? { depuis } : null }] },
  )
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

function seConnecter(email: string, motDePasse: string) {
  fireEvent.change(screen.getByLabelText('Adresse e-mail'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: motDePasse } })
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
}

describe('page de connexion', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('affiche le formulaire et les liens de la maquette', () => {
    afficher()

    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expect(document.title).toBe('Connexion · Feuillet')
    expect(screen.getByLabelText('Adresse e-mail')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('link', { name: 'Continuer en tant qu\'invité' })).toHaveAttribute(
      'href',
      '/catalogue',
    )
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute(
      'href',
      '/inscription',
    )
  })

  it('envoie l e-mail et le mot de passe puis amène le client au catalogue', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(reponse({ utilisateur: client, token: crypto.randomUUID() }))
    afficher()

    seConnecter('tiare@exemple.pf', 'motdepasse1')

    expect(await screen.findByRole('heading', { name: 'Catalogue' })).toBeInTheDocument()
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/connexion')
    expect(options?.body).toBe(
      JSON.stringify({ email: 'tiare@exemple.pf', motDePasse: 'motdepasse1' }),
    )
  })

  it('amène le responsable dans l espace admin', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      reponse({ utilisateur: responsable, token: crypto.randomUUID() }),
    )
    afficher()

    seConnecter('responsable@librairie.pf', 'motdepasse1')

    expect(await screen.findByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument()
  })

  it('ramène le client sur la page qu il voulait ouvrir', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      reponse({ utilisateur: client, token: crypto.randomUUID() }),
    )
    afficher('/demandes')

    seConnecter('tiare@exemple.pf', 'motdepasse1')

    expect(await screen.findByRole('heading', { name: 'Mes demandes' })).toBeInTheDocument()
  })

  it('affiche le message du serveur quand les identifiants sont faux', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      reponse(
        { code: 'IDENTIFIANTS_INVALIDES', message: 'E-mail ou mot de passe incorrect.' },
        401,
      ),
    )
    afficher()

    seConnecter('tiare@exemple.pf', 'mauvais')

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou mot de passe incorrect.')
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
  })

  it('affiche les erreurs du serveur sous chaque champ', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      reponse(
        {
          code: 'VALIDATION',
          message: 'Certains champs sont invalides.',
          details: {
            champs: {
              email: 'L\'adresse e-mail est obligatoire.',
              motDePasse: 'Le mot de passe est obligatoire.',
            },
          },
        },
        400,
      ),
    )
    afficher()

    seConnecter('', '')

    expect(await screen.findByText('L\'adresse e-mail est obligatoire.')).toBeInTheDocument()
    expect(screen.getByText('Le mot de passe est obligatoire.')).toBeInTheDocument()
    expect(screen.getByLabelText('Adresse e-mail')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('prévient quand le serveur est injoignable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))
    afficher()

    seConnecter('tiare@exemple.pf', 'motdepasse1')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de joindre le serveur. Vérifiez votre connexion.',
    )
  })

  it('bloque le bouton pendant l envoi', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}))
    afficher()

    seConnecter('tiare@exemple.pf', 'motdepasse1')

    expect(await screen.findByRole('button', { name: 'Se connecter' })).toBeDisabled()
  })
})
