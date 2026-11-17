import { fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Categorie } from '../../types/categorie'
import type { Produit } from '../../types/produit'
import type { Utilisateur } from '../../types/utilisateur'
import { PanierProvider } from '../../contexts/PanierContext.tsx'
import { AuthContext, type AuthContextValue } from '../../contexts/useAuth'
import ProduitPage from './ProduitPage.tsx'

const client: Utilisateur = { id: 'u-1', nom: 'Tiare', email: 'tiare@exemple.pf', role: 'client' }

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

function afficher(id: string, utilisateur: Utilisateur | null = null) {
  const session: AuthContextValue = {
    utilisateur,
    chargement: false,
    connexion: () => Promise.reject(new Error('non utilisé')),
    inscription: () => Promise.reject(new Error('non utilisé')),
    deconnexion: () => {},
  }
  const router = createMemoryRouter(
    [
      { path: '/produits/:id', element: <ProduitPage /> },
      { path: '/catalogue', element: <h1>Catalogue</h1> },
      { path: '/panier', element: <h1>Panier</h1> },
      { path: '/demandes', element: <h1>Mes demandes</h1> },
      { path: '/connexion', element: <h1>Connexion</h1> },
    ],
    { initialEntries: [`/produits/${id}`] },
  )
  render(
    <AuthContext value={session}>
      <PanierProvider>
        <RouterProvider router={router} />
      </PanierProvider>
    </AuthContext>,
  )
  return router
}

function panierEnregistre() {
  return JSON.parse(localStorage.getItem('panier') ?? '[]')
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
    expect(document.querySelector('.fiche .fiche-scene.squelette')).not.toBeNull()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'L\'Écume des jours' }),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/produits/p-1', expect.any(Object))
    expect(details().getByText('LIV-002')).toBeInTheDocument()
    expect(details().getByText('Roman')).toBeInTheDocument()
    expect(details().getByText('9782253140870')).toBeInTheDocument()
    expect(details().getByText('Livre')).toBeInTheDocument()
    expect(details().getByText('5 % incluse')).toBeInTheDocument()
    expect(document.title).toBe('L\'Écume des jours · Feuillet')
  })

  it('affiche le prix remisé, le prix barré, la remise et la fin de la promotion', async () => {
    simulerApi(ecume)
    afficher('p-1')

    expect(await screen.findByText('1 290 XPF')).toBeInTheDocument()
    expect(document.querySelector('.fiche-prix')).toHaveTextContent(/^1 097 XPF/)
    expect(screen.getByText('−15 %')).toBeInTheDocument()
    expect(screen.getByText(/Promotion valable jusqu'au 31 octobre 2026\./)).toBeInTheDocument()
  })

  it('indique qu un article est disponible et l ajoute au panier avec la quantité choisie', async () => {
    simulerApi({ ...ecume, disponibilite: 'disponible' })
    afficher('p-1')

    expect(await screen.findByText('Disponible', { selector: '.dispo' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un exemplaire' }))
    expect(screen.getByLabelText('Quantité')).toHaveValue('2')
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter au panier' }))

    expect(panierEnregistre()).toEqual([{ produitId: 'p-1', quantite: 2 }])
    expect(screen.getByRole('status')).toHaveTextContent('Ajouté au panier.')
    expect(screen.getByRole('link', { name: 'Voir le panier' })).toHaveAttribute('href', '/panier')
    expect(document.querySelector('.barre-achat')).toHaveAttribute('aria-hidden', 'true')
  })

  it('additionne les quantités quand on ajoute deux fois le même article', async () => {
    simulerApi({ ...ecume, disponibilite: 'disponible' })
    afficher('p-1')

    const bouton = await screen.findByRole('button', { name: 'Ajouter au panier' })
    fireEvent.click(bouton)
    fireEvent.click(bouton)

    expect(panierEnregistre()).toEqual([{ produitId: 'p-1', quantite: 2 }])
  })

  it('invite un visiteur à se connecter pour demander un article épuisé', async () => {
    simulerApi({ ...ecume, disponibilite: 'epuise' })
    const router = afficher('p-1')

    expect(await screen.findByText('Épuisé')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ajouter au panier' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Se connecter pour demander ce livre' }))

    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expect(router.state.location.state).toEqual({ depuis: '/produits/p-1' })
    expect(panierEnregistre()).toEqual([])
  })

  it('envoie la demande d un client sur un article épuisé', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree, init) => {
      if (String(entree).startsWith('/api/categories')) {
        return reponse(categories)
      }
      if (String(entree) === '/api/demandes') {
        return new Response(JSON.stringify({ id: 'd-1', ...JSON.parse(String(init?.body)) }), {
          status: 201,
        })
      }
      return reponse({ ...ecume, disponibilite: 'epuise' })
    })
    afficher('p-1', client)

    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter un exemplaire' }))
    fireEvent.click(screen.getByRole('button', { name: 'Demander ce livre' }))

    expect(await screen.findByRole('status')).toHaveTextContent(/Demande enregistrée/)
    expect(screen.getByRole('link', { name: 'Suivre mes demandes' })).toHaveAttribute(
      'href',
      '/demandes',
    )
    const envoi = fetchMock.mock.calls.find(([entree]) => String(entree) === '/api/demandes')
    expect(JSON.parse(String(envoi?.[1]?.body))).toEqual({ produitId: 'p-1', quantiteSouhaitee: 2 })
  })

  it('prévient le client qui a déjà une demande en cours sur cet article', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree) => {
      if (String(entree).startsWith('/api/categories')) {
        return reponse(categories)
      }
      if (String(entree) === '/api/demandes') {
        return new Response(
          JSON.stringify({ code: 'DEMANDE_EN_COURS', message: 'Demande déjà en cours.' }),
          { status: 409 },
        )
      }
      return reponse({ ...ecume, disponibilite: 'epuise' })
    })
    afficher('p-1', client)

    fireEvent.click(await screen.findByRole('button', { name: 'Demander ce livre' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Vous avez déjà une demande en cours pour cet article.',
    )
  })

  it('affiche la date de retour prévue d un article épuisé', async () => {
    simulerApi({ ...ecume, disponibilite: 'epuise', arriveePrevue: '2026-11-20' } as Produit)
    afficher('p-1', client)

    expect(await screen.findByText(/Retour en rayon prévu le 20 novembre 2026\./)).toBeInTheDocument()
  })

  it('affiche le prix sans promotion', async () => {
    simulerApi(carnet)
    afficher('p-3')

    await screen.findByRole('heading', { level: 1 })
    expect(document.querySelector('.fiche-prix')).toHaveTextContent(/^650 XPF/)
    expect(screen.queryByText(/Promotion valable/)).not.toBeInTheDocument()
    expect(details().getByText('16 % incluse')).toBeInTheDocument()
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
