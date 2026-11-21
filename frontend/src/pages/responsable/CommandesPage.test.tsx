import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CommandeFournisseur } from '../../types/reappro'
import CommandesPage from './CommandesPage.tsx'

function commande(id: string, designation: string, valeurs: Partial<CommandeFournisseur> = {}): CommandeFournisseur {
  return {
    id,
    fournisseur: { id: 'f-1', nom: 'Diffusion Océanie' },
    produitId: `p-${id}`,
    reference: `REF-${id}`,
    designation,
    quantiteCommandee: 10,
    quantiteRecue: 0,
    date: '2026-11-08T20:00:00.000Z',
    dateArriveePrevue: '2026-11-20',
    statut: 'en_cours',
    ...valeurs,
  }
}

const tardive = commande('a', 'Mutismes', { dateArriveePrevue: '2026-11-25' })
const proche = commande('b', 'Sakamoto Days', {
  dateArriveePrevue: '2026-11-17',
  quantiteRecue: 4,
  statut: 'partiellement_recue',
})
const recue = commande('c', 'Casino Royale', { quantiteRecue: 10, statut: 'recue' })

interface Requete {
  url: string
  methode: string
}

function json(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

function simulerApi(reponse: (requete: Requete) => Response | undefined = () => undefined) {
  const requetes: Requete[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree, options) => {
    const requete = { url: String(entree), methode: options?.method ?? 'GET' }
    requetes.push(requete)
    const particuliere = reponse(requete)
    if (particuliere) {
      return particuliere
    }
    if (requete.url.startsWith('/api/fournisseurs')) {
      return json([{ id: 'f-1', nom: 'Diffusion Océanie' }])
    }
    if (requete.url.startsWith('/api/produits')) {
      return json([
        {
          id: 'p-d',
          reference: 'REF-d',
          designation: 'Le Petit Prince',
          type: 'livre',
          categorie: 'jeunesse',
          prix: 1400,
          tauxTva: 5,
          archive: false,
          prixApplique: 1400,
        },
      ])
    }
    if (requete.url.includes('/receptions')) {
      return json([])
    }
    if (requete.url.startsWith('/api/demandes')) {
      return json([])
    }
    if (requete.url === '/api/commandes-fournisseur?statut=recue') {
      return json([recue])
    }
    return json([tardive, proche, recue])
  })
  return requetes
}

function tableau() {
  return within(screen.getByRole('region', { name: 'Commandes fournisseur' }))
}

function titres() {
  return Array.from(document.querySelectorAll('.liste tbody .article .article-titre')).map(
    (titre) => titre.textContent,
  )
}

async function ligne(titre: string) {
  const element = await tableau().findByText(titre, { selector: '.article-titre' })
  return element.closest('tr') as HTMLElement
}

describe('page des commandes fournisseur', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-14T20:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('montre d abord ce qui est encore attendu, du plus proche au plus lointain', async () => {
    const requetes = simulerApi()
    render(<CommandesPage />)

    await ligne('Sakamoto Days')
    expect(titres()).toEqual(['Sakamoto Days', 'Mutismes'])
    expect(within(await ligne('Sakamoto Days')).getByText('Reçue en partie')).toHaveClass('statut-partielle')
    expect(within(await ligne('Sakamoto Days')).getByText('Dans 3 jours')).toBeInTheDocument()
    expect(within(await ligne('Mutismes')).getByText('Dans 11 jours')).toBeInTheDocument()
    expect(within(await ligne('Sakamoto Days')).getByText('4 sur 10')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Attendues/ })).toHaveTextContent('Attendues2')
    expect(screen.getByRole('button', { name: /^Reçues/ })).toHaveTextContent('Reçues1')
    expect(screen.getByText('16 exemplaires attendus')).toBeInTheDocument()
    expect(requetes.map((requete) => requete.url)).toEqual(
      expect.arrayContaining(['/api/commandes-fournisseur', '/api/fournisseurs', '/api/produits']),
    )
    expect(document.title).toBe('Fournisseurs, commandes et réceptions · Feuillet')
  })

  it('montre les commandes reçues, toutes les commandes et filtre par fournisseur', async () => {
    simulerApi(({ url }) =>
      url === '/api/commandes-fournisseur'
        ? json([
            tardive,
            proche,
            recue,
            commande('e', 'Dune', { fournisseur: { id: 'f-2', nom: 'Éditions du Récif' } }),
          ])
        : url.startsWith('/api/fournisseurs')
          ? json([
              { id: 'f-1', nom: 'Diffusion Océanie' },
              { id: 'f-2', nom: 'Éditions du Récif' },
            ])
          : undefined,
    )
    render(<CommandesPage />)
    await ligne('Sakamoto Days')

    fireEvent.click(screen.getByRole('button', { name: /^Reçues/ }))
    expect(titres()).toEqual(['Casino Royale'])
    expect(within(await ligne('Casino Royale')).getByText('Arrivée')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Toutes/ }))
    expect(titres()).toHaveLength(4)

    fireEvent.change(screen.getByRole('combobox', { name: 'Fournisseur' }), { target: { value: 'f-2' } })
    expect(titres()).toEqual(['Dune'])
  })

  it('ouvre le détail d une commande avec ses réceptions', async () => {
    const requetes = simulerApi()
    render(<CommandesPage />)

    fireEvent.click(await ligne('Sakamoto Days'))

    const volet = within(screen.getByRole('complementary', { name: 'Commande choisie' }))
    expect(volet.getByRole('heading', { name: 'Sakamoto Days' })).toBeInTheDocument()
    expect(volet.getByText('Commande du 8 novembre, Diffusion Océanie')).toBeInTheDocument()
    expect(volet.getByText('Attendus').nextElementSibling).toHaveTextContent('6')
    await waitFor(() =>
      expect(requetes.map((requete) => requete.url)).toContain('/api/commandes-fournisseur/b/receptions'),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Fermer le volet' }))

    expect(screen.queryByRole('heading', { name: 'Sakamoto Days' })).not.toBeInTheDocument()
  })

  it('rappelle les demandes des clients qui attendent l article commandé', async () => {
    simulerApi(({ url }) =>
      url.startsWith('/api/demandes')
        ? json([
            {
              id: 'd-1',
              titre: 'Sakamoto Days',
              produitId: 'p-b',
              quantiteSouhaitee: 2,
              statut: 'en_attente',
              date: '2026-11-10T20:00:00.000Z',
              client: { id: 'c-1', nom: 'Teva', email: 'teva@test.local' },
            },
          ])
        : undefined,
    )
    render(<CommandesPage />)

    fireEvent.click(await ligne('Sakamoto Days'))

    expect(
      await within(screen.getByRole('complementary')).findByText(/1 demande attend ce livre/),
    ).toHaveTextContent('2 exemplaires à mettre de côté à la validation de la réception, pour Teva.')
  })

  it('passe une nouvelle commande, recharge la liste et l ouvre', async () => {
    const nouvelle = commande('d', 'Le Petit Prince', { quantiteCommandee: 12 })
    const requetes = simulerApi(({ url, methode }) =>
      url === '/api/commandes-fournisseur' && methode === 'POST' ? json(nouvelle, 201) : undefined,
    )
    render(<CommandesPage />)
    await ligne('Sakamoto Days')
    const chargements = () =>
      requetes.filter((requete) => requete.url === '/api/commandes-fournisseur' && requete.methode === 'GET').length
    const avant = chargements()

    fireEvent.click(screen.getByRole('button', { name: 'Nouvelle commande' }))
    const volet = within(screen.getByRole('complementary', { name: 'Nouvelle commande' }))
    fireEvent.change(volet.getByLabelText('Fournisseur'), { target: { value: 'f-1' } })
    fireEvent.change(volet.getByLabelText('Article'), { target: { value: 'p-d' } })
    fireEvent.change(volet.getByLabelText('Quantité'), { target: { value: '12' } })
    fireEvent.change(volet.getByLabelText('Arrivée prévue'), { target: { value: '2026-11-20' } })
    fireEvent.click(volet.getByRole('button', { name: 'Passer la commande' }))

    expect(
      await screen.findByText('Commande passée : 12 × Le Petit Prince chez Diffusion Océanie.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Le Petit Prince' })).toBeInTheDocument()
    await waitFor(() => expect(chargements()).toBeGreaterThan(avant))
  })

  it('referme le formulaire de nouvelle commande', async () => {
    simulerApi()
    render(<CommandesPage />)
    await ligne('Sakamoto Days')
    fireEvent.click(screen.getByRole('button', { name: 'Nouvelle commande' }))

    fireEvent.click(within(screen.getByRole('complementary')).getByRole('button', { name: 'Annuler' }))

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('ferme le volet avec Échap ou en cliquant à côté, et l ouvre au clavier', async () => {
    simulerApi()
    render(<CommandesPage />)
    const rangee = await ligne('Sakamoto Days')

    fireEvent.keyDown(rangee, { key: 'Enter' })
    expect(screen.getByRole('button', { name: 'Fermer le volet' })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()

    fireEvent.click(rangee)
    fireEvent.click(document.querySelector('.tiroir-fond') as Element)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('liste les fournisseurs et ouvre leur fiche', async () => {
    simulerApi(({ url }) =>
      url.startsWith('/api/fournisseurs')
        ? json([{ id: 'f-1', nom: 'Diffusion Océanie', contact: 'commandes@do.pf' }])
        : undefined,
    )
    render(<CommandesPage />)
    await ligne('Sakamoto Days')

    fireEvent.click(screen.getByRole('button', { name: /^Fournisseurs/ }))

    const rangee = screen.getByText('Diffusion Océanie', { selector: '.article-titre' }).closest('tr') as HTMLElement
    expect(within(rangee).getAllByRole('cell').map((cellule) => cellule.textContent)).toEqual([
      'Diffusion Océanie',
      'commandes@do.pf',
      '2',
      '8 novembre',
      '',
    ])

    fireEvent.click(rangee)

    const volet = within(screen.getByRole('complementary', { name: 'Fournisseur choisi' }))
    expect(volet.getByLabelText('Nom')).toHaveValue('Diffusion Océanie')
    expect(volet.getByRole('heading', { name: /^Commandes/ })).toHaveTextContent('Commandes3')
  })

  it('ajoute un fournisseur depuis l en-tête et ouvre sa fiche', async () => {
    simulerApi(({ url, methode }) =>
      url === '/api/fournisseurs' && methode === 'POST'
        ? json({ id: 'f-3', nom: 'Papeterie du Lagon' }, 201)
        : undefined,
    )
    render(<CommandesPage />)
    await ligne('Sakamoto Days')

    fireEvent.click(screen.getByRole('button', { name: 'Nouveau fournisseur' }))
    const volet = within(screen.getByRole('complementary', { name: 'Nouveau fournisseur' }))
    fireEvent.change(volet.getByLabelText('Nom'), { target: { value: 'Papeterie du Lagon' } })
    fireEvent.click(volet.getByRole('button', { name: 'Ajouter le fournisseur' }))

    expect(await screen.findByText('Papeterie du Lagon a été ajouté.')).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Fournisseur choisi' })).toBeInTheDocument()
  })

  it('affiche une erreur de chargement', async () => {
    simulerApi(({ url }) =>
      url.startsWith('/api/commandes-fournisseur')
        ? json({ code: 'INTERDIT', message: 'Accès réservé au responsable.' }, 403)
        : undefined,
    )
    render(<CommandesPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Accès réservé au responsable.')
  })
})
