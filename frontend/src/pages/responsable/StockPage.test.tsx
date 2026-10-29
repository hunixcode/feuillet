import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Categorie } from '../../types/categorie'
import type { LigneStock, Mouvement } from '../../types/stock'
import StockPage from './StockPage.tsx'

const categories: Categorie[] = [{ id: 'roman', libelle: 'Roman' }]

const ile: LigneStock = {
  produitId: 'p-1',
  reference: 'LIV-001',
  designation: "L'Île au trésor",
  quantitePhysique: 12,
  quantiteMiseDeCote: 2,
  quantiteDefectueuse: 0,
  quantiteVendable: 10,
}

const casino: LigneStock = {
  produitId: 'p-2',
  reference: 'LIV-002',
  designation: 'Casino Royale',
  quantitePhysique: 0,
  quantiteMiseDeCote: 0,
  quantiteDefectueuse: 0,
  quantiteVendable: 0,
}

const carnet: LigneStock = {
  produitId: 'p-3',
  reference: 'PAP-001',
  designation: 'Carnet ligné A5',
  quantitePhysique: 46,
  quantiteMiseDeCote: 0,
  quantiteDefectueuse: 2,
  quantiteVendable: 46,
}

const vente: Mouvement = {
  id: 'm-1',
  produitId: 'p-1',
  date: '2026-10-22T20:00:00.000Z',
  type: 'vente',
  quantite: -1,
  motif: 'Commande en ligne C-0087',
  operateur: 'client',
}

interface Requete {
  url: string
  methode: string
  corps?: unknown
}

function json(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

function reponseParDefaut({ url }: Requete): Response {
  if (url === '/api/categories') {
    return json(categories)
  }
  if (url.startsWith('/api/mouvements')) {
    return json([vente])
  }
  return json([ile, casino, carnet])
}

function simulerApi(reponses: (requete: Requete) => Response | undefined = () => undefined) {
  const requetes: Requete[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree, options) => {
    const requete: Requete = {
      url: String(entree),
      methode: options?.method ?? 'GET',
      corps: options?.body ? JSON.parse(String(options.body)) : undefined,
    }
    requetes.push(requete)
    return reponses(requete) ?? reponseParDefaut(requete)
  })
  return requetes
}

function tableauStock() {
  return within(screen.getByRole('region', { name: 'Stock par article' }))
}

describe('page stock du responsable', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche le stock de chaque article et le journal des mouvements', async () => {
    simulerApi()
    render(<StockPage />)

    expect(await tableauStock().findByRole('button', { name: "L'Île au trésor" })).toBeInTheDocument()
    expect(tableauStock().getByRole('button', { name: 'Casino Royale' }).closest('tr')).toHaveTextContent(
      'Épuisé',
    )
    const journal = within(screen.getByRole('region', { name: 'Journal des mouvements' }))
    expect(await journal.findByText('Commande en ligne C-0087')).toBeInTheDocument()
    expect(journal.getByText('Client')).toBeInTheDocument()
    expect(document.title).toBe('Stock et mouvements · Feuillet')
  })

  it('invite à choisir un article avant toute action', async () => {
    simulerApi()
    render(<StockPage />)
    await tableauStock().findByRole('button', { name: "L'Île au trésor" })

    expect(screen.getByRole('heading', { name: 'Actions sur le stock' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enregistrer la correction' })).not.toBeInTheDocument()
  })

  it('affiche une erreur de chargement', async () => {
    simulerApi(({ url }) =>
      url.startsWith('/api/stock')
        ? json({ code: 'INTERDIT', message: 'Accès réservé au responsable.' }, 403)
        : undefined,
    )
    render(<StockPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Accès réservé au responsable.')
  })

  it('envoie la recherche, le type et la catégorie au serveur', async () => {
    const requetes = simulerApi()
    render(<StockPage />)
    await screen.findByRole('option', { name: 'Roman' })

    fireEvent.change(screen.getByLabelText('Rechercher'), { target: { value: 'île' } })
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'livre' } })
    fireEvent.change(screen.getByLabelText('Catégorie'), { target: { value: 'roman' } })

    await waitFor(() =>
      expect(requetes.at(-1)?.url).toBe('/api/stock?q=%C3%AEle&type=livre&categorie=roman'),
    )
  })

  it('n affiche que les articles épuisés', async () => {
    simulerApi()
    render(<StockPage />)
    await tableauStock().findByRole('button', { name: "L'Île au trésor" })

    fireEvent.change(screen.getByLabelText('État'), { target: { value: 'epuises' } })

    expect(tableauStock().getByRole('button', { name: 'Casino Royale' })).toBeInTheDocument()
    expect(tableauStock().queryByRole('button', { name: "L'Île au trésor" })).not.toBeInTheDocument()
    expect(tableauStock().queryByRole('button', { name: 'Carnet ligné A5' })).not.toBeInTheDocument()
  })

  it('n affiche que les articles avec des défectueux', async () => {
    simulerApi()
    render(<StockPage />)
    await tableauStock().findByRole('button', { name: "L'Île au trésor" })

    fireEvent.change(screen.getByLabelText('État'), { target: { value: 'defectueux' } })

    expect(tableauStock().getByRole('button', { name: 'Carnet ligné A5' })).toBeInTheDocument()
    expect(tableauStock().queryByRole('button', { name: 'Casino Royale' })).not.toBeInTheDocument()
  })

  it('signale une liste vide', async () => {
    simulerApi(({ url }) => (url.startsWith('/api/stock?') ? json([]) : undefined))
    render(<StockPage />)
    await tableauStock().findByRole('button', { name: "L'Île au trésor" })

    fireEvent.change(screen.getByLabelText('Rechercher'), { target: { value: 'introuvable' } })

    expect(await screen.findByText('Aucun article ne correspond.')).toBeInTheDocument()
  })

  it('ouvre les actions et filtre le journal sur l article choisi', async () => {
    const requetes = simulerApi()
    render(<StockPage />)

    fireEvent.click(await tableauStock().findByRole('button', { name: "L'Île au trésor" }))

    expect(screen.getByRole('heading', { name: "L'Île au trésor" })).toBeInTheDocument()
    expect(screen.getByLabelText('Quantité enregistrée')).toHaveValue(12)
    expect(screen.getByRole('combobox', { name: 'Article' })).toHaveValue('p-1')
    await waitFor(() => expect(requetes.at(-1)?.url).toBe('/api/mouvements?produit=p-1'))
  })

  it('recharge le stock et le journal après une correction', async () => {
    let corrige = false
    const requetes = simulerApi(({ url, methode }) => {
      if (methode === 'POST') {
        corrige = true
        return json({ ...ile, quantitePhysique: 11, quantiteVendable: 9 })
      }
      if (url.startsWith('/api/stock') && corrige) {
        return json([{ ...ile, quantitePhysique: 11, quantiteVendable: 9 }, casino, carnet])
      }
      return undefined
    })
    render(<StockPage />)
    fireEvent.click(await tableauStock().findByRole('button', { name: "L'Île au trésor" }))

    const inventaire = within(screen.getByRole('region', { name: 'Correction d’inventaire' }))
    fireEvent.change(inventaire.getByLabelText('Quantité comptée'), { target: { value: '11' } })
    fireEvent.change(inventaire.getByLabelText('Motif'), { target: { value: 'Comptage annuel' } })
    fireEvent.click(inventaire.getByRole('button', { name: 'Enregistrer la correction' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Correction d’inventaire enregistrée.')
    await waitFor(() => expect(screen.getByLabelText('Quantité enregistrée')).toHaveValue(11))
    const apres = requetes.slice(requetes.findIndex((requete) => requete.methode === 'POST') + 1)
    expect(apres.some((requete) => requete.url.startsWith('/api/stock'))).toBe(true)
    expect(apres.some((requete) => requete.url === '/api/mouvements?produit=p-1')).toBe(true)
  })

  it('recharge le stock modifié entre-temps et garde l explication', async () => {
    let refuse = false
    simulerApi(({ url, methode }) => {
      if (methode === 'POST') {
        refuse = true
        return json({ code: 'STOCK_MODIFIE', message: 'Conflit.' }, 409)
      }
      if (url.startsWith('/api/stock') && refuse) {
        return json([{ ...ile, quantitePhysique: 9, quantiteVendable: 7 }, casino, carnet])
      }
      return undefined
    })
    render(<StockPage />)
    fireEvent.click(await tableauStock().findByRole('button', { name: "L'Île au trésor" }))

    const defectueux = within(screen.getByRole('region', { name: 'Stock défectueux' }))
    fireEvent.change(defectueux.getByLabelText('Quantité'), { target: { value: '1' } })
    fireEvent.change(defectueux.getByLabelText('Motif'), { target: { value: 'Abîmé' } })
    fireEvent.click(defectueux.getByRole('button', { name: 'Passer en défectueux' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Le stock a changé, rechargez et recommencez.',
    )
    await waitFor(() => expect(screen.getByLabelText('Quantité enregistrée')).toHaveValue(9))
    expect(screen.getByText('7 vendables, 0 défectueux.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Le stock a changé, rechargez et recommencez.')
  })
})
