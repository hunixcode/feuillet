import { fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Categorie } from '../../types/categorie'
import type { Produit } from '../../types/produit'
import ProduitPage from './ProduitPage.tsx'

const ecume: Produit = {
  id: 'p-1',
  reference: 'LIV-002',
  designation: 'L\'Écume des jours',
  type: 'livre',
  categorie: 'roman',
  prix: 1290,
  tauxTva: 5,
  archive: false,
  auteur: 'Boris Vian',
  isbn: '9782253140870',
  prixApplique: 1097,
  promotion: { id: 'promo-1', remise: 15, debut: '2026-10-10', fin: '2026-10-31' },
}

const magazine: Produit = {
  id: 'p-2',
  reference: 'MAG-001',
  designation: 'Lire magazine',
  type: 'magazine',
  categorie: 'revues',
  prix: 900,
  tauxTva: 5,
  archive: false,
  issn: '0399-0702',
  numero: 12,
  dateParution: '2026-10-01',
  prixApplique: 900,
}

const carnet: Produit = {
  id: 'p-3',
  reference: 'PAP-001',
  designation: 'Carnet ligné A5',
  type: 'papeterie',
  categorie: 'papeterie',
  prix: 650,
  tauxTva: 16,
  archive: false,
  marque: 'Clairefontaine',
  prixApplique: 650,
}

const categories: Categorie[] = [
  { id: 'papeterie', libelle: 'Papeterie' },
  { id: 'revues', libelle: 'Revues' },
  { id: 'roman', libelle: 'Roman' },
]

function reponse(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

function simulerApi(produit: Produit) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree) => {
    if (String(entree).startsWith('/api/categories')) {
      return reponse(categories)
    }
    return reponse(produit)
  })
}

function afficher(id: string) {
  const router = createMemoryRouter(
    [
      { path: '/produits/:id', element: <ProduitPage /> },
      { path: '/catalogue', element: <h1>Catalogue</h1> },
    ],
    { initialEntries: [`/produits/${id}`] },
  )
  render(<RouterProvider router={router} />)
}

function details() {
  return within(screen.getByText('Référence').closest('dl') as HTMLElement)
}

describe('fiche produit', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('charge le produit demandé puis affiche ses informations', async () => {
    const fetchMock = simulerApi(ecume)
    afficher('p-1')

    expect(screen.getByRole('status')).toHaveTextContent('Chargement de l\'article…')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'L\'Écume des jours' }),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/produits/p-1', expect.any(Object))
    expect(details().getByText('LIV-002')).toBeInTheDocument()
    expect(details().getByText('Roman')).toBeInTheDocument()
    expect(details().getByText('9782253140870')).toBeInTheDocument()
    expect(screen.getByText(/TVA de 5 % incluse\./)).toBeInTheDocument()
  })

  it('affiche le prix remisé, le prix barré, la remise et la fin de la promotion', async () => {
    simulerApi(ecume)
    afficher('p-1')

    expect(await screen.findByText('1 097 XPF')).toBeInTheDocument()
    expect(screen.getByText('1 290 XPF')).toBeInTheDocument()
    expect(screen.getByText('−15 %')).toBeInTheDocument()
    expect(screen.getByText(/Promotion valable jusqu'au 31 octobre 2026\./)).toBeInTheDocument()
  })

  it('affiche le prix sans promotion', async () => {
    simulerApi(carnet)
    afficher('p-3')

    expect(await screen.findByText('650 XPF')).toBeInTheDocument()
    expect(screen.queryByText(/Promotion valable/)).not.toBeInTheDocument()
    expect(screen.getByText(/TVA de 16 % incluse\./)).toBeInTheDocument()
  })

  it('affiche les champs propres à un magazine', async () => {
    simulerApi(magazine)
    afficher('p-2')

    await screen.findByRole('heading', { level: 1, name: 'Lire magazine' })
    expect(details().getByText('0399-0702')).toBeInTheDocument()
    expect(details().getByText('12')).toBeInTheDocument()
    expect(details().getByText('1 octobre 2026')).toBeInTheDocument()
  })

  it('affiche la marque d un article de papeterie', async () => {
    simulerApi(carnet)
    afficher('p-3')

    await screen.findByRole('heading', { level: 1, name: 'Carnet ligné A5' })
    expect(details().getByText('Marque')).toBeInTheDocument()
    expect(details().getByText('Clairefontaine')).toBeInTheDocument()
  })

  it('propose de revenir au catalogue et au rayon du produit', async () => {
    simulerApi(ecume)
    afficher('p-1')

    const fil = within(await screen.findByRole('navigation', { name: 'Fil d\'Ariane' }))
    expect(fil.getByRole('link', { name: 'Catalogue' })).toHaveAttribute('href', '/catalogue')
    expect(await fil.findByRole('link', { name: 'Roman' })).toHaveAttribute(
      'href',
      '/catalogue?categorie=roman',
    )
  })

  it('affiche la page introuvable quand le produit n existe pas', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree) => {
      if (String(entree).startsWith('/api/categories')) {
        return reponse(categories)
      }
      return reponse({ code: 'INTROUVABLE', message: 'Produit introuvable.' }, 404)
    })
    afficher('inconnu')

    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour au catalogue' })).toHaveAttribute(
      'href',
      '/catalogue',
    )
  })

  it('affiche une erreur et permet de réessayer', async () => {
    let appels = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree) => {
      if (String(entree).startsWith('/api/categories')) {
        return reponse(categories)
      }
      appels += 1
      if (appels === 1) {
        throw new TypeError('offline')
      }
      return reponse(ecume)
    })
    afficher('p-1')

    expect(
      await screen.findByRole('heading', { name: 'L\'article n\'a pas pu être chargé.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Impossible de joindre le serveur. Vérifiez votre connexion.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'L\'Écume des jours' }),
    ).toBeInTheDocument()
  })
})
