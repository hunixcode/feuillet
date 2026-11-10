import { fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PanierProvider } from '../../contexts/PanierContext.tsx'
import { AuthContext, type AuthContextValue } from '../../contexts/useAuth'
import type { Produit } from '../../types/produit'
import type { Utilisateur } from '../../types/utilisateur'
import PanierPage from './PanierPage.tsx'

const ile: Produit = {
  id: 'p-1',
  reference: 'LIV-001',
  designation: 'L\'Île au trésor',
  type: 'livre',
  categorie: 'roman',
  prix: 1800,
  tauxTva: 5,
  archive: false,
  auteur: 'Robert Louis Stevenson',
  prixApplique: 1530,
  promotion: { id: 'promo-1', remise: 15, debut: '2026-10-10', fin: '2026-10-31' },
  disponibilite: 'disponible',
}

const carnet: Produit = {
  id: 'p-2',
  reference: 'PAP-001',
  designation: 'Carnet ligné A5',
  type: 'papeterie',
  categorie: 'fournitures',
  prix: 650,
  tauxTva: 16,
  archive: false,
  marque: 'Clairefontaine',
  prixApplique: 650,
  disponibilite: 'disponible',
}

const client: Utilisateur = { id: 'u-1', nom: 'Tiare', email: 'tiare@exemple.pf', role: 'client' }

function reponse(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

function simulerApi(produits: Produit[]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree) => {
    const produit = produits.find((p) => String(entree) === `/api/produits/${p.id}`)
    return produit
      ? reponse(produit)
      : reponse({ code: 'INTROUVABLE', message: 'Produit introuvable.' }, 404)
  })
}

function remplirPanier(lignes: { produitId: string; quantite: number }[]) {
  localStorage.setItem('panier', JSON.stringify(lignes))
}

function panierEnregistre() {
  return JSON.parse(localStorage.getItem('panier') ?? '[]')
}

function afficher(session: Partial<AuthContextValue> = {}) {
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
      { path: '/panier', element: <PanierPage /> },
      { path: '/catalogue', element: <h1>Catalogue</h1> },
      { path: '/connexion', element: <h1>Connexion</h1> },
      { path: '/produits/:id', element: <h1>Fiche produit</h1> },
    ],
    { initialEntries: ['/panier'] },
  )
  render(
    <AuthContext value={valeur}>
      <PanierProvider>
        <RouterProvider router={router} />
      </PanierProvider>
    </AuthContext>,
  )
  return router
}

describe('page Panier', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('affiche un panier vide sans appeler le serveur', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    afficher()

    expect(document.title).toBe('Panier · Feuillet')
    expect(screen.getByText('0 article')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Votre panier est vide.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Parcourir le catalogue' })).toHaveAttribute(
      'href',
      '/catalogue',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('recharge les articles depuis l API et affiche leurs prix et quantités', async () => {
    remplirPanier([
      { produitId: 'p-1', quantite: 2 },
      { produitId: 'p-2', quantite: 1 },
    ])
    const fetchMock = simulerApi([ile, carnet])
    afficher()

    expect(screen.getByRole('status')).toHaveTextContent('Chargement du panier…')
    expect(await screen.findByRole('link', { name: 'L\'Île au trésor' })).toHaveAttribute(
      'href',
      '/produits/p-1',
    )
    expect(screen.getByText(/1 530 XPF l'unité au lieu de 1 800 XPF/)).toBeInTheDocument()
    expect(screen.getByText(/Clairefontaine, 650 XPF l'unité/)).toBeInTheDocument()
    expect(screen.getByLabelText('Quantité de L\'Île au trésor')).toHaveValue('2')
    expect(screen.getByText('3 articles')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/produits/p-1', expect.any(Object))
    expect(fetchMock).toHaveBeenCalledWith('/api/produits/p-2', expect.any(Object))
  })

  it('n appelle jamais une route de vente et laisse le back calculer les montants', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 1 }])
    const fetchMock = simulerApi([ile])
    afficher({ utilisateur: client })
    await screen.findByRole('link', { name: 'L\'Île au trésor' })

    const recap = within(screen.getByRole('complementary', { name: 'Récapitulatif' }))
    expect(recap.getByText('Calculé par la librairie')).toBeInTheDocument()
    expect(recap.getByText('Calculée par la librairie')).toBeInTheDocument()
    expect(screen.getByText(/Le panier ne réserve pas les articles/)).toBeInTheDocument()
    const urls = fetchMock.mock.calls.map(([entree]) => String(entree))
    expect(urls.every((url) => url.startsWith('/api/produits/'))).toBe(true)
  })

  it('change la quantité sans recharger les produits', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 1 }])
    const fetchMock = simulerApi([ile])
    afficher()
    await screen.findByRole('link', { name: 'L\'Île au trésor' })
    const appels = fetchMock.mock.calls.length

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un exemplaire' }))

    expect(screen.getByLabelText('Quantité de L\'Île au trésor')).toHaveValue('2')
    expect(screen.getByText('2 articles')).toBeInTheDocument()
    expect(panierEnregistre()).toEqual([{ produitId: 'p-1', quantite: 2 }])
    expect(fetchMock).toHaveBeenCalledTimes(appels)
  })

  it('retire un article du panier', async () => {
    remplirPanier([
      { produitId: 'p-1', quantite: 1 },
      { produitId: 'p-2', quantite: 1 },
    ])
    simulerApi([ile, carnet])
    afficher()
    await screen.findByRole('link', { name: 'L\'Île au trésor' })

    fireEvent.click(screen.getByRole('button', { name: 'Retirer L\'Île au trésor du panier' }))

    expect(screen.queryByRole('link', { name: 'L\'Île au trésor' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Carnet ligné A5' })).toBeInTheDocument()
    expect(panierEnregistre()).toEqual([{ produitId: 'p-2', quantite: 1 }])
  })

  it('signale un article devenu épuisé', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 1 }])
    simulerApi([{ ...ile, disponibilite: 'epuise' }])
    afficher()

    expect(
      await screen.findByText('Cet article est épuisé : retirez-le pour pouvoir commander.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Retirez les articles signalés pour pouvoir commander.')).toBeInTheDocument()
  })

  it('signale un article qui n existe plus dans le catalogue', async () => {
    remplirPanier([{ produitId: 'p-9', quantite: 1 }])
    simulerApi([])
    afficher()

    expect(await screen.findByText('Article retiré du catalogue')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retirer l\'article retiré du catalogue' }))
    expect(screen.getByRole('heading', { name: 'Votre panier est vide.' })).toBeInTheDocument()
  })

  it('affiche une erreur réseau et permet de réessayer', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 1 }])
    let appels = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      appels += 1
      if (appels === 1) {
        throw new TypeError('offline')
      }
      return reponse(ile)
    })
    afficher()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de joindre le serveur. Vérifiez votre connexion.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(await screen.findByRole('link', { name: 'L\'Île au trésor' })).toBeInTheDocument()
  })

  it('demande à un visiteur de se connecter et le ramènera au panier', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 1 }])
    simulerApi([ile])
    const router = afficher()
    await screen.findByRole('link', { name: 'L\'Île au trésor' })

    fireEvent.click(screen.getByRole('link', { name: 'Se connecter pour commander' }))

    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expect(router.state.location.state).toEqual({ depuis: '/panier' })
  })

  it('grise la confirmation pour un client en attendant le back', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 1 }])
    simulerApi([ile])
    afficher({ utilisateur: client })

    const bouton = await screen.findByRole('button', { name: 'Confirmer la commande' })
    expect(bouton).toBeDisabled()
    expect(bouton).toHaveAccessibleDescription(
      'La confirmation des commandes sera bientôt disponible.',
    )
  })

  it('indique au responsable qu il faut un compte client pour commander', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 1 }])
    simulerApi([ile])
    afficher({ utilisateur: { ...client, role: 'responsable' } })

    expect(
      await screen.findByText('Connectez-vous avec un compte client pour commander.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmer la commande' })).not.toBeInTheDocument()
  })

  it('propose les options cadeau, emballage et l adresse de livraison', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 1 }])
    simulerApi([ile])
    afficher({ utilisateur: client })
    await screen.findByRole('link', { name: 'L\'Île au trésor' })
    const recap = within(screen.getByRole('complementary', { name: 'Récapitulatif' }))

    expect(screen.queryByLabelText('Occasion')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /C'est un cadeau/ }))
    fireEvent.change(screen.getByLabelText('Occasion'), { target: { value: 'noel' } })
    expect(screen.getByLabelText('Occasion')).toHaveValue('noel')

    expect(recap.getByText('Aucun')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /Emballage cadeau/ }))
    expect(recap.getByText('Oui')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Adresse de livraison'), {
      target: { value: '12 rue des Remparts, Papeete' },
    })
    expect(screen.getByLabelText('Adresse de livraison')).toHaveValue('12 rue des Remparts, Papeete')
    expect(screen.queryByText(/retrait/i)).not.toBeInTheDocument()
  })
})
