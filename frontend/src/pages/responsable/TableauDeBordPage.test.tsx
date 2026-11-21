import { fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Demande } from '../../types/demande'
import type { Rapport } from '../../types/rapport'
import type { CommandeFournisseur, ProduitAReapprovisionner } from '../../types/reappro'
import type { Vente } from '../../types/vente'
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
  quantiteEnCommande: 15,
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

const venteAPreparer = {
  id: 'v-1',
  date: '2026-11-13T19:30:00.000Z',
  statut: 'a_preparer',
  client: { id: 'c-2', nom: 'Teva Brothers', email: 'teva@example.pf' },
  lignes: [
    { produitId: 'p-1', quantite: 2, reference: 'LIV-001', designation: "L'Île au trésor", prixUnitaire: 1530, remise: 15, tauxTva: 5, montant: 3060, montantTva: 146 },
    { produitId: 'p-9', quantite: 1, reference: 'PAP-009', designation: 'Gomme blanche', prixUnitaire: 140, remise: 0, tauxTva: 16, montant: 140, montantTva: 19 },
  ],
  emballageCadeau: true,
  sousTotal: 3200,
  fraisEmballage: 300,
  fraisLivraison: 700,
  total: 4200,
  montantTva: 165,
} as unknown as Vente

const produits = [
  { id: 'p-1', reference: 'LIV-001', designation: "L'Île au trésor", type: 'livre', categorie: 'roman', prix: 1800, tauxTva: 5, archive: false, prixApplique: 1530, isbn: '9782081204645' },
  { id: 'p-9', reference: 'PAP-009', designation: 'Gomme blanche', type: 'papeterie', categorie: 'papeterie', prix: 140, tauxTva: 16, archive: false, prixApplique: 140 },
]

const rapport: Rapport = {
  periode: { debut: '2026-11-09', fin: '2026-11-15' },
  totaux: {
    ventesBrutes: 81200,
    retours: 1800,
    net: 79400,
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

const semainePrecedente: Rapport = {
  ...rapport,
  periode: { debut: '2026-11-02', fin: '2026-11-08' },
  totaux: { ...rapport.totaux, net: 186400 },
}

const ventesParJour: Record<string, number> = {
  '2026-11-09': 24300,
  '2026-11-14': 55100,
}

interface Reponses {
  aRecommander?: ProduitAReapprovisionner[]
  commandes?: CommandeFournisseur[]
  demandes?: Demande[]
  ventes?: Vente[]
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
    if (url.startsWith('/api/ventes')) {
      return json(reponses.ventes ?? [])
    }
    if (url.startsWith('/api/produits')) {
      return json(produits)
    }
    if (url.startsWith('/api/categories')) {
      return json([
        { id: 'roman', libelle: 'Roman' },
        { id: 'papeterie', libelle: 'Papeterie' },
      ])
    }
    const parametres = new URL(url, 'http://localhost').searchParams
    if (parametres.get('semaine') === '2026-11-07') {
      return json(semainePrecedente)
    }
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
        produits: jour === '2026-11-14' ? [rapport.produits[1]] : rapport.produits,
      })
    }
    return json(rapport)
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

function section(nom: string) {
  return within(screen.getByRole('region', { name: nom }))
}

function detail() {
  return within(document.querySelector('.detail-semaine') as HTMLElement)
}

describe('tableau de bord du responsable', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-14T20:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('affiche le jour à Tahiti, l heure de mise à jour et le titre de l onglet', async () => {
    simulerApi()
    afficher()

    expect(screen.getByRole('heading', { level: 1, name: 'Tableau de bord' })).toBeInTheDocument()
    expect(screen.getByText('Samedi 14 novembre. Mis à jour à 10 h 00.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Rapport de la semaine' })).toHaveAttribute('href', '/admin/rapports')
    await screen.findByRole('region', { name: 'À recommander' })
    expect(document.title).toBe('Tableau de bord · Feuillet')
  })

  it('demande les données de la semaine en cours et de la semaine précédente', async () => {
    const urls = simulerApi()
    afficher()
    await screen.findByRole('region', { name: 'À recommander' })

    expect(urls).toEqual(
      expect.arrayContaining([
        '/api/reapprovisionnement',
        '/api/commandes-fournisseur',
        '/api/demandes?statut=mise_de_cote',
        '/api/ventes?statut=a_preparer',
        '/api/categories',
        '/api/rapports?semaine=2026-11-14',
        '/api/rapports?semaine=2026-11-07',
        '/api/rapports?debut=2026-11-09&fin=2026-11-09',
        '/api/rapports?debut=2026-11-15&fin=2026-11-15',
      ]),
    )
  })

  it('résume la semaine en cours dans la vitrine', async () => {
    simulerApi({ ventes: [venteAPreparer] })
    afficher()

    const vitrine = within(await screen.findByRole('region', { name: 'Semaine du 9 au 15 novembre' }))
    expect(document.querySelector('.vitrine-montant')).toHaveTextContent('79 400XPF')
    expect(vitrine.getByText('-57 % sur la semaine dernière')).toHaveAttribute(
      'data-bulle-texte',
      '186 400 XPF de ventes nettes',
    )
    const aPreparer = vitrine.getByRole('link', { name: /à préparer/ })
    expect(aPreparer).toHaveAttribute('href', '/admin/ventes')
    expect(aPreparer.querySelector('strong')).toHaveTextContent('1')
    expect(vitrine.getByText('commandes').previousElementSibling).toHaveTextContent('12')
    expect(vitrine.getByText('retours').previousElementSibling).toHaveTextContent('0')
    expect(vitrine.getByText('samedi')).toBeInTheDocument()
  })

  it('dessine les ventes de chaque jour, sans rien pour les jours à venir', async () => {
    simulerApi()
    afficher()

    const graphique = within(await screen.findByRole('img', { name: 'Ventes nettes par jour' }))
    const jours = graphique.getAllByRole('button')
    expect(jours).toHaveLength(6)
    expect(jours[0]).toHaveAccessibleName('Lundi 9 novembre, 24 300 XPF, 2 commandes')
    expect(jours[5]).toHaveAccessibleName('Samedi 14 novembre, 55 100 XPF, 2 commandes')
    expect(document.querySelector('[aria-label="Dimanche 15 novembre, Journée à venir"]')).not.toBeNull()
  })

  it('montre les articles à recommander avec leur part restante et leur commande', async () => {
    simulerApi({ aRecommander: [mutismes, casino], commandes: [commande('m', '2026-11-16')] })
    afficher()

    await screen.findByRole('region', { name: 'À recommander' })
    const [premier, second] = section('À recommander').getAllByRole('article')
    expect(premier).toHaveTextContent('Casino Royale')
    expect(premier).toHaveTextContent('Épuisé')
    expect(premier).toHaveTextContent('0 en vente sur 4 achetés')
    expect(premier).toHaveTextContent('Rien en commande')
    expect(within(premier).getByRole('link', { name: 'Recommander' })).toHaveAttribute('href', '/admin/commandes')
    expect(second).toHaveTextContent('17 % restant')
    expect(second).toHaveTextContent('1 en vente sur 6 achetés')
    expect(second).toHaveTextContent('15 en route, arrivée le 16 nov.')
    expect(section('À recommander').getByRole('link', { name: 'Tout le stock' })).toHaveAttribute('href', '/admin/stock')
  })

  it('signale les sections vides', async () => {
    simulerApi()
    afficher()

    await screen.findByRole('region', { name: 'À recommander' })
    expect(section('À recommander').getByText('Aucun article sous son seuil d’alerte.')).toBeInTheDocument()
    expect(section('À préparer').getByText('Aucune commande à préparer.')).toBeInTheDocument()
    expect(section('Arrivages prévus').getByText('Aucune commande fournisseur en cours.')).toBeInTheDocument()
    expect(section('Mises de côté').getByText('Aucune mise de côté en cours.')).toBeInTheDocument()
  })

  it('liste les commandes à préparer', async () => {
    simulerApi({ ventes: [venteAPreparer] })
    afficher()

    await screen.findByRole('region', { name: 'À préparer' })
    const [ligne] = section('À préparer').getAllByRole('listitem')
    expect(within(ligne).getByRole('link', { name: 'Teva Brothers' })).toHaveAttribute('href', '/admin/ventes')
    expect(ligne).toHaveTextContent('Hier, 9 h 30, 3 articles')
    expect(ligne).toHaveTextContent('Emballage')
    expect(ligne).toHaveTextContent('4 200 XPF')
  })

  it('liste les arrivages non reçus par date prévue', async () => {
    simulerApi({
      commandes: [
        commande('tardive', '2026-11-19'),
        commande('recue', '2026-11-05', 'recue'),
        commande('proche', '2026-11-16', 'partiellement_recue'),
      ],
    })
    afficher()

    await screen.findByRole('region', { name: 'Arrivages prévus' })
    const lignes = section('Arrivages prévus').getAllByRole('listitem')
    expect(lignes).toHaveLength(2)
    expect(lignes[0]).toHaveTextContent('Commande proche')
    expect(lignes[0]).toHaveTextContent('Diffusion Océanie, 15 attendus sur 20')
    expect(lignes[0]).toHaveTextContent('16nov.')
    expect(within(lignes[0]).getByText('Dans 2 jours')).toHaveClass('statut-partielle')
    expect(lignes[1]).toHaveTextContent('Commande tardive')
    expect(lignes[1]).toHaveTextContent('Dans 5 jours')
  })

  it('liste les mises de côté par date limite', async () => {
    simulerApi({
      demandes: [
        miseDeCote('tard', '2026-11-20T09:59:59.999Z'),
        miseDeCote('tot', '2026-11-15T09:59:59.999Z'),
      ],
    })
    afficher()

    await screen.findByRole('region', { name: 'Mises de côté' })
    const lignes = section('Mises de côté').getAllByRole('listitem')
    expect(lignes[0]).toHaveTextContent('Livre tot')
    expect(lignes[0]).toHaveTextContent('Léa Martin, gardé jusqu’au 14 novembre')
    expect(within(lignes[0]).getByText('Aujourd’hui')).toHaveClass('statut-cote')
    expect(within(lignes[1]).getByText('Dans 5 jours')).toHaveClass('statut-attente')
  })

  it('détaille la semaine avec ses chiffres clés et les articles vendus', async () => {
    simulerApi()
    afficher()

    await screen.findByRole('heading', { name: 'Détail de la semaine' })
    const chiffre = (nom: string) => detail().getByText(nom).closest('div')
    expect(chiffre('Vente nette')).toHaveTextContent('79 400 XPF')
    expect(chiffre('Articles vendus')).toHaveTextContent('142')
    expect(chiffre('Commandes')).toHaveTextContent('40')
    expect(chiffre('Panier moyen')).toHaveTextContent('4 705 XPF')
    expect(chiffre('Retours')).toHaveTextContent('1 800 XPF rendus')
    expect(detail().getByText("L'Île au trésor", { selector: 'button' }).closest('tr')).toHaveTextContent('19 800 XPF')
    expect(detail().queryByText('Gomme blanche')).not.toBeInTheDocument()
    expect(detail().getByRole('link', { name: 'Voir le rapport complet' })).toHaveAttribute('href', '/admin/rapports')
  })

  it('montre le détail du jour choisi dans le graphique puis revient à la semaine', async () => {
    simulerApi()
    afficher()

    const graphique = within(await screen.findByRole('img', { name: 'Ventes nettes par jour' }))
    fireEvent.click(graphique.getByRole('button', { name: /^Samedi 14 novembre/ }))

    expect(screen.getByRole('heading', { name: 'Détail du samedi 14 novembre' })).toBeInTheDocument()
    expect(detail().getByText('Vente nette').closest('div')).toHaveTextContent('55 100 XPF')
    expect(detail().getByText('Aucun article vendu sur la période.')).toBeInTheDocument()

    fireEvent.click(detail().getByRole('button', { name: 'Revenir à la semaine' }))

    expect(screen.getByRole('heading', { name: 'Détail de la semaine' })).toBeInTheDocument()
    expect(detail().getByText("L'Île au trésor", { selector: 'button' })).toBeInTheDocument()
  })

  it('suit toutes les ventes de la semaine par défaut', async () => {
    simulerApi()
    afficher()

    const suivi = within(await screen.findByRole('region', { name: 'Évolution sur la semaine' }))
    expect(suivi.getByRole('combobox', { name: 'Afficher' })).toHaveValue('')
    const lignes = suivi.getByRole('table', { name: 'Ventes par jour : toutes les ventes' })
    expect(within(lignes).getAllByRole('row')).toHaveLength(8)
    expect(within(lignes).getAllByRole('row')[1]).toHaveTextContent('lun. 9 nov.324 300 XPF')
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

    await screen.findByRole('heading', { name: 'Détail de la semaine' })
    fireEvent.click(detail().getByRole('button', { name: "L'Île au trésor" }))

    const suivi = within(screen.getByRole('region', { name: 'Évolution sur la semaine' }))
    expect(suivi.getByRole('combobox', { name: 'Afficher' })).toHaveValue('produit:p-1')
    const lignes = within(suivi.getByRole('table', { name: "Ventes par jour : L'Île au trésor" }))
      .getAllByRole('row')
      .slice(1)
    expect(lignes).toHaveLength(7)
    expect(lignes[0]).toHaveTextContent('lun. 9 nov.11')
    expect(lignes[5]).toHaveTextContent('sam. 14 nov.00 XPF')
    expect(detail().getByRole('button', { name: "L'Île au trésor" })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(detail().getByRole('button', { name: "L'Île au trésor" }))

    expect(suivi.getByRole('combobox', { name: 'Afficher' })).toHaveValue('')
  })

  it('demande au serveur les ventes de la catégorie choisie', async () => {
    const urls = simulerApi()
    afficher()

    fireEvent.change(await screen.findByRole('combobox', { name: 'Afficher' }), {
      target: { value: 'categorie:roman' },
    })

    const tableau = await screen.findByRole('table', { name: 'Ventes par jour : catégorie Roman' })
    expect(within(tableau).getAllByRole('row')[1]).toHaveTextContent('lun. 9 nov.11 950 XPF')
    expect(urls).toContain('/api/rapports?debut=2026-11-09&fin=2026-11-09&categorie=roman')
    expect(urls.filter((url) => url.includes('categorie=roman'))).toHaveLength(7)
  })

  it('marque sur la courbe le jour choisi dans le graphique', async () => {
    simulerApi()
    afficher()

    const graphique = within(await screen.findByRole('img', { name: 'Ventes nettes par jour' }))
    fireEvent.click(graphique.getByRole('button', { name: /^Samedi 14 novembre/ }))

    const marques = document.querySelectorAll('.courbe-ventes-point--marque')
    expect(marques).toHaveLength(1)
    expect(marques[0]).toHaveTextContent('sam. 14 nov.')
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
