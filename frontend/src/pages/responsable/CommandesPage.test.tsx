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
    if (requete.url === '/api/commandes-fournisseur?statut=recue') {
      return json([recue])
    }
    return json([tardive, proche, recue])
  })
  return requetes
}

function tableau() {
  return within(screen.getByRole('region', { name: /Encore attendues|Commandes fournisseur/ }))
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

    await tableau().findByRole('button', { name: 'Sakamoto Days' })
    const lignes = tableau().getAllByRole('row').slice(1)
    expect(lignes).toHaveLength(2)
    expect(lignes[0]).toHaveTextContent('Sakamoto Days')
    expect(lignes[1]).toHaveTextContent('Mutismes')
    expect(tableau().queryByText('Casino Royale')).not.toBeInTheDocument()
    expect(tableau().getByText('2', { selector: '.commandes-compte' })).toBeInTheDocument()
    expect(requetes.map((requete) => requete.url)).toEqual(
      expect.arrayContaining(['/api/commandes-fournisseur', '/api/fournisseurs', '/api/produits']),
    )
    expect(document.title).toBe('Fournisseurs, commandes et réceptions · Feuillet')
  })

  it('filtre par statut et par fournisseur côté serveur', async () => {
    const requetes = simulerApi()
    render(<CommandesPage />)
    await tableau().findByRole('button', { name: 'Sakamoto Days' })

    fireEvent.change(screen.getByLabelText('Statut'), { target: { value: 'recue' } })

    expect(await tableau().findByRole('button', { name: 'Casino Royale' })).toBeInTheDocument()
    expect(tableau().queryByRole('button', { name: 'Mutismes' })).not.toBeInTheDocument()

    fireEvent.change(screen.getAllByLabelText('Fournisseur')[0], { target: { value: 'f-1' } })

    await waitFor(() =>
      expect(requetes.map((requete) => requete.url)).toContain(
        '/api/commandes-fournisseur?statut=recue&fournisseurId=f-1',
      ),
    )
  })

  it('ouvre le détail d une commande avec ses réceptions', async () => {
    const requetes = simulerApi()
    render(<CommandesPage />)

    fireEvent.click(await tableau().findByRole('button', { name: 'Sakamoto Days' }))

    expect(screen.getByRole('heading', { name: 'Sakamoto Days' })).toBeInTheDocument()
    expect(screen.getByText('4 reçus sur 10 commandés')).toBeInTheDocument()
    await waitFor(() =>
      expect(requetes.map((requete) => requete.url)).toContain('/api/commandes-fournisseur/b/receptions'),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Fermer le panneau' }))

    expect(screen.queryByRole('heading', { name: 'Sakamoto Days' })).not.toBeInTheDocument()
  })

  it('passe une nouvelle commande, recharge la liste et l ouvre', async () => {
    const nouvelle = commande('d', 'Le Petit Prince', { quantiteCommandee: 12 })
    const requetes = simulerApi(({ url, methode }) =>
      url === '/api/commandes-fournisseur' && methode === 'POST' ? json(nouvelle, 201) : undefined,
    )
    render(<CommandesPage />)
    await tableau().findByRole('button', { name: 'Sakamoto Days' })
    const chargements = () =>
      requetes.filter((requete) => requete.url === '/api/commandes-fournisseur' && requete.methode === 'GET').length
    const avant = chargements()

    fireEvent.click(screen.getByRole('button', { name: 'Nouvelle commande' }))
    const panneau = within(screen.getByRole('complementary'))
    fireEvent.change(panneau.getByLabelText('Fournisseur'), { target: { value: 'f-1' } })
    fireEvent.change(panneau.getByLabelText('Article'), { target: { value: 'p-d' } })
    fireEvent.change(panneau.getByLabelText('Quantité'), { target: { value: '12' } })
    fireEvent.change(panneau.getByLabelText('Arrivée prévue'), { target: { value: '2026-11-20' } })
    fireEvent.click(panneau.getByRole('button', { name: 'Passer la commande' }))

    expect(
      await within(screen.getByRole('complementary')).findByText(
        'Commande passée : 12 × Le Petit Prince chez Diffusion Océanie.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Le Petit Prince' })).toBeInTheDocument()
    await waitFor(() => expect(chargements()).toBeGreaterThan(avant))
  })

  it('referme le formulaire de nouvelle commande', async () => {
    simulerApi()
    render(<CommandesPage />)
    await tableau().findByRole('button', { name: 'Sakamoto Days' })

    fireEvent.click(screen.getByRole('button', { name: 'Nouvelle commande' }))
    fireEvent.click(within(screen.getByRole('complementary')).getByRole('button', { name: 'Annuler' }))

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('ferme le panneau avec Échap ou en cliquant à côté', async () => {
    simulerApi()
    const { container } = render(<CommandesPage />)
    fireEvent.click(await tableau().findByRole('button', { name: 'Sakamoto Days' }))
    expect(screen.getByRole('button', { name: 'Fermer le panneau' })).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Nouvelle commande' }))
    fireEvent.click(container.querySelector('.commandes-voile') as Element)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
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
