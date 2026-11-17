import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    if (requete.url.startsWith('/api/produits') || requete.url.startsWith('/api/categories')) {
      return json([])
    }
    if (requete.url === '/api/demandes?statut=mise_de_cote') {
      return json([demandeMiseDeCote(), proche])
    }
    if (requete.url === '/api/demandes?statut=en_attente') {
      return json([demandeDeTest(), demandeHorsCatalogue()])
    }
    return json([demandeDeTest(), demandeHorsCatalogue(), demandeMiseDeCote(), proche])
  })
  return requetes
}

function section(nom: RegExp) {
  return within(screen.getByRole('region', { name: nom }))
}

describe('page des demandes et mises de côté', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('montre les mises de côté, de la date limite la plus proche à la plus lointaine', async () => {
    simulerApi()
    render(<DemandesAdminPage />)

    const misesDeCote = section(/Mises de côté en cours/)
    await misesDeCote.findByRole('button', { name: 'Vingt mille lieues sous les mers' })
    const titres = misesDeCote.getAllByRole('button').map((bouton) => bouton.textContent)
    expect(titres).toEqual(['Vingt mille lieues sous les mers', 'Sakamoto Days, tome 2'])
    expect(misesDeCote.getByText('2', { selector: '.demandes-compte' })).toBeInTheDocument()
    expect(document.title).toBe('Demandes et mises de côté · Feuillet')
  })

  it('liste d abord les demandes en attente puis filtre par statut', async () => {
    const requetes = simulerApi()
    render(<DemandesAdminPage />)

    const demandes = section(/Demandes/)
    expect(await demandes.findByRole('button', { name: 'Le Rouge et le Noir' })).toBeInTheDocument()
    expect(requetes.map((requete) => requete.url)).toContain('/api/demandes?statut=en_attente')

    fireEvent.change(screen.getByLabelText('Statut'), { target: { value: '' } })

    await waitFor(() => expect(requetes.map((requete) => requete.url)).toContain('/api/demandes'))
    expect(await section(/Toutes les demandes/).findAllByRole('button', { name: 'Sakamoto Days, tome 2' })).toHaveLength(1)
  })

  it('rappelle qu une demande n est pas une vente', async () => {
    simulerApi()
    render(<DemandesAdminPage />)

    expect(screen.getByText(/Une demande n’est pas une vente : le client ne paie rien/)).toBeInTheDocument()
    await section(/Demandes/).findByRole('button', { name: 'L’Île au trésor' })
  })

  it('ouvre une demande dans un volet puis le ferme', async () => {
    simulerApi()
    const { container } = render(<DemandesAdminPage />)

    fireEvent.click(await section(/Demandes/).findByRole('button', { name: 'Le Rouge et le Noir' }))

    const volet = within(screen.getByRole('complementary', { name: 'Demande choisie' }))
    expect(volet.getByRole('heading', { name: 'Le Rouge et le Noir' })).toBeInTheDocument()
    expect(volet.getByRole('heading', { name: 'Ajouter ce livre au catalogue' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fermer la demande' })).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()

    fireEvent.click(section(/Mises de côté en cours/).getByRole('button', { name: 'Sakamoto Days, tome 2' }))
    fireEvent.click(container.querySelector('.demandes-voile') as Element)
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
    fireEvent.click(await section(/Demandes/).findByRole('button', { name: 'Le Rouge et le Noir' }))
    const chargements = () => requetes.filter((requete) => requete.url === '/api/demandes?statut=en_attente').length
    const avant = chargements()

    fireEvent.click(screen.getByRole('radio', { name: 'Il est déjà au catalogue' }))
    fireEvent.change(screen.getByLabelText('Article du catalogue'), { target: { value: 'p-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rattacher la demande' }))

    expect(await screen.findByRole('status')).toHaveTextContent('La demande est rattachée')
    expect(screen.queryByRole('heading', { name: 'Ajouter ce livre au catalogue' })).not.toBeInTheDocument()
    await waitFor(() => expect(chargements()).toBeGreaterThan(avant))
  })

  it('indique quand il n y a ni mise de côté ni demande', async () => {
    simulerApi(({ url }) => (url.startsWith('/api/demandes') ? json([]) : undefined))
    render(<DemandesAdminPage />)

    expect(await screen.findByText('Aucun article n’est mis de côté.')).toBeInTheDocument()
    expect(await screen.findByText('Aucune demande ne correspond.')).toBeInTheDocument()
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
