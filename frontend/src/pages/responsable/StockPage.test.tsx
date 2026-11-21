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
  if (url.startsWith('/api/reapprovisionnement')) {
    return json([])
  }
  if (url === '/api/seuils-alerte') {
    return json([{ produitId: 'p-1', seuilAlerte: 20, parDefaut: true }])
  }
  if (url.startsWith('/api/produits')) {
    return json([])
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

async function ligne(titre: string) {
  const element = await tableauStock().findByText(titre, { selector: '.article-titre' })
  return element.closest('tr') as HTMLElement
}

function titres() {
  return Array.from(document.querySelectorAll('.liste tbody .article .article-titre'))
    .filter((titre) => titre.closest('section')?.getAttribute('aria-label') === 'Stock par article')
    .map((titre) => titre.textContent)
}

describe('page stock du responsable', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche le stock de chaque article, le bilan et le journal des mouvements', async () => {
    simulerApi()
    render(<StockPage />)

    const rangee = await ligne("L'Île au trésor")
    expect(within(rangee).getAllByRole('cell').map((cellule) => cellule.textContent)).toEqual([
      "L'Île au trésorLIV-001",
      '12',
      '2',
      '10',
      '0',
      'Disponible',
      '',
    ])
    expect(within(await ligne('Casino Royale')).getByText('Épuisé')).toHaveClass('statut-fini')
    expect(screen.getByRole('img', { name: '56 en vente, 2 mis de côté, 2 défectueux' })).toBeInTheDocument()
    const journal = within(screen.getByRole('region', { name: 'Journal des mouvements' }))
    expect(await journal.findByText('Commande en ligne C-0087')).toBeInTheDocument()
    expect(journal.getByText('Client')).toBeInTheDocument()
    expect(document.title).toBe('Stock et mouvements · Feuillet')
  })

  it('n ouvre aucune action tant qu aucun article n est choisi', async () => {
    simulerApi()
    render(<StockPage />)
    await ligne("L'Île au trésor")

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enregistrer la correction' })).not.toBeInTheDocument()
  })

  it('affiche une erreur de chargement', async () => {
    simulerApi(({ url }) =>
      url.startsWith('/api/stock') ? json({ code: 'INTERDIT', message: 'Accès réservé au responsable.' }, 403) : undefined,
    )
    render(<StockPage />)

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0)
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Accès réservé au responsable.')
  })

  it('envoie la recherche, le type et la catégorie au serveur', async () => {
    const requetes = simulerApi()
    render(<StockPage />)
    await screen.findByRole('option', { name: 'Roman' })

    fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher un article' }), { target: { value: 'île' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Type d’article' }), { target: { value: 'livre' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Catégorie' }), { target: { value: 'roman' } })

    await waitFor(() =>
      expect(requetes.some(({ url }) => url === '/api/stock?q=%C3%AEle&type=livre&categorie=roman')).toBe(true),
    )
  })

  it('n affiche que les articles épuisés', async () => {
    simulerApi()
    render(<StockPage />)
    await ligne("L'Île au trésor")

    fireEvent.click(screen.getByRole('button', { name: 'Épuisés' }))

    expect(titres()).toEqual(['Casino Royale'])
    expect(screen.getByRole('button', { name: 'Épuisés' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('n affiche que les articles sous leur seuil d alerte selon le serveur', async () => {
    const requetes = simulerApi(({ url }) =>
      url.startsWith('/api/reapprovisionnement')
        ? json([
            {
              produitId: 'p-2',
              reference: 'LIV-002',
              designation: 'Casino Royale',
              quantiteVendable: 0,
              quantiteAcheteeOrigine: 8,
              seuilAlerte: 20,
              pourcentageVendu: 100,
              quantiteEnCommande: 0,
            },
          ])
        : undefined,
    )
    render(<StockPage />)
    await ligne("L'Île au trésor")

    fireEvent.click(screen.getByRole('button', { name: 'Stock bas' }))

    await waitFor(() => expect(titres()).toEqual(['Casino Royale']))
    expect(requetes.some(({ url }) => url === '/api/reapprovisionnement')).toBe(true)
  })

  it('n affiche que les articles avec des défectueux', async () => {
    simulerApi()
    render(<StockPage />)
    await ligne("L'Île au trésor")

    fireEvent.click(screen.getByRole('button', { name: 'Avec défectueux' }))

    expect(titres()).toEqual(['Carnet ligné A5'])
  })

  it('signale une liste vide', async () => {
    simulerApi(({ url }) => (url.startsWith('/api/stock?') ? json([]) : undefined))
    render(<StockPage />)
    await ligne("L'Île au trésor")

    fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher un article' }), {
      target: { value: 'introuvable' },
    })

    expect(await screen.findByText('Aucun article ne correspond.')).toBeInTheDocument()
  })

  it('ouvre un article dans un volet avec ses chiffres et ses mouvements, puis le ferme', async () => {
    const requetes = simulerApi()
    render(<StockPage />)

    fireEvent.click(await ligne("L'Île au trésor"))

    const volet = within(screen.getByRole('complementary', { name: 'Article choisi' }))
    expect(volet.getByRole('heading', { name: "L'Île au trésor" })).toBeInTheDocument()
    expect(volet.getByText('Seuil d’alerte à 20 %, celui par défaut')).toBeInTheDocument()
    expect(volet.getByText('En réserve').nextElementSibling).toHaveTextContent('12')
    expect(volet.getByLabelText('Quantité enregistrée')).toHaveValue(12)
    expect(screen.getByRole('button', { name: 'Fermer le volet' })).toHaveFocus()
    expect(await volet.findByText('Vente')).toBeInTheDocument()
    expect(requetes.some(({ url }) => url === '/api/mouvements?produit=p-1')).toBe(true)
    expect(screen.getByRole('combobox', { name: 'Article' })).toHaveValue('')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()

    fireEvent.keyDown(await ligne('Casino Royale'), { key: 'Enter' })
    expect(screen.getByRole('complementary', { name: 'Article choisi' })).toBeInTheDocument()
    fireEvent.click(document.querySelector('.tiroir-fond') as Element)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('montre l écart pendant le comptage', async () => {
    simulerApi()
    render(<StockPage />)
    fireEvent.click(await ligne("L'Île au trésor"))

    fireEvent.change(screen.getByLabelText('Quantité comptée'), { target: { value: '10' } })

    expect(screen.getByText('Écart avec le stock enregistré').nextElementSibling).toHaveTextContent('−2')
  })

  it('recharge le stock et les mouvements après une correction', async () => {
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
    fireEvent.click(await ligne("L'Île au trésor"))

    const inventaire = within(screen.getByRole('region', { name: 'Correction d’inventaire' }))
    fireEvent.change(inventaire.getByLabelText('Quantité comptée'), { target: { value: '11' } })
    fireEvent.change(inventaire.getByLabelText('Motif'), { target: { value: 'Comptage annuel' } })
    fireEvent.click(inventaire.getByRole('button', { name: 'Enregistrer la correction' }))

    expect(await screen.findByText('Correction d’inventaire enregistrée.')).toHaveAttribute('role', 'status')
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
    fireEvent.click(await ligne("L'Île au trésor"))
    fireEvent.click(screen.getByRole('button', { name: 'Abîmé' }))

    const defectueux = within(screen.getByRole('region', { name: 'Stock défectueux' }))
    fireEvent.change(defectueux.getByLabelText('Quantité'), { target: { value: '1' } })
    fireEvent.change(defectueux.getByLabelText('Motif'), { target: { value: 'Abîmé' } })
    fireEvent.click(defectueux.getByRole('button', { name: 'Passer en défectueux' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Le stock a changé, rechargez et recommencez.')
    const volet = within(screen.getByRole('complementary', { name: 'Article choisi' }))
    await waitFor(() => expect(volet.getByText('En réserve').nextElementSibling).toHaveTextContent('9'))
    expect(screen.getByText('7 vendables, 0 défectueux.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Le stock a changé, rechargez et recommencez.')
  })

  it('propose la sortie du stock défectueux', async () => {
    simulerApi()
    render(<StockPage />)
    fireEvent.click(await ligne('Carnet ligné A5'))

    fireEvent.click(screen.getByRole('button', { name: 'Sortie du défectueux' }))

    const sortie = within(screen.getByRole('region', { name: 'Sortie du stock défectueux' }))
    expect(sortie.getByLabelText('Issue')).toHaveValue('Renvoi fournisseur')
    expect(sortie.getByRole('button', { name: 'Enregistrer la sortie' })).toBeEnabled()
  })
})
