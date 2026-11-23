import { fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Vente } from '../../types/vente'
import CommandePage from './CommandePage.tsx'

const vente: Vente = {
  id: 'v-1',
  date: '2026-11-12T20:00:00.000Z',
  statut: 'a_preparer',
  client: { id: 'u-1', nom: 'Tiare', email: 'tiare@exemple.pf' },
  lignes: [
    {
      produitId: 'p-1',
      quantite: 2,
      reference: 'LIV-001',
      designation: 'L\'Île au trésor',
      prixUnitaire: 1530,
      remise: 15,
      tauxTva: 5,
      montant: 3060,
      montantTva: 146,
    },
  ],
  occasionCadeau: 'noel',
  emballageCadeau: true,
  adresseLivraison: '12 rue des Remparts, Papeete',
  sousTotal: 3060,
  fraisEmballage: 300,
  fraisLivraison: 800,
  frais: 1100,
  montantTva: 146,
  total: 4160,
}

function reponse(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

function afficher(state?: unknown) {
  const router = createMemoryRouter(
    [
      { path: '/commandes/:id', element: <CommandePage /> },
      { path: '/catalogue', element: <h1>Catalogue</h1> },
    ],
    { initialEntries: [{ pathname: '/commandes/v-1', state }] },
  )
  render(<RouterProvider router={router} />)
}

describe('page d une commande', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('confirme la commande avec ses articles et les montants de la librairie', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponse(vente))
    afficher({ confirmee: true })

    expect(await screen.findByRole('heading', { name: 'Commande confirmée' })).toBeInTheDocument()
    expect(document.title).toBe('Commande confirmée · Feuillet')
    expect(screen.getByText(/Merci Tiare, votre commande est enregistrée/)).toBeInTheDocument()
    expect(screen.getByText('À préparer')).toBeInTheDocument()
    expect(screen.getByText('L\'Île au trésor')).toBeInTheDocument()
    expect(screen.getByText('2 × 1 530 XPF, remise de 15 %')).toBeInTheDocument()
    expect(screen.getByText('12 rue des Remparts, Papeete')).toBeInTheDocument()
    expect(screen.getByText('Cadeau pour : Noël, Emballage cadeau')).toBeInTheDocument()
    const montants = within(screen.getByRole('complementary', { name: 'Montants' }))
    expect(montants.getByText('Total TTC').nextElementSibling).toHaveTextContent('4 160 XPF')
    expect(montants.getByText('Emballage cadeau').nextElementSibling).toHaveTextContent('300 XPF')
    expect(montants.getByText('dont TVA').nextElementSibling).toHaveTextContent('146 XPF')
    expect(fetchMock).toHaveBeenCalledWith('/api/commandes/v-1', expect.any(Object))
  })

  it('affiche une commande expédiée sans message de confirmation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      reponse({
        ...vente,
        statut: 'expediee',
        dateExpedition: '2026-11-13T20:00:00.000Z',
        occasionCadeau: undefined,
        emballageCadeau: false,
        fraisEmballage: 0,
      }),
    )
    afficher()

    expect(
      await screen.findByRole('heading', { name: 'Commande du 12 novembre 2026' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Expédiée le 13 novembre 2026')).toBeInTheDocument()
    expect(screen.queryByText(/Merci/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Cadeau pour/)).not.toBeInTheDocument()
  })

  it('affiche les détails de livraison ligne par ligne', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      reponse({
        ...vente,
        adresseLivraison: 'Tiare\nTél. 87 12 34 56\n12 rue des Remparts\n98714 Pirae\nIndications : Portail bleu',
      }),
    )
    afficher()

    const livraison = within(await screen.findByRole('region', { name: 'Livraison' }))
    expect(livraison.getAllByText(/./, { selector: 'address span' }).map((ligne) => ligne.textContent)).toEqual([
      'Tiare',
      'Tél. 87 12 34 56',
      '12 rue des Remparts',
      '98714 Pirae',
      'Indications : Portail bleu',
    ])
  })

  it('indique une commande introuvable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      reponse({ code: 'INTROUVABLE', message: 'Commande introuvable.' }, 404),
    )
    afficher()

    expect(await screen.findByRole('heading', { name: 'Commande introuvable.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour au catalogue' })).toHaveAttribute(
      'href',
      '/catalogue',
    )
  })

  it('affiche une erreur réseau et permet de réessayer', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(reponse(vente))
    afficher()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de joindre le serveur. Vérifiez votre connexion.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(await screen.findByText('L\'Île au trésor')).toBeInTheDocument()
  })
})
