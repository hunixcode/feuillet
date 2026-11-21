import { fireEvent, render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../contexts/AuthContext.tsx'
import type { Utilisateur } from '../../types/utilisateur'
import InscriptionPage from './InscriptionPage.tsx'

const client: Utilisateur = {
  id: 'u-1',
  nom: 'Tiare',
  email: 'tiare@exemple.pf',
  role: 'client',
}

function reponse(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

function afficher(depuis?: string) {
  const router = createMemoryRouter(
    [
      { path: '/inscription', element: <InscriptionPage /> },
      { path: '/connexion', element: <h1>Connexion</h1> },
      { path: '/catalogue', element: <h1>Catalogue</h1> },
    ],
    { initialEntries: [{ pathname: '/inscription', state: depuis ? { depuis } : null }] },
  )
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

function creerCompte(nom: string, email: string, motDePasse: string) {
  fireEvent.change(screen.getByLabelText('Nom complet'), { target: { value: nom } })
  fireEvent.change(screen.getByLabelText('Adresse e-mail'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: motDePasse } })
  fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))
}

describe('page d inscription', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('affiche le formulaire et les liens de la maquette', () => {
    afficher()

    expect(screen.getByRole('heading', { name: 'Créer un compte' })).toBeInTheDocument()
    expect(document.title).toBe('Créer un compte · Feuillet')
    expect(screen.getByLabelText('Nom complet')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Adresse e-mail')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByText('8 caractères minimum.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
      'href',
      '/connexion',
    )
  })

  it('envoie le nom, l e-mail et le mot de passe puis confirme la création du compte', async () => {
    const token = crypto.randomUUID()
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(reponse({ utilisateur: client, token }, 201))
    afficher()

    creerCompte('Tiare', 'tiare@exemple.pf', 'motdepasse1')

    expect(await screen.findByRole('heading', { name: 'Bienvenue, Tiare' })).toBeInTheDocument()
    expect(document.title).toBe('Compte créé · Feuillet')
    expect(screen.getByRole('status')).toHaveTextContent('Votre compte est créé.')
    expect(screen.getByRole('link', { name: 'Continuer' })).toHaveAttribute('href', '/catalogue')
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/inscription')
    expect(options?.body).toBe(
      JSON.stringify({ nom: 'Tiare', email: 'tiare@exemple.pf', motDePasse: 'motdepasse1' }),
    )
    expect(localStorage.getItem('token')).toBe(token)
  })

  it('propose de revenir sur la page que le client voulait ouvrir', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      reponse({ utilisateur: client, token: crypto.randomUUID() }, 201),
    )
    afficher('/demandes')

    creerCompte('Tiare', 'tiare@exemple.pf', 'motdepasse1')

    expect(await screen.findByRole('link', { name: 'Continuer' })).toHaveAttribute(
      'href',
      '/demandes',
    )
  })

  it('affiche les erreurs du serveur sous chaque champ', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      reponse(
        {
          code: 'VALIDATION',
          message: 'Certains champs sont invalides.',
          details: {
            champs: {
              nom: 'Le nom est obligatoire.',
              email: 'L\'adresse e-mail n\'est pas valide.',
              motDePasse: 'Le mot de passe doit contenir au moins 8 caractères.',
            },
          },
        },
        400,
      ),
    )
    afficher()

    creerCompte('', 'tiare', 'court')

    expect(await screen.findByText('Le nom est obligatoire.')).toBeInTheDocument()
    expect(screen.getByText('L\'adresse e-mail n\'est pas valide.')).toBeInTheDocument()
    expect(
      screen.getByText('Le mot de passe doit contenir au moins 8 caractères.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Nom complet')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('signale une adresse e-mail déjà utilisée sous le champ e-mail', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      reponse(
        {
          code: 'EMAIL_DEJA_UTILISE',
          message: 'Un compte existe déjà avec cette adresse e-mail.',
          details: { champs: { email: 'Cette adresse e-mail est déjà utilisée.' } },
        },
        409,
      ),
    )
    afficher()

    creerCompte('Tiare', 'tiare@exemple.pf', 'motdepasse1')

    expect(await screen.findByText('Cette adresse e-mail est déjà utilisée.')).toBeInTheDocument()
    expect(screen.getByLabelText('Adresse e-mail')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('heading', { name: 'Créer un compte' })).toBeInTheDocument()
  })

  it('prévient quand le serveur est injoignable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))
    afficher()

    creerCompte('Tiare', 'tiare@exemple.pf', 'motdepasse1')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de joindre le serveur. Vérifiez votre connexion.',
    )
  })

  it('bloque le bouton pendant l envoi', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}))
    afficher()

    creerCompte('Tiare', 'tiare@exemple.pf', 'motdepasse1')

    expect(await screen.findByRole('button', { name: 'Créer mon compte' })).toBeDisabled()
  })
})
