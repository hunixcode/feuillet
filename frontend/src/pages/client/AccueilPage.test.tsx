import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PanierProvider } from '../../contexts/PanierContext.tsx'
import type { Produit } from '../../types/produit'
import AccueilPage from './AccueilPage.tsx'

function produit(id: string, designation: string, categorie: string, autres: Partial<Produit> = {}): Produit {
  return {
    id,
    reference: `LIV-${id}`,
    designation,
    type: 'livre',
    categorie,
    prix: 1000,
    tauxTva: 5,
    archive: false,
    prixApplique: 1000,
    disponibilite: 'disponible',
    ...autres,
  }
}

const categories = [
  { id: 'bd-et-manga', libelle: 'BD et manga' },
  { id: 'jeunesse', libelle: 'Jeunesse' },
  { id: 'roman', libelle: 'Roman' },
]

const sakamoto = produit('p-1', 'Sakamoto Days, tome 1', 'bd-et-manga', { reference: 'DEMO-MAN-001', auteur: 'Yūto Suzuki' })
const onePiece = produit('p-2', 'One Piece, tome 1', 'bd-et-manga')
const ile = produit('p-3', "L'Île au trésor", 'roman')
const prince = produit('p-4', 'Le Petit Prince', 'jeunesse')

function reponse(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

function simulerApi({ produits = [sakamoto, onePiece, ile, prince], meilleures = [onePiece, prince], echec = false } = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree) => {
    if (echec) {
      return reponse({ code: 'ERREUR_SERVEUR', message: 'Erreur inattendue.' }, 500)
    }
    const url = String(entree)
    if (url === '/api/categories') return reponse(categories)
    if (url === '/api/meilleures-ventes') return reponse(meilleures)
    return reponse(produits)
  })
}

function afficher() {
  render(
    <MemoryRouter>
      <PanierProvider>
        <AccueilPage />
      </PanierProvider>
    </MemoryRouter>,
  )
}

describe('page d accueil', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('présente la librairie et mène au catalogue et aux rayons', async () => {
    simulerApi()
    afficher()

    expect(screen.getByRole('heading', { level: 1, name: /choisis avec soin et livrés chez vous/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voir le catalogue' })).toHaveAttribute('href', '/catalogue')
    const rayons = within(await screen.findByRole('navigation', { name: 'Rayons' }))
    expect(rayons.getByRole('link', { name: 'Roman' })).toHaveAttribute('href', '/catalogue?categorie=roman')
  })

  it('montre les plus vendus dans l ordre renvoyé par le serveur', async () => {
    simulerApi()
    afficher()

    const section = within(await screen.findByRole('region', { name: 'Les plus vendus' }))
    const titres = section.getAllByRole('listitem').map((ligne) => ligne.querySelector('.produit-titre')?.textContent)
    expect(titres).toEqual(['One Piece, tome 1', 'Le Petit Prince'])
    expect(section.getByLabelText('Numéro 1')).toBeInTheDocument()
  })

  it('met en avant le coup de cœur et l ajoute au panier', async () => {
    simulerApi()
    afficher()

    const coeur = within(await screen.findByRole('region', { name: 'Sakamoto Days' }))
    expect(coeur.getByText('Le choix de la librairie')).toBeInTheDocument()
    expect(coeur.getByText('Yūto Suzuki, tome 1')).toBeInTheDocument()
    expect(coeur.getByRole('link', { name: 'Voir le manga' })).toHaveAttribute('href', '/produits/p-1')
    fireEvent.click(coeur.getByRole('button', { name: 'Ajouter au panier' }))

    expect(JSON.parse(localStorage.getItem('panier') ?? '[]')).toEqual([{ produitId: 'p-1', quantite: 1 }])
  })

  it('n affiche pas de coup de cœur si l article n est pas au catalogue', async () => {
    simulerApi({ produits: [onePiece, ile, prince] })
    afficher()

    await screen.findByRole('navigation', { name: 'Rayons' })
    expect(screen.queryByText('Le choix de la librairie')).not.toBeInTheDocument()
  })

  it('fait défiler les rayons, les romans d abord puis la BD et le manga', async () => {
    simulerApi()
    afficher()

    const onglets = within(await screen.findByRole('tablist', { name: 'Rayons' })).getAllByRole('tab')
    expect(onglets.map((onglet) => onglet.textContent)).toEqual(['Roman', 'BD et manga', 'Jeunesse'])
    expect(onglets[0]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Rayon précédent' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Rayon suivant' }))

    expect(onglets[1]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'BD et manga' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voir le rayon' })).toHaveAttribute('href', '/catalogue?categorie=bd-et-manga')

    fireEvent.keyDown(onglets[1], { key: 'End' })

    expect(onglets[2]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Rayon suivant' })).toBeDisabled()
  })

  it('propose de réessayer si les rayons n ont pas pu être chargés', async () => {
    const fetchMock = simulerApi({ echec: true })
    afficher()

    expect(await screen.findByRole('alert')).toHaveTextContent('Les rayons n\'ont pas pu être chargés.')
    fetchMock.mockRestore()
    simulerApi()
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(await screen.findByRole('navigation', { name: 'Rayons' })).toBeInTheDocument()
  })

  it('invite à demander un livre absent du catalogue', () => {
    simulerApi()
    afficher()

    expect(screen.getByRole('link', { name: 'Demander un livre' })).toHaveAttribute('href', '/demandes')
  })
})
