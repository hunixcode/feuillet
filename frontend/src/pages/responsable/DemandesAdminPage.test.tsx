import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  demandeDeTest,
  demandeHorsCatalogue,
  demandeMiseDeCote,
} from '../../components/responsable/demandesDeTest'
import DemandesAdminPage from './DemandesAdminPage.tsx'

const proche = demandeMiseDeCote({
  id: 'd-4',
  titre: 'Vingt mille lieues sous les mers',
  miseDeCote: { quantite: 2, dateLimite: '2026-11-14T09:59:59.999Z' },
})

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
    if (
      requete.url.startsWith('/api/produits') ||
      requete.url.startsWith('/api/categories') ||
      requete.url.startsWith('/api/commandes-fournisseur')
    ) {
      return json([])
    }
    return json([demandeDeTest(), demandeHorsCatalogue(), demandeMiseDeCote(), proche])
  })
  return requetes
}

function titres() {
  return Array.from(document.querySelectorAll('.liste tbody .article-titre')).map((titre) => titre.textContent)
}

function ligne(titre: string) {
  return screen.getByText(titre, { selector: '.article-titre' }).closest('tr') as HTMLElement
}

describe('page des demandes et mises de côté', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-12T20:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('liste d abord les demandes en attente, avec les compteurs de chaque onglet', async () => {
    const requetes = simulerApi()
    render(<DemandesAdminPage />)

    await screen.findByText('Le Rouge et le Noir')
    expect(titres()).toHaveLength(2)
    expect(screen.getByRole('button', { name: /^En attente/ })).toHaveTextContent('En attente2')
    expect(screen.getByRole('button', { name: /^Mises de côté/ })).toHaveTextContent('Mises de côté2')
    expect(screen.getByRole('button', { name: /^Terminées/ })).toHaveTextContent('Terminées0')
    expect(within(ligne('Le Rouge et le Noir')).getByText('Absent du catalogue')).toBeInTheDocument()
    expect(within(ligne('L’Île au trésor')).getByText('Épuisé, à commander')).toBeInTheDocument()
    expect(within(ligne('L’Île au trésor')).getByText('En attente')).toHaveClass('statut-attente')
    expect(requetes.map((requete) => requete.url)).toContain('/api/demandes')
    expect(document.title).toBe('Demandes et mises de côté · Feuillet')
  })

  it('montre les mises de côté, de la date limite la plus proche à la plus lointaine', async () => {
    simulerApi()
    render(<DemandesAdminPage />)
    await screen.findByText('Le Rouge et le Noir')

    fireEvent.click(screen.getByRole('button', { name: /^Mises de côté/ }))

    expect(titres()).toEqual(['Vingt mille lieues sous les mers', 'Sakamoto Days, tome 2'])
    expect(within(ligne('Vingt mille lieues sous les mers')).getByText('Gardé, demain')).toHaveClass('statut-cote')
  })

  it('cherche une demande par titre ou par client', async () => {
    simulerApi()
    render(<DemandesAdminPage />)
    await screen.findByText('Le Rouge et le Noir')

    fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher une demande par titre ou client' }), {
      target: { value: 'rouge' },
    })

    expect(titres()).toEqual(['Le Rouge et le Noir'])
  })

  it('ouvre une demande dans un volet, rappelle qu elle n est pas une vente, puis le ferme', async () => {
    simulerApi()
    render(<DemandesAdminPage />)
    await screen.findByText('Le Rouge et le Noir')

    fireEvent.click(ligne('Le Rouge et le Noir'))

    const volet = within(screen.getByRole('complementary', { name: 'Demande choisie' }))
    expect(volet.getByRole('heading', { name: 'Le Rouge et le Noir' })).toBeInTheDocument()
    expect(volet.getByText(/Une demande n’est pas une vente : le client n’a rien payé/)).toBeInTheDocument()
    expect(volet.getByRole('heading', { name: 'Ajouter ce livre au catalogue' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fermer la demande' })).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()

    fireEvent.keyDown(ligne('L’Île au trésor'), { key: 'Enter' })
    expect(screen.getByRole('complementary', { name: 'Demande choisie' })).toBeInTheDocument()
    fireEvent.click(document.querySelector('.tiroir-fond') as Element)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('recharge les listes après un rattachement', async () => {
    const requetes = simulerApi(({ url, methode }) =>
      url === '/api/demandes/d-2/rattachement' && methode === 'POST'
        ? json({ ...demandeHorsCatalogue(), produitId: 'p-1' })
        : url.startsWith('/api/produits')
          ? json([
              {
                id: 'p-1',
                reference: 'LIV-001',
                designation: 'Le Rouge et le Noir',
                type: 'livre',
                categorie: 'roman',
                prix: 1900,
                tauxTva: 5,
                archive: false,
                prixApplique: 1900,
              },
            ])
          : undefined,
    )
    render(<DemandesAdminPage />)
    await screen.findByText('Le Rouge et le Noir')
    fireEvent.click(ligne('Le Rouge et le Noir'))
    const chargements = () => requetes.filter((requete) => requete.url === '/api/demandes').length
    const avant = chargements()

    fireEvent.click(screen.getByRole('radio', { name: 'Il est déjà au catalogue' }))
    fireEvent.change(screen.getByLabelText('Article du catalogue'), { target: { value: 'p-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rattacher la demande' }))

    expect(await screen.findByRole('status')).toHaveTextContent('La demande est rattachée')
    expect(screen.queryByRole('heading', { name: 'Ajouter ce livre au catalogue' })).not.toBeInTheDocument()
    await waitFor(() => expect(chargements()).toBeGreaterThan(avant))
  })

  it('indique quand il n y a aucune demande', async () => {
    simulerApi(({ url }) => (url.startsWith('/api/demandes') ? json([]) : undefined))
    render(<DemandesAdminPage />)

    expect(await screen.findByText('Aucune demande ici.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('affiche une erreur de chargement', async () => {
    simulerApi(({ url }) =>
      url.startsWith('/api/demandes') ? json({ code: 'INTERDIT', message: 'Accès réservé au responsable.' }, 403) : undefined,
    )
    render(<DemandesAdminPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Accès réservé au responsable.')
  })
})
