import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Utilisateur } from '../types/utilisateur'
import {
  connexion,
  deconnexion,
  inscription,
  lireToken,
  utilisateurConnecte,
} from './authService'

const client: Utilisateur = {
  id: 'u-1',
  nom: 'Tiare',
  email: 'tiare@exemple.pf',
  role: 'client',
}

const token = crypto.randomUUID()

function reponse(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

describe('service d authentification', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('connecte le client, garde le token et renvoie l utilisateur', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(reponse({ utilisateur: client, token }))
    const donnees = { email: 'tiare@exemple.pf', motDePasse: 'motdepasse1' }

    await expect(connexion(donnees)).resolves.toEqual(client)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/connexion')
    expect(options?.method).toBe('POST')
    expect(options?.body).toBe(JSON.stringify(donnees))
    expect(lireToken()).toBe(token)
  })

  it('connecte le responsable avec la même route', async () => {
    const responsable: Utilisateur = {
      id: 'u-2',
      nom: 'Responsable',
      email: 'responsable@librairie.pf',
      role: 'responsable',
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      reponse({ utilisateur: responsable, token }),
    )

    const connecte = await connexion({
      email: 'responsable@librairie.pf',
      motDePasse: 'motdepasse1',
    })

    expect(connecte.role).toBe('responsable')
  })

  it('refuse des identifiants invalides sans garder de token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      reponse(
        { code: 'IDENTIFIANTS_INVALIDES', message: 'E-mail ou mot de passe incorrect.' },
        401,
      ),
    )

    await expect(
      connexion({ email: 'tiare@exemple.pf', motDePasse: 'mauvais' }),
    ).rejects.toMatchObject({
      code: 'IDENTIFIANTS_INVALIDES',
      message: 'E-mail ou mot de passe incorrect.',
    })
    expect(lireToken()).toBeNull()
  })

  it('inscrit le client et le connecte', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(reponse({ utilisateur: client, token }, 201))
    const donnees = {
      nom: 'Tiare',
      email: 'tiare@exemple.pf',
      motDePasse: 'motdepasse1',
    }

    await expect(inscription(donnees)).resolves.toEqual(client)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/inscription')
    expect(options?.method).toBe('POST')
    expect(options?.body).toBe(JSON.stringify(donnees))
    expect(lireToken()).toBe(token)
  })

  it('remonte l erreur quand l e-mail est déjà utilisé', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      reponse(
        {
          code: 'EMAIL_DEJA_UTILISE',
          message: 'Cette adresse e-mail est déjà utilisée.',
          details: { champs: { email: 'Cette adresse e-mail est déjà utilisée.' } },
        },
        409,
      ),
    )

    await expect(
      inscription({
        nom: 'Tiare',
        email: 'tiare@exemple.pf',
        motDePasse: 'motdepasse1',
      }),
    ).rejects.toMatchObject({ code: 'EMAIL_DEJA_UTILISE' })
    expect(lireToken()).toBeNull()
  })

  it('récupère l utilisateur connecté avec le token', async () => {
    localStorage.setItem('token', token)
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(reponse({ utilisateur: client }))

    await expect(utilisateurConnecte()).resolves.toEqual(client)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/moi')
    expect(options?.method).toBe('GET')
    expect(new Headers(options?.headers).get('Authorization')).toBe(`Bearer ${token}`)
  })

  it('supprime le token à la déconnexion', () => {
    localStorage.setItem('token', token)

    deconnexion()

    expect(lireToken()).toBeNull()
  })
})
