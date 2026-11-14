import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PanierProvider } from '../../contexts/PanierContext.tsx'
import { AuthContext, type AuthContextValue } from '../../contexts/useAuth'
import type { Produit } from '../../types/produit'
import type { Utilisateur } from '../../types/utilisateur'
import type { CommandePayload, Devis, LigneCommande } from '../../types/vente'
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

function devisPour(produits: Produit[], panier: CommandePayload, indisponibles: LigneCommande[]): Devis {
  const lignes = panier.lignes.flatMap((ligne) => {
    const produit = produits.find((p) => p.id === ligne.produitId)
    if (!produit) {
      return []
    }
    const montant = produit.prixApplique * ligne.quantite
    return [
      {
        ...ligne,
        reference: produit.reference,
        designation: produit.designation,
        prixUnitaire: produit.prixApplique,
        remise: produit.promotion?.remise ?? 0,
        tauxTva: produit.tauxTva,
        montant,
        montantTva: 146,
      },
    ]
  })
  const sousTotal = lignes.reduce((somme, ligne) => somme + ligne.montant, 0)
  const fraisEmballage = panier.emballageCadeau ? 300 : 0
  return {
    lignes,
    lignesIndisponibles: indisponibles,
    sousTotal,
    fraisEmballage,
    fraisLivraison: 800,
    frais: fraisEmballage + 800,
    montantTva: 146,
    total: sousTotal + fraisEmballage + 800,
  }
}

interface OptionsApi {
  indisponibles?: LigneCommande[]
  commande?: (panier: CommandePayload) => Response
}

function simulerApi(produits: Produit[], options: OptionsApi = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree, init) => {
    const url = String(entree)
    const corps = init?.body ? JSON.parse(String(init.body)) : undefined
    if (url === '/api/commandes/devis') {
      return reponse(devisPour(produits, corps, options.indisponibles ?? []))
    }
    if (url === '/api/commandes') {
      return options.commande
        ? options.commande(corps)
        : reponse({ code: 'ERREUR_SERVEUR', message: 'Erreur inattendue.' }, 500)
    }
    const produit = produits.find((p) => url === `/api/produits/${p.id}`)
    return produit
      ? reponse(produit)
      : reponse({ code: 'INTROUVABLE', message: 'Produit introuvable.' }, 404)
  })
}

function appels(fetchMock: ReturnType<typeof simulerApi>, url: string) {
  return fetchMock.mock.calls.filter(([entree]) => String(entree) === url)
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
      { path: '/commandes/:id', element: <h1>Commande</h1> },
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

async function boutonConfirmer() {
  const bouton = await screen.findByRole('button', { name: 'Confirmer la commande' })
  await waitFor(() => expect(bouton).toBeEnabled())
  return bouton
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

  it('affiche les montants calculés par la librairie sans envoyer de prix', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 2 }])
    const fetchMock = simulerApi([ile])
    afficher()
    const recap = within(await screen.findByRole('complementary', { name: 'Récapitulatif' }))

    expect(await recap.findByText('3 860 XPF')).toBeInTheDocument()
    expect(recap.getByText('Articles (2)').nextElementSibling).toHaveTextContent('3 060 XPF')
    expect(recap.getByText('Livraison à domicile').nextElementSibling).toHaveTextContent('800 XPF')
    expect(recap.getByText('dont TVA').nextElementSibling).toHaveTextContent('146 XPF')
    expect(recap.getByText('Emballage cadeau').nextElementSibling).toHaveTextContent('Aucun')
    expect(screen.getByText('3 060 XPF', { selector: '.ligne-montant' })).toBeInTheDocument()
    const [, options] = appels(fetchMock, '/api/commandes/devis')[0]
    expect(JSON.parse(String(options?.body))).toEqual({
      lignes: [{ produitId: 'p-1', quantite: 2 }],
      emballageCadeau: false,
    })
  })

  it('recalcule le devis quand on choisit l emballage cadeau et une occasion', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 1 }])
    const fetchMock = simulerApi([ile])
    afficher()
    const recap = within(await screen.findByRole('complementary', { name: 'Récapitulatif' }))
    await recap.findByText('2 330 XPF')

    fireEvent.click(screen.getByRole('checkbox', { name: /Emballage cadeau/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /C'est un cadeau/ }))
    fireEvent.change(screen.getByLabelText('Occasion'), { target: { value: 'noel' } })

    expect(await recap.findByText('2 630 XPF')).toBeInTheDocument()
    expect(recap.getByText('Emballage cadeau').nextElementSibling).toHaveTextContent('300 XPF')
    const dernier = appels(fetchMock, '/api/commandes/devis').at(-1)
    expect(JSON.parse(String(dernier?.[1]?.body))).toEqual({
      lignes: [{ produitId: 'p-1', quantite: 1 }],
      emballageCadeau: true,
      occasionCadeau: 'noel',
    })
  })

  it('change la quantité sans recharger les produits', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 1 }])
    const fetchMock = simulerApi([ile])
    afficher()
    await screen.findByRole('link', { name: 'L\'Île au trésor' })

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un exemplaire' }))

    expect(screen.getByLabelText('Quantité de L\'Île au trésor')).toHaveValue('2')
    expect(screen.getByText('2 articles')).toBeInTheDocument()
    expect(panierEnregistre()).toEqual([{ produitId: 'p-1', quantite: 2 }])
    expect(await screen.findByText('3 060 XPF', { selector: '.ligne-montant' })).toBeInTheDocument()
    expect(appels(fetchMock, '/api/produits/p-1')).toHaveLength(1)
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
    simulerApi([{ ...ile, disponibilite: 'epuise' }], {
      indisponibles: [{ produitId: 'p-1', quantite: 1 }],
    })
    afficher()

    expect(
      await screen.findByText('Cet article est épuisé : retirez-le pour pouvoir commander.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Corrigez les articles signalés pour pouvoir commander.')).toBeInTheDocument()
  })

  it('laisse commander un article épuisé que la librairie a mis de côté pour le client', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 1 }])
    simulerApi([{ ...ile, disponibilite: 'epuise' }])
    afficher({ utilisateur: client })

    expect(await boutonConfirmer()).toBeEnabled()
    expect(screen.queryByText(/Cet article est épuisé/)).not.toBeInTheDocument()
  })

  it('signale une quantité que la librairie ne peut plus servir', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 6 }])
    simulerApi([ile], { indisponibles: [{ produitId: 'p-1', quantite: 6 }] })
    afficher({ utilisateur: client })

    expect(
      await screen.findByText(
        'Cette quantité n\'est plus disponible : réduisez-la ou retirez l\'article.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmer la commande' })).toBeDisabled()
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
    let echecs = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree, init) => {
      const url = String(entree)
      if (url === '/api/commandes/devis') {
        return reponse(devisPour([ile], JSON.parse(String(init?.body)), []))
      }
      if (echecs === 0) {
        echecs += 1
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

  it('propose de recalculer si le devis échoue', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 1 }])
    let echecs = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree, init) => {
      if (String(entree) !== '/api/commandes/devis') {
        return reponse(ile)
      }
      if (echecs === 0) {
        echecs += 1
        return reponse({ code: 'ERREUR_SERVEUR', message: 'Erreur inattendue.' }, 500)
      }
      return reponse(devisPour([ile], JSON.parse(String(init?.body)), []))
    })
    afficher()
    const recap = within(await screen.findByRole('complementary', { name: 'Récapitulatif' }))

    expect(await recap.findByRole('alert')).toHaveTextContent('Erreur inattendue.')
    fireEvent.click(recap.getByRole('button', { name: 'Recalculer' }))

    expect(await recap.findByText('2 330 XPF')).toBeInTheDocument()
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

  it('indique au responsable qu il faut un compte client pour commander', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 1 }])
    simulerApi([ile])
    afficher({ utilisateur: { ...client, role: 'responsable' } })

    expect(
      await screen.findByText('Connectez-vous avec un compte client pour commander.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmer la commande' })).not.toBeInTheDocument()
  })

  it('confirme la commande, vide le panier et ouvre la commande enregistrée', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 2 }])
    const fetchMock = simulerApi([ile], {
      commande: () => reponse({ id: 'v-1', statut: 'a_preparer' }, 201),
    })
    const router = afficher({ utilisateur: client })
    const bouton = await boutonConfirmer()

    fireEvent.change(screen.getByLabelText('Adresse de livraison'), {
      target: { value: '  12 rue des Remparts, Papeete  ' },
    })
    fireEvent.click(bouton)

    expect(await screen.findByRole('heading', { name: 'Commande' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/commandes/v-1')
    expect(router.state.location.state).toEqual({ confirmee: true })
    expect(panierEnregistre()).toEqual([])
    const [, options] = appels(fetchMock, '/api/commandes')[0]
    expect(JSON.parse(String(options?.body))).toEqual({
      lignes: [{ produitId: 'p-1', quantite: 2 }],
      emballageCadeau: false,
      adresseLivraison: '12 rue des Remparts, Papeete',
    })
  })

  it('affiche sous le champ l erreur d adresse renvoyée par la librairie', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 1 }])
    simulerApi([ile], {
      commande: () =>
        reponse(
          {
            code: 'VALIDATION',
            message: 'Certains champs sont invalides.',
            details: { champs: { adresseLivraison: 'L\'adresse de livraison est obligatoire.' } },
          },
          400,
        ),
    })
    afficher({ utilisateur: client })

    fireEvent.click(await boutonConfirmer())

    expect(
      await screen.findByText('L\'adresse de livraison est obligatoire.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Adresse de livraison')).toHaveAttribute('aria-invalid', 'true')
    expect(panierEnregistre()).toEqual([{ produitId: 'p-1', quantite: 1 }])
  })

  it('signale les articles refusés sans rien enregistrer', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 2 }])
    simulerApi([ile], {
      commande: () =>
        reponse(
          {
            code: 'LIGNE_INDISPONIBLE',
            message: 'Vente refusée.',
            details: { lignes: [{ produitId: 'p-1', quantite: 2 }] },
          },
          409,
        ),
    })
    afficher({ utilisateur: client })
    const bouton = await boutonConfirmer()
    fireEvent.change(screen.getByLabelText('Adresse de livraison'), { target: { value: 'BP 12' } })

    fireEvent.click(bouton)

    expect(await screen.findByText(/Rien n'a été enregistré : certains articles/)).toBeInTheDocument()
    expect(
      screen.getByText('Cette quantité n\'est plus disponible : réduisez-la ou retirez l\'article.'),
    ).toBeInTheDocument()
    expect(panierEnregistre()).toEqual([{ produitId: 'p-1', quantite: 2 }])

    fireEvent.click(screen.getByRole('button', { name: 'Retirer un exemplaire' }))

    expect(screen.queryByText(/Rien n'a été enregistré/)).not.toBeInTheDocument()
  })

  it('explique que le stock a changé pendant la commande', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 1 }])
    simulerApi([ile], {
      commande: () => reponse({ code: 'STOCK_MODIFIE', message: 'Le stock a changé.' }, 409),
    })
    afficher({ utilisateur: client })
    const bouton = await boutonConfirmer()
    fireEvent.change(screen.getByLabelText('Adresse de livraison'), { target: { value: 'BP 12' } })

    fireEvent.click(bouton)

    expect(await screen.findByText(/Le stock a changé pendant votre commande/)).toBeInTheDocument()
    expect(panierEnregistre()).toEqual([{ produitId: 'p-1', quantite: 1 }])
  })

  it('propose les options cadeau, emballage et l adresse de livraison', async () => {
    remplirPanier([{ produitId: 'p-1', quantite: 1 }])
    simulerApi([ile])
    afficher({ utilisateur: client })
    await screen.findByRole('link', { name: 'L\'Île au trésor' })

    expect(screen.queryByLabelText('Occasion')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /C'est un cadeau/ }))
    fireEvent.change(screen.getByLabelText('Occasion'), { target: { value: 'noel' } })
    expect(screen.getByLabelText('Occasion')).toHaveValue('noel')

    fireEvent.change(screen.getByLabelText('Adresse de livraison'), {
      target: { value: '12 rue des Remparts, Papeete' },
    })
    expect(screen.getByLabelText('Adresse de livraison')).toHaveValue('12 rue des Remparts, Papeete')
    expect(screen.queryByText(/retrait/i)).not.toBeInTheDocument()
  })
})
