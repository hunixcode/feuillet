import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Utilisateur } from '../types/utilisateur'
import { AuthProvider } from './AuthContext.tsx'
import { useAuth } from './useAuth'

const client: Utilisateur = {
  id: 'u-1',
  nom: 'Tiare',
  email: 'tiare@exemple.pf',
  role: 'client',
}

const token = ['jeton', 'test'].join('-')

function reponse(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

function afficher() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider })
}

describe('contexte d authentification', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('démarre sans utilisateur et sans appel réseau quand il n y a pas de token', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    const { result } = afficher()

    expect(result.current.utilisateur).toBeNull()
    expect(result.current.chargement).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('retrouve l utilisateur quand un token est déjà enregistré', async () => {
    localStorage.setItem('token', token)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse({ utilisateur: client }))

    const { result } = afficher()

    expect(result.current.chargement).toBe(true)
    await waitFor(() => expect(result.current.chargement).toBe(false))
    expect(result.current.utilisateur).toEqual(client)
  })

  it('supprime un token refusé par le serveur', async () => {
    localStorage.setItem('token', token)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      reponse({ code: 'NON_AUTHENTIFIE', message: 'Session expirée.' }, 401),
    )

    const { result } = afficher()

    await waitFor(() => expect(result.current.chargement).toBe(false))
    expect(result.current.utilisateur).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('garde le token si le serveur est injoignable', async () => {
    localStorage.setItem('token', token)
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))

    const { result } = afficher()

    await waitFor(() => expect(result.current.chargement).toBe(false))
    expect(result.current.utilisateur).toBeNull()
    expect(localStorage.getItem('token')).toBe(token)
  })

  it('met à jour l utilisateur après la connexion', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse({ utilisateur: client, token }))
    const { result } = afficher()

    let connecte: Utilisateur | undefined
    await act(async () => {
      connecte = await result.current.connexion({
        email: 'tiare@exemple.pf',
        motDePasse: 'motdepasse1',
      })
    })

    expect(connecte).toEqual(client)
    expect(result.current.utilisateur).toEqual(client)
  })

  it('reste sans utilisateur si la connexion échoue', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      reponse(
        { code: 'IDENTIFIANTS_INVALIDES', message: 'E-mail ou mot de passe incorrect.' },
        401,
      ),
    )
    const { result } = afficher()

    await act(async () => {
      await expect(
        result.current.connexion({ email: 'tiare@exemple.pf', motDePasse: 'mauvais' }),
      ).rejects.toMatchObject({ code: 'IDENTIFIANTS_INVALIDES' })
    })

    expect(result.current.utilisateur).toBeNull()
  })

  it('met à jour l utilisateur après l inscription', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse({ utilisateur: client, token }, 201))
    const { result } = afficher()

    await act(async () => {
      await result.current.inscription({
        nom: 'Tiare',
        email: 'tiare@exemple.pf',
        motDePasse: 'motdepasse1',
      })
    })

    expect(result.current.utilisateur).toEqual(client)
    expect(localStorage.getItem('token')).toBe(token)
  })

  it('oublie l utilisateur et le token à la déconnexion', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse({ utilisateur: client, token }))
    const { result } = afficher()
    await act(async () => {
      await result.current.connexion({ email: 'tiare@exemple.pf', motDePasse: 'motdepasse1' })
    })

    act(() => {
      result.current.deconnexion()
    })

    expect(result.current.utilisateur).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('signale une utilisation en dehors du fournisseur', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth doit être utilisé dans un AuthProvider.',
    )
  })
})
