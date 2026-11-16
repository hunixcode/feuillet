import { fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Demande } from '../../types/demande'
import type { Rapport } from '../../types/rapport'
import type { CommandeFournisseur, ProduitAReapprovisionner } from '../../types/reappro'
import TableauDeBordPage from './TableauDeBordPage.tsx'

const casino: ProduitAReapprovisionner = {
  produitId: 'p-2',
  reference: 'LIV-002',
  designation: 'Casino Royale',
  quantiteVendable: 0,
  quantiteAcheteeOrigine: 4,
  seuilAlerte: 20,
  pourcentageVendu: 100,
  quantiteEnCommande: 0,
}

const mutismes: ProduitAReapprovisionner = {
  produitId: 'p-5',
  reference: 'LIV-005',
  designation: 'Mutismes',
  quantiteVendable: 1,
  quantiteAcheteeOrigine: 6,
  seuilAlerte: 20,
  pourcentageVendu: 83,
  quantiteEnCommande: 5,
}

function commande(
  id: string,
  dateArriveePrevue: string,
  statut: CommandeFournisseur['statut'] = 'en_cours',
): CommandeFournisseur {
  return {
    id,
    fournisseur: { id: 'f-1', nom: 'Diffusion Océanie' },
    produitId: 'p-5',
    reference: 'LIV-005',
    designation: `Commande ${id}`,
    quantiteCommandee: 20,
    quantiteRecue: 5,
    date: '2026-11-01T20:00:00.000Z',
    dateArriveePrevue,
    statut,
  }
}

function miseDeCote(id: string, dateLimite: string): Demande {
  return {
    id,
    client: { id: 'c-1', nom: 'Léa Martin', email: 'lea@example.pf' },
    produitId: 'p-1',
    titre: `Livre ${id}`,
    quantiteSouhaitee: 2,
    date: '2026-11-01T20:00:00.000Z',
    statut: 'mise_de_cote',
    miseDeCote: { quantite: 2, dateLimite },
  }
}

const rapport: Rapport = {
  periode: { debut: '2026-11-02', fin: '2026-11-08' },
  totaux: {
    ventesBrutes: 188200,
    retours: 1800,
    net: 186400,
    quantiteVendue: 143,
    quantiteRetournee: 1,
    quantiteNette: 142,
  },
  statistiques: { nombreVentes: 40, panierMoyen: 4705, nombreRetours: 4 },
  produits: [
    {
      produitId: 'p-1',
      reference: 'LIV-001',
      designation: "L'Île au trésor",
      categorie: 'roman',
      quantiteVendue: 12,
      montantVentes: 21600,
      quantiteRetournee: 1,
      montantRetours: 1800,
      quantiteNette: 11,
      montantNet: 19800,
      quantiteRemplacee: 0,
      stockRestant: 6,
      pourcentageVendu: 55,
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

const ventesParJour: Record<string, number> = {
  '2026-11-02': 24300,
  '2026-11-07': 55100,
}

interface Reponses {
  aRecommander?: ProduitAReapprovisionner[]
  commandes?: CommandeFournisseur[]
  demandes?: Demande[]
  rapport?: Rapport
}

function json(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

function simulerApi(reponses: Reponses = {}) {
  const urls: string[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree) => {
    const url = String(entree)
    urls.push(url)
    if (url.startsWith('/api/reapprovisionnement')) {
      return json(reponses.aRecommander ?? [])
    }
    if (url.startsWith('/api/commandes-fournisseur')) {
      return json(reponses.commandes ?? [])
    }
    if (url.startsWith('/api/demandes')) {
      return json(reponses.demandes ?? [])
    }
    if (url.startsWith('/api/categories')) {
      return json([
        { id: 'roman', libelle: 'Roman' },
        { id: 'papeterie', libelle: 'Papeterie' },
      ])
    }
    const parametres = new URL(url, 'http://localhost').searchParams
    const jour = parametres.get('debut')
    if (jour && parametres.get('categorie')) {
      return json({
        ...rapport,
        periode: { debut: jour, fin: jour },
        totaux: { ...rapport.totaux, net: 1950, quantiteNette: 1 },
      })
    }
    if (jour) {
      return json({
        ...rapport,
        periode: { debut: jour, fin: jour },
        totaux: { ...rapport.totaux, net: ventesParJour[jour] ?? 0, quantiteNette: 3 },
        statistiques: { nombreVentes: 2, panierMoyen: 27550, nombreRetours: 0 },
        produits: jour === '2026-11-07' ? [rapport.produits[1]] : rapport.produits,
      })
    }
    return json(reponses.rapport ?? rapport)
  })
  return urls
}

function afficher() {
  const router = createMemoryRouter(
    [
      { path: '/admin', element: <TableauDeBordPage /> },
      { path: '/admin/:page', element: <h1>Autre page</h1> },
    ],
    { initialEntries: ['/admin'] },
  )
  render(<RouterProvider router={router} />)
}

function colonne(nom: string) {
  return within(screen.getByRole('region', { name: nom }))
}

describe('tableau de bord du responsable', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-09T20:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('affiche le jour à Tahiti et le titre de l onglet', async () => {
    simulerApi()
    afficher()

    expect(screen.getByRole('heading', { level: 1, name: 'Tableau de bord' })).toBeInTheDocument()
    expect(screen.getByText('lundi 9 novembre')).toBeInTheDocument()
    await screen.findByRole('region', { name: 'À recommander' })
    expect(document.title).toBe('Tableau de bord · Feuillet')
  })

  it('demande les mises de côté et le rapport de la semaine dernière', async () => {
    const urls = simulerApi()
    afficher()
    await screen.findByRole('region', { name: 'À recommander' })

    expect(urls).toEqual(
      expect.arrayContaining([
        '/api/reapprovisionnement',
        '/api/commandes-fournisseur',
        '/api/demandes?statut=mise_de_cote',
        '/api/categories',
        '/api/rapports?semaine=2026-11-02',
      ]),
    )
  })

  it('affiche le nombre d éléments de chaque section et un lien vers sa page', async () => {
    simulerApi({
      aRecommander: [casino, mutismes],
      commandes: [commande('a', '2026-11-11'), commande('b', '2026-11-12'), commande('c', '2026-11-01', 'recue')],
      demandes: [miseDeCote('a', '2026-11-11T09:59:59.999Z')],
    })
    afficher()

    await screen.findByRole('region', { name: 'À recommander' })
    expect(colonne('À recommander').getByText('2', { selector: '.tableau-bord-compte' })).toBeInTheDocument()
    expect(colonne('Arrivages prévus').getByText('2', { selector: '.tableau-bord-compte' })).toBeInTheDocument()
    expect(colonne('Mises de côté').getByText('1', { selector: '.tableau-bord-compte' })).toBeInTheDocument()
    expect(colonne('À recommander').getByRole('link', { name: 'Voir le stock' })).toHaveAttribute('href', '/admin/stock')
    expect(colonne('À recommander').getByRole('link', { name: 'Voir le réapprovisionnement' })).toHaveAttribute('href', '/admin/rapports')
    expect(colonne('Arrivages prévus').getByRole('link', { name: 'Voir les commandes fournisseur' })).toHaveAttribute('href', '/admin/commandes')
    expect(colonne('Mises de côté').getByRole('link', { name: 'Voir les demandes' })).toHaveAttribute('href', '/admin/demandes')
  })

  it('signale les sections vides avec un compte à zéro', async () => {
    simulerApi()
    afficher()

    await screen.findByRole('region', { name: 'À recommander' })
    expect(colonne('À recommander').getByText('0', { selector: '.tableau-bord-compte' })).toBeInTheDocument()
    expect(colonne('À recommander').getByText('Aucun article sous son seuil d’alerte.')).toBeInTheDocument()
    expect(colonne('Arrivages prévus').getByText('Aucune commande fournisseur en cours.')).toBeInTheDocument()
    expect(colonne('Mises de côté').getByText('Aucune mise de côté en cours.')).toBeInTheDocument()
  })

  it('liste les articles à recommander avec leur part vendue', async () => {
    simulerApi({ aRecommander: [casino, mutismes] })
    afficher()

    await screen.findByRole('region', { name: 'À recommander' })
    const [premier, second] = colonne('À recommander').getAllByRole('listitem')
    expect(premier).toHaveTextContent('Casino Royale')
    expect(premier).toHaveTextContent('Épuisé')
    expect(premier).toHaveTextContent('100 % vendu')
    expect(second).toHaveTextContent('1 vendable, 5 en commande')
    expect(second).toHaveTextContent('83 % vendu')
  })

  it('liste les arrivages non reçus par date prévue', async () => {
    simulerApi({
      commandes: [
        commande('tardive', '2026-11-19'),
        commande('recue', '2026-11-05', 'recue'),
        commande('proche', '2026-11-11', 'partiellement_recue'),
      ],
    })
    afficher()

    await screen.findByRole('region', { name: 'Arrivages prévus' })
    const lignes = colonne('Arrivages prévus').getAllByRole('listitem')
    expect(lignes).toHaveLength(2)
    expect(lignes[0]).toHaveTextContent('Commande proche')
    expect(lignes[0]).toHaveTextContent('Diffusion Océanie, 5 sur 20 exemplaires reçus')
    expect(lignes[0]).toHaveTextContent('mer. 11 nov.')
    expect(lignes[1]).toHaveTextContent('Commande tardive')
  })

  it('liste les mises de côté par date limite', async () => {
    simulerApi({
      demandes: [
        miseDeCote('tard', '2026-11-16T09:59:59.999Z'),
        miseDeCote('tot', '2026-11-11T09:59:59.999Z'),
      ],
    })
    afficher()

    await screen.findByRole('region', { name: 'Mises de côté' })
    const lignes = colonne('Mises de côté').getAllByRole('listitem')
    expect(lignes[0]).toHaveTextContent('Livre tot')
    expect(lignes[0]).toHaveTextContent('Léa Martin, 2 exemplaires')
    expect(lignes[0]).toHaveTextContent('mar. 10 nov.')
    expect(lignes[1]).toHaveTextContent('dim. 15 nov.')
  })

  it('indique la période de la semaine dernière', async () => {
    simulerApi()
    afficher()

    const semaine = within(await screen.findByRole('region', { name: 'Ventes de la semaine dernière' }))
    expect(semaine.getByText('Du 2 novembre 2026 au 8 novembre 2026')).toBeInTheDocument()
    expect(semaine.getByRole('link', { name: 'Voir le rapport complet' })).toHaveAttribute(
      'href',
      '/admin/rapports',
    )
  })

  it('dessine les ventes de chaque jour de la semaine dernière', async () => {
    const urls = simulerApi()
    afficher()

    const graphique = await screen.findByRole('list', { name: 'Ventes nettes par jour' })
    const jours = within(graphique).getAllByRole('button')
    expect(jours).toHaveLength(7)
    expect(jours[0]).toHaveTextContent('lun. 2 nov.')
    expect(jours[0]).toHaveTextContent('24 300 XPF')
    expect(jours[5]).toHaveTextContent('sam. 7 nov.')
    expect(jours[5]).toHaveClass('graphique-ventes-jour--fort')
    expect(jours[6]).toHaveTextContent('dim. 8 nov.')
    expect(urls).toContain('/api/rapports?debut=2026-11-02&fin=2026-11-02')
    expect(urls).toContain('/api/rapports?debut=2026-11-08&fin=2026-11-08')
  })

  it('détaille la semaine avec ses chiffres clés et les articles vendus', async () => {
    simulerApi()
    afficher()

    const semaine = within(await screen.findByRole('region', { name: 'Ventes de la semaine dernière' }))
    expect(semaine.getByRole('heading', { name: 'Détail de la semaine' })).toBeInTheDocument()
    const chiffre = (nom: string) => semaine.getByText(nom).closest('div')
    expect(chiffre('Vente nette')).toHaveTextContent('186 400 XPF')
    expect(chiffre('Articles vendus')).toHaveTextContent('142')
    expect(chiffre('Commandes')).toHaveTextContent('40')
    expect(chiffre('Panier moyen')).toHaveTextContent('4 705 XPF')
    expect(chiffre('Retours')).toHaveTextContent('4')
    expect(chiffre('Retours')).toHaveTextContent('1 800 XPF rendus')
    expect(semaine.getByText("L'Île au trésor", { selector: 'button' }).closest('tr')).toHaveTextContent('19 800 XPF')
    expect(semaine.queryByText('Gomme blanche')).not.toBeInTheDocument()
  })

  it('montre le détail du jour choisi puis revient à la semaine', async () => {
    simulerApi()
    afficher()

    const graphique = await screen.findByRole('list', { name: 'Ventes nettes par jour' })
    fireEvent.click(within(graphique).getByRole('button', { name: /sam\. 7 nov\./ }))

    const semaine = within(screen.getByRole('region', { name: 'Ventes de la semaine dernière' }))
    expect(semaine.getByRole('heading', { name: 'Détail du samedi 7 novembre' })).toBeInTheDocument()
    expect(semaine.getByText('Vente nette').closest('div')).toHaveTextContent('55 100 XPF')
    expect(semaine.queryByText("L'Île au trésor", { selector: 'button' })).not.toBeInTheDocument()
    expect(semaine.getByText('Aucun article vendu sur la période.')).toBeInTheDocument()

    fireEvent.click(semaine.getByRole('button', { name: 'Revenir à la semaine' }))

    expect(semaine.getByRole('heading', { name: 'Détail de la semaine' })).toBeInTheDocument()
    expect(semaine.getByText("L'Île au trésor", { selector: 'button' })).toBeInTheDocument()
  })

  it('suit toutes les ventes de la semaine par défaut', async () => {
    simulerApi()
    afficher()

    const suivi = within(await screen.findByRole('region', { name: 'Évolution sur la semaine' }))
    expect(suivi.getByRole('combobox', { name: 'Afficher' })).toHaveValue('')
    const lignes = suivi.getByRole('table', { name: 'Ventes par jour : toutes les ventes' })
    expect(within(lignes).getAllByRole('row')).toHaveLength(8)
    expect(within(lignes).getAllByRole('row')[1]).toHaveTextContent('lun. 2 nov.324 300 XPF')
  })

  it('propose seulement les catégories et articles vendus dans la semaine', async () => {
    simulerApi()
    afficher()

    const choix = within(await screen.findByRole('combobox', { name: 'Afficher' }))
    expect(choix.getByRole('option', { name: 'Roman' })).toBeInTheDocument()
    expect(choix.queryByRole('option', { name: 'Papeterie' })).not.toBeInTheDocument()
    expect(choix.getByRole('option', { name: "L'Île au trésor" })).toBeInTheDocument()
    expect(choix.queryByRole('option', { name: 'Gomme blanche' })).not.toBeInTheDocument()
  })

  it('affiche au même endroit la courbe du livre cliqué dans le tableau', async () => {
    simulerApi()
    afficher()

    const semaine = within(await screen.findByRole('region', { name: 'Ventes de la semaine dernière' }))
    fireEvent.click(semaine.getByRole('button', { name: "L'Île au trésor" }))

    const suivi = within(screen.getByRole('region', { name: 'Évolution sur la semaine' }))
    expect(suivi.getByRole('combobox', { name: 'Afficher' })).toHaveValue('produit:p-1')
    const lignes = within(suivi.getByRole('table', { name: "Ventes par jour : L'Île au trésor" }))
      .getAllByRole('row')
      .slice(1)
    expect(lignes).toHaveLength(7)
    expect(lignes[0]).toHaveTextContent('lun. 2 nov.11')
    expect(lignes[5]).toHaveTextContent('sam. 7 nov.00 XPF')
    expect(semaine.getByRole('button', { name: "L'Île au trésor" })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(semaine.getByRole('button', { name: "L'Île au trésor" }))

    expect(suivi.getByRole('combobox', { name: 'Afficher' })).toHaveValue('')
  })

  it('demande au serveur les ventes de la catégorie choisie', async () => {
    const urls = simulerApi()
    afficher()

    fireEvent.change(await screen.findByRole('combobox', { name: 'Afficher' }), {
      target: { value: 'categorie:roman' },
    })

    const tableau = await screen.findByRole('table', { name: 'Ventes par jour : catégorie Roman' })
    expect(within(tableau).getAllByRole('row')[1]).toHaveTextContent('lun. 2 nov.11 950 XPF')
    expect(urls).toContain('/api/rapports?debut=2026-11-02&fin=2026-11-02&categorie=roman')
    expect(urls.filter((url) => url.includes('categorie=roman'))).toHaveLength(7)
  })

  it('marque sur la courbe le jour choisi dans le diagramme', async () => {
    simulerApi()
    afficher()

    const graphique = await screen.findByRole('list', { name: 'Ventes nettes par jour' })
    fireEvent.click(within(graphique).getByRole('button', { name: /sam\. 7 nov\./ }))

    const marques = document.querySelectorAll('.courbe-ventes-point--marque')
    expect(marques).toHaveLength(1)
    expect(marques[0]).toHaveTextContent('sam. 7 nov.')
  })

  it('affiche une erreur de chargement', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      json({ code: 'INTERDIT', message: 'Accès réservé au responsable.' }, 403),
    )
    afficher()

    expect(await screen.findByRole('alert')).toHaveTextContent('Accès réservé au responsable.')
    expect(screen.queryByRole('region', { name: 'À recommander' })).not.toBeInTheDocument()
  })
})
