import { fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Vente } from '../../types/vente'
import MesCommandesPage from './MesCommandesPage.tsx'

const ligne = {
  produitId: 'p-1',
  quantite: 2,
  reference: 'LIV-001',
  designation: 'L\'Île au trésor',
  prixUnitaire: 1530,
  remise: 15,
  tauxTva: 5,
  montant: 3060,
  montantTva: 146,
}

const recente: Vente = {
  id: 'v-2',
  date: '2026-11-12T20:00:00.000Z',
  statut: 'a_preparer',
  client: { id: 'u-1', nom: 'Tiare', email: 'tiare@exemple.pf' },
  lignes: [ligne, { ...ligne, produitId: 'p-2', quantite: 1 }],
  emballageCadeau: false,
  adresseLivraison: 'BP 12, Papeete',
  sousTotal: 4590,
  fraisEmballage: 0,
  fraisLivraison: 800,
  frais: 800,
  montantTva: 219,
  total: 5390,
}

const ancienne: Vente = {
  ...recente,
  id: 'v-1',
  date: '2026-11-02T20:00:00.000Z',
  statut: 'expediee',
  dateExpedition: '2026-11-03T20:00:00.000Z',
  lignes: [{ ...ligne, quantite: 1 }],
  total: 2330,
}

function reponse(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

function afficher() {
  const router = createMemoryRouter(
    [
      { path: '/commandes', element: <MesCommandesPage /> },
      { path: '/commandes/:id', element: <h1>Détail</h1> },
      { path: '/catalogue', element: <h1>Catalogue</h1> },
    ],
    { initialEntries: ['/commandes'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('page Mes commandes', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('liste les commandes avec leur date, leur total et leur statut', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse([recente, ancienne]))
    afficher()

    const premiere = await screen.findByRole('link', { name: /Commande du 12 novembre 2026/ })
    expect(document.title).toBe('Mes commandes · Feuillet')
    expect(screen.getByText('2 commandes')).toBeInTheDocument()
    expect(premiere).toHaveAttribute('href', '/commandes/v-2')
    expect(within(premiere).getByText('3 articles')).toBeInTheDocument()
    expect(within(premiere).getByText('5 390 XPF')).toBeInTheDocument()
    expect(within(premiere).getByText('À préparer')).toBeInTheDocument()
    const seconde = screen.getByRole('link', { name: /Commande du 2 novembre 2026/ })
    expect(within(seconde).getByText('1 article')).toBeInTheDocument()
    expect(within(seconde).getByText('Expédiée le 3 novembre 2026')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/commandes', expect.objectContaining({ method: 'GET' }))
  })

  it('ouvre le détail d une commande', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse([recente]))
    const router = afficher()

    fireEvent.click(await screen.findByRole('link', { name: /Commande du 12 novembre 2026/ }))

    expect(await screen.findByRole('heading', { name: 'Détail' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/commandes/v-2')
  })

  it('invite à parcourir le catalogue quand il n y a aucune commande', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse([]))
    afficher()

    expect(
      await screen.findByRole('heading', { name: 'Aucune commande pour l\'instant.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Parcourir le catalogue' })).toHaveAttribute(
      'href',
      '/catalogue',
    )
  })

  it('affiche une erreur réseau et permet de réessayer', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(reponse([recente]))
    afficher()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de joindre le serveur. Vérifiez votre connexion.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(
      await screen.findByRole('link', { name: /Commande du 12 novembre 2026/ }),
    ).toBeInTheDocument()
  })
})
