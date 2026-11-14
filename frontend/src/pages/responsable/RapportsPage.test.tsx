import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Rapport } from '../../types/rapport'
import type { ProduitAReapprovisionner } from '../../types/reappro'
import RapportsPage from './RapportsPage.tsx'

const casino: ProduitAReapprovisionner = {
  produitId: 'p-3',
  reference: 'LIV-003',
  designation: 'Casino Royale',
  quantiteVendable: 0,
  quantiteAcheteeOrigine: 8,
  seuilAlerte: 20,
  pourcentageVendu: 100,
  quantiteEnCommande: 5,
}

const rapport: Rapport = {
  periode: { debut: '2026-11-09', fin: '2026-11-15' },
  totaux: {
    ventesBrutes: 10500,
    retours: 1800,
    net: 8700,
    quantiteVendue: 7,
    quantiteRetournee: 1,
    quantiteNette: 6,
  },
  statistiques: { nombreVentes: 2, panierMoyen: 5250, nombreRetours: 2 },
  produits: [
    {
      produitId: 'p-1',
      reference: 'LIV-001',
      designation: "L'Île au trésor",
      categorie: 'roman',
      quantiteVendue: 4,
      montantVentes: 7200,
      quantiteRetournee: 1,
      montantRetours: 1800,
      quantiteNette: 3,
      montantNet: 5400,
      quantiteRemplacee: 1,
      stockRestant: 6,
      pourcentageVendu: 30,
    },
    {
      produitId: 'p-9',
      reference: 'PAP-009',
      designation: 'Gomme blanche',
      categorie: 'papeterie',
      quantiteVendue: 0,
      montantVentes: 0,
      quantiteRetournee: 0,
      montantRetours: 0,
      quantiteNette: 0,
      montantNet: 0,
      quantiteRemplacee: 0,
      stockRestant: 30,
      pourcentageVendu: 0,
    },
  ],
}

function json(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

interface Simulation {
  rapport?: Response
  reappro?: Response
  csv?: Response
}

function simulerApi(simulation: Simulation = {}) {
  const urls: string[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree) => {
    const url = String(entree)
    urls.push(url)
    if (url.startsWith('/api/categories')) {
      return json([
        { id: 'roman', libelle: 'Roman' },
        { id: 'papeterie', libelle: 'Papeterie' },
      ])
    }
    if (url.startsWith('/api/reapprovisionnement')) {
      return simulation.reappro?.clone() ?? json([casino])
    }
    if (url.startsWith('/api/rapports/export.csv')) {
      return (
        simulation.csv?.clone() ??
        new Response('produit;net', {
          headers: { 'Content-Disposition': 'attachment; filename="rapport-2026-11-09-2026-11-15.csv"' },
        })
      )
    }
    return simulation.rapport?.clone() ?? json(rapport)
  })
  return urls
}

function afficher() {
  render(
    <MemoryRouter>
      <RapportsPage />
    </MemoryRouter>,
  )
}

function zoneRapport() {
  return within(screen.getByRole('region', { name: 'Rapport d’activité' }))
}

describe('page des rapports', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-14T20:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('charge la semaine en cours, les articles à recommander et les catégories', async () => {
    const urls = simulerApi()
    afficher()

    await screen.findByText('Du 9 novembre 2026 au 15 novembre 2026, toutes catégories')
    expect(urls).toEqual(
      expect.arrayContaining([
        '/api/categories',
        '/api/reapprovisionnement',
        '/api/rapports?semaine=2026-11-14',
      ]),
    )
    expect(document.title).toBe('Réapprovisionnement et rapports · Feuillet')
  })

  it('liste les articles à recommander avec leur nombre', async () => {
    simulerApi()
    afficher()

    const section = within(await screen.findByRole('region', { name: /À recommander/ }))
    await section.findByText('Casino Royale')
    expect(section.getByText('1', { selector: '.rapports-compte' })).toBeInTheDocument()
    expect(section.getByText('Casino Royale').closest('tr')).toHaveTextContent('100 %')
    expect(section.getByRole('link', { name: 'Passer une commande fournisseur' })).toHaveAttribute(
      'href',
      '/admin/commandes',
    )
  })

  it('sépare les statistiques des ventes, des retours et le net', async () => {
    simulerApi()
    afficher()

    await screen.findByText(/Du 9 novembre 2026/)
    const ventes = within(screen.getByRole('region', { name: 'Ventes' }))
    expect(ventes.getByText('Ventes brutes').closest('dt')?.nextElementSibling).toHaveTextContent('10 500 XPF')
    expect(ventes.getByText('Commandes').closest('dt')?.nextElementSibling).toHaveTextContent('2')
    expect(ventes.getByText('Panier moyen').closest('dt')?.nextElementSibling).toHaveTextContent('5 250 XPF')
    const retours = within(screen.getByRole('region', { name: 'Retours' }))
    expect(retours.getByText('Montant des retours').closest('dt')?.nextElementSibling).toHaveTextContent('1 800 XPF')
    expect(retours.getByText('Retours enregistrés').closest('dt')?.nextElementSibling).toHaveTextContent('2')
    const net = within(screen.getByRole('region', { name: 'Net' }))
    expect(net.getByText('Vente nette').closest('dt')?.nextElementSibling).toHaveTextContent('8 700 XPF')
    expect(net.getByText('Articles nets').closest('dt')?.nextElementSibling).toHaveTextContent('6')
    expect(ventes.getByText('Panier moyen')).toHaveAccessibleDescription(
      'Montant moyen d’une commande : montant des articles divisé par le nombre de commandes.',
    )
  })

  it('cache les articles sans activité jusqu à ce qu on les demande', async () => {
    simulerApi()
    afficher()

    await zoneRapport().findByText("L'Île au trésor")
    expect(zoneRapport().queryByText('Gomme blanche')).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Afficher aussi les articles sans vente ni retour' }),
    )

    expect(zoneRapport().getByText('Gomme blanche').closest('tr')).toHaveTextContent('30')
  })

  it('demande une autre semaine filtrée par catégorie', async () => {
    const urls = simulerApi()
    afficher()
    await screen.findByText(/Du 9 novembre 2026/)

    fireEvent.change(screen.getByLabelText('Un jour de la semaine'), {
      target: { value: '2026-11-04' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'Catégorie' }), {
      target: { value: 'roman' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Afficher' }))

    await screen.findByText(/catégorie Roman/)
    expect(urls).toContain('/api/rapports?semaine=2026-11-04&categorie=roman')
  })

  it('vérifie les dates d une période libre sous chaque champ', async () => {
    const urls = simulerApi()
    afficher()
    await screen.findByText(/Du 9 novembre 2026/)

    fireEvent.click(screen.getByRole('radio', { name: 'Période libre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Afficher' }))

    expect(screen.getByLabelText('Du')).toHaveAccessibleDescription('Choisissez la date de début.')
    expect(screen.getByLabelText('Au')).toHaveAccessibleDescription('Choisissez la date de fin.')

    fireEvent.change(screen.getByLabelText('Du'), { target: { value: '2026-11-10' } })
    fireEvent.change(screen.getByLabelText('Au'), { target: { value: '2026-11-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Afficher' }))

    expect(screen.getByLabelText('Du')).not.toHaveAttribute('aria-invalid')
    expect(screen.getByLabelText('Au')).toHaveAccessibleDescription(
      'La date de fin doit être après la date de début.',
    )
    expect(urls.filter((url) => url.startsWith('/api/rapports?'))).toHaveLength(1)

    fireEvent.change(screen.getByLabelText('Au'), { target: { value: '2026-11-30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Afficher' }))

    await waitFor(() => expect(urls).toContain('/api/rapports?debut=2026-11-10&fin=2026-11-30'))
  })

  it('explique une période refusée par le serveur', async () => {
    simulerApi({
      rapport: json({ code: 'VALIDATION', message: 'La période ne peut pas dépasser 366 jours.' }, 400),
    })
    afficher()

    expect(await zoneRapport().findByRole('alert')).toHaveTextContent(
      'La période ne peut pas dépasser 366 jours.',
    )
    expect(screen.getByRole('button', { name: 'Exporter en CSV' })).toBeDisabled()
  })

  it('exporte en CSV le rapport affiché', async () => {
    const urls = simulerApi()
    const creer = vi.fn(() => 'blob:rapport')
    const liberer = vi.fn()
    Object.assign(URL, { createObjectURL: creer, revokeObjectURL: liberer })
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('rapport-2026-11-09-2026-11-15.csv')
      expect(this.href).toBe('blob:rapport')
    })
    afficher()
    await screen.findByText(/Du 9 novembre 2026/)

    fireEvent.click(screen.getByRole('button', { name: 'Exporter en CSV' }))

    await waitFor(() => expect(clic).toHaveBeenCalledTimes(1))
    expect(urls).toContain('/api/rapports/export.csv?semaine=2026-11-14')
    expect(liberer).toHaveBeenCalledWith('blob:rapport')
  })

  it('explique un export refusé', async () => {
    simulerApi({ csv: json({ code: 'INTERDIT', message: 'Accès réservé au responsable.' }, 403) })
    afficher()
    await screen.findByText(/Du 9 novembre 2026/)

    fireEvent.click(screen.getByRole('button', { name: 'Exporter en CSV' }))

    expect(await zoneRapport().findByRole('alert')).toHaveTextContent('Accès réservé au responsable.')
  })

  it('signale une erreur de chargement des articles à recommander', async () => {
    simulerApi({ reappro: json({ code: 'INTERDIT', message: 'Accès réservé au responsable.' }, 403) })
    afficher()

    const section = within(await screen.findByRole('region', { name: /À recommander/ }))
    expect(await section.findByRole('alert')).toHaveTextContent('Accès réservé au responsable.')
  })
})
