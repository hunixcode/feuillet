import { fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
      { path: '/', element: <h1>Accueil de la boutique</h1> },
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
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('propose un lien vers chaque écran du responsable', () => {
    afficher('/admin', {})

    const noms = [
      'Tableau de bord',
      'Ventes et retours',
      'Demandes',
      'Catalogue et prix',
      'Stock et mouvements',
      'Fournisseurs',
      'Rapports',
      'Paramètres',
    ]
    for (const nom of noms) {
      expect(menu().getByRole('link', { name: nom })).toBeInTheDocument()
    }
  })

  it('marque seulement la page ouverte dans le menu', () => {
    afficher('/admin/stock', {})

    expect(menu().getByRole('link', { name: 'Stock et mouvements' })).toHaveAttribute('aria-current', 'page')
    expect(menu().getByRole('link', { name: 'Tableau de bord' })).not.toHaveAttribute('aria-current')
  })

  it('ramène au tableau de bord par le logo et à la boutique par son lien, sans déconnecter', async () => {
    const deconnexion = vi.fn()
    afficher('/admin/stock', { deconnexion })

    fireEvent.click(screen.getByRole('link', { name: 'Feuillet' }))
    expect(await screen.findByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Voir la boutique' }))
    expect(await screen.findByRole('heading', { name: 'Accueil de la boutique' })).toBeInTheDocument()
    expect(deconnexion).not.toHaveBeenCalled()
  })

  it('affiche le nom du responsable connecté', () => {
    afficher('/admin', {})

    expect(screen.getByText('Responsable')).toBeInTheDocument()
  })

  it('déconnecte le responsable et le ramène à la connexion', async () => {
    const deconnexion = vi.fn()
    afficher('/admin/stock', { deconnexion })

    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))

    expect(deconnexion).toHaveBeenCalledOnce()
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
  })

  it('garde l apparence choisie : claire, sombre ou celle du système', () => {
    afficher('/admin', {})
    const cadre = document.querySelector('.espace-responsable') as HTMLElement

    expect(cadre).not.toHaveAttribute('data-apparence')
    fireEvent.click(screen.getByRole('button', { name: 'Apparence sombre' }))

    expect(cadre).toHaveAttribute('data-apparence', 'sombre')
    expect(screen.getByRole('button', { name: 'Apparence sombre' })).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem('feuillet-apparence')).toBe('sombre')

    fireEvent.click(screen.getByRole('button', { name: 'Apparence du système' }))
    expect(cadre).not.toHaveAttribute('data-apparence')
  })

  it('compte les ventes à préparer et les demandes en attente dans le menu', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree) => {
      const url = String(entree)
      const corps = url.includes('/ventes?statut=a_preparer') ? [{ id: 'v-1' }, { id: 'v-2' }] : url.includes('/demandes?statut=en_attente') ? [{ id: 'd-1' }] : []
      return new Response(JSON.stringify(corps), { status: 200 })
    })
    afficher('/admin', {})

    expect(await menu().findByRole('link', { name: 'Ventes et retours, 2 en attente' })).toBeInTheDocument()
    expect(menu().getByRole('link', { name: 'Demandes, 1 en attente' })).toBeInTheDocument()
  })

  it('ouvre la recherche par Ctrl K, par la touche / ou par le bouton, et la ferme avec Échap', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('[]', { status: 200 }))
    afficher('/admin', {})
    const cadre = document.querySelector('.espace-responsable') as HTMLElement

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    expect(screen.getByRole('dialog', { name: 'Rechercher partout' })).toBeInTheDocument()
    expect(cadre).toHaveClass('palette-ouverte')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(cadre).not.toHaveClass('palette-ouverte')

    fireEvent.keyDown(document.body, { key: '/' })
    expect(screen.getByRole('dialog', { name: 'Rechercher partout' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'K', metaKey: true })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Rechercher partout, raccourci Ctrl K' }))
    expect(screen.getByRole('searchbox', { name: 'Rechercher partout' })).toHaveFocus()
  })
})
