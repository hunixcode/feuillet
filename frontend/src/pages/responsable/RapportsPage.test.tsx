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
    if (url.startsWith('/api/produits') || url.startsWith('/api/commandes-fournisseur')) {
      return json([])
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
  return within(screen.getByRole('region', { name: 'Résultats de la période' }))
}

function zoneArticles() {
  return within(screen.getByRole('region', { name: 'Par article' }))
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

    expect(await zoneRapport().findByText('Semaine du 9 au 15 novembre')).toBeInTheDocument()
    expect(urls).toEqual(
      expect.arrayContaining([
        '/api/rapports?semaine=2026-11-14',
        '/api/reapprovisionnement',
        '/api/categories',
        '/api/rapports?debut=2026-11-02&fin=2026-11-08',
        '/api/rapports?debut=2026-11-14&fin=2026-11-14',
      ]),
    )
    expect(urls).not.toContain('/api/rapports?debut=2026-11-15&fin=2026-11-15')
    expect(screen.getByRole('button', { name: 'Semaine suivante' })).toBeDisabled()
    expect(document.title).toBe('Réapprovisionnement et rapports · Feuillet')
  })

  it('pose l équation des ventes, des retours et du net, avec les quantités', async () => {
    simulerApi()
    afficher()

    const net = await zoneRapport().findByText('Net', { selector: 'dt' })
    expect(net.nextElementSibling).toHaveTextContent('8 700XPF')
    expect(zoneRapport().getByText('Ventes brutes', { selector: 'dt' }).nextElementSibling).toHaveTextContent('10 500XPF')
    expect(zoneRapport().getByText('Retours', { selector: 'dt' }).nextElementSibling).toHaveTextContent('1 800XPF')
    expect(
      zoneRapport().getByText(/^7 articles vendus, 1 retourné, 6 nets, sur 2 commandes\. Panier moyen 5 250 XPF, 2 retours enregistrés/),
    ).toBeInTheDocument()
    expect(zoneRapport().getByText('Ventes brutes', { selector: 'dt' })).toHaveAttribute(
      'data-bulle-texte',
      expect.stringMatching(/sans les frais d’emballage cadeau/),
    )
    expect((await zoneRapport().findAllByText('0 % sur la semaine précédente')).length).toBe(3)
  })

  it('dessine les ventes nettes jour par jour', async () => {
    simulerApi()
    afficher()

    expect(
      await zoneRapport().findByRole('img', { name: 'Ventes nettes par jour, du 9 au 15 novembre' }),
    ).toBeInTheDocument()
    expect(zoneRapport().getByText('Meilleur jour,')).toBeInTheDocument()
  })

  it('liste les articles à recommander avec leur part vendue et leur commande en route', async () => {
    simulerApi()
    afficher()

    const section = within(screen.getByRole('region', { name: 'À recommander' }))
    const rangee = (await section.findByText('Casino Royale')).closest('li') as HTMLElement
    expect(rangee).toHaveTextContent('100 % vendu, 0 en vente sur 8, seuil à 20 %')
    expect(within(rangee).getByText('5 en commande')).toBeInTheDocument()
    expect(section.getByRole('link', { name: 'Passer une commande fournisseur' })).toHaveAttribute(
      'href',
      '/admin/commandes',
    )
  })

  it('cache les articles sans activité jusqu à ce qu on les demande', async () => {
    simulerApi()
    afficher()

    const ligne = (await zoneArticles().findByText("L'Île au trésor")).closest('tr') as HTMLElement
    expect(within(ligne).getAllByRole('cell').map((cellule) => cellule.textContent)).toEqual([
      "L'Île au trésor5 400 XPF nets",
      '4',
      '1',
      '3',
      '6',
    ])
    expect(within(ligne).getAllByRole('cell')[3]).toHaveAttribute(
      'data-bulle-texte',
      'Ventes 7 200 XPF, retours 1 800 XPF, 1 remplacement, 30 % de l’achat vendu.',
    )
    expect(zoneArticles().queryByText('Gomme blanche')).not.toBeInTheDocument()

    fireEvent.click(zoneArticles().getByRole('checkbox', { name: 'Afficher aussi les articles sans vente ni retour' }))

    expect(zoneArticles().getByText('Gomme blanche').closest('tr')).toHaveTextContent('30')
  })

  it('passe à la semaine précédente et filtre par catégorie', async () => {
    const urls = simulerApi()
    afficher()
    await zoneRapport().findByText('Semaine du 9 au 15 novembre')

    fireEvent.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await waitFor(() => expect(urls).toContain('/api/rapports?semaine=2026-11-07'))

    fireEvent.change(await screen.findByRole('combobox', { name: 'Catégorie' }), { target: { value: 'roman' } })
    await waitFor(() => expect(urls).toContain('/api/rapports?semaine=2026-11-07&categorie=roman'))
  })

  it('vérifie les dates d une période libre avant de la demander', async () => {
    const urls = simulerApi()
    afficher()
    await zoneRapport().findByText('Semaine du 9 au 15 novembre')
    fireEvent.click(screen.getByRole('button', { name: 'Période libre' }))

    fireEvent.click(screen.getByRole('button', { name: 'Afficher' }))

    expect(screen.getByLabelText('Du')).toHaveAccessibleDescription('Choisissez la date de début.')
    expect(screen.getByLabelText('Au')).toHaveAccessibleDescription('Choisissez la date de fin.')

    fireEvent.change(screen.getByLabelText('Du'), { target: { value: '2026-11-10' } })
    fireEvent.change(screen.getByLabelText('Au'), { target: { value: '2026-11-05' } })
    fireEvent.click(screen.getByRole('button', { name: 'Afficher' }))

    expect(screen.getByLabelText('Du')).not.toHaveAttribute('aria-invalid')
    expect(screen.getByLabelText('Au')).toHaveAccessibleDescription(
      'La date de fin doit être après la date de début.',
    )
    expect(urls).not.toContain('/api/rapports?debut=2026-11-10&fin=2026-11-05')

    fireEvent.change(screen.getByLabelText('Au'), { target: { value: '2026-11-30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Afficher' }))
    await waitFor(() => expect(urls).toContain('/api/rapports?debut=2026-11-10&fin=2026-11-30'))
  })

  it('explique une période refusée par le serveur', async () => {
    simulerApi({
      rapport: json({ code: 'PERIODE_INVALIDE', message: 'La période demandée est invalide.' }, 400),
    })
    afficher()

    expect(await zoneRapport().findByRole('alert')).toHaveTextContent('La période demandée est invalide.')
    expect(screen.getByRole('button', { name: 'Exporter en CSV' })).toBeDisabled()
  })

  it('exporte en CSV le rapport affiché', async () => {
    const urls = simulerApi()
    const creer = vi.fn(() => 'blob:rapport')
    const liberer = vi.fn()
    Object.assign(URL, { createObjectURL: creer, revokeObjectURL: liberer })
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('rapport-2026-11-09-2026-11-15.csv')
      expect(this.href).toBe('blob:rapport')
    })
    afficher()
    await zoneRapport().findByText('Semaine du 9 au 15 novembre')

    fireEvent.click(screen.getByRole('button', { name: 'Exporter en CSV' }))

    await waitFor(() => expect(clic).toHaveBeenCalledTimes(1))
    expect(creer).toHaveBeenCalled()
    expect(urls).toContain('/api/rapports/export.csv?semaine=2026-11-14')
    expect(liberer).toHaveBeenCalledWith('blob:rapport')
  })

  it('explique un export refusé', async () => {
    simulerApi({ csv: json({ code: 'INTERDIT', message: 'Accès réservé au responsable.' }, 403) })
    afficher()
    await zoneRapport().findByText('Semaine du 9 au 15 novembre')

    fireEvent.click(screen.getByRole('button', { name: 'Exporter en CSV' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Accès réservé au responsable.')
  })

  it('signale une erreur de chargement des articles à recommander', async () => {
    simulerApi({ reappro: json({ code: 'INTERDIT', message: 'Accès réservé au responsable.' }, 403) })
    afficher()

    const section = within(screen.getByRole('region', { name: 'À recommander' }))
    expect(await section.findByRole('alert')).toHaveTextContent('Accès réservé au responsable.')
  })
})
