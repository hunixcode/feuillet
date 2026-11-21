import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { retoursDeTest, venteDeTest } from '../../components/responsable/ventesDeTest'
import VentesPage from './VentesPage.tsx'

const aPreparer = venteDeTest({
  id: 'v-2',
  date: '2026-11-13T20:00:00.000Z',
  statut: 'a_preparer',
  dateExpedition: undefined,
  emballageCadeau: true,
  client: { id: 'c-2', nom: 'Teva Bonno', email: 'teva@example.pf' },
})

const expediee = venteDeTest()

const parametres = {
  dureeMiseDeCoteJours: 7,
  delaiRetourJours: 14,
  delaiRetourCadeauJours: 30,
  fraisEmballage: 300,
  fraisLivraison: 800,
  seuilAlerteDefaut: 20,
}

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
    if (requete.url.startsWith('/api/produits')) {
      return json([])
    }
    if (requete.url.startsWith('/api/parametres')) {
      return json(parametres)
    }
    if (requete.url.endsWith('/retours')) {
      return json(retoursDeTest())
    }
    return json([aPreparer, expediee])
  })
  return requetes
}

function ligne(nom: string) {
  return screen.getByText(nom, { selector: '.article-titre' }).closest('tr') as HTMLElement
}

function panneau() {
  return within(screen.getByRole('complementary', { name: 'Commande choisie' }))
}

describe('page des ventes et retours', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-14T20:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('montre d abord les commandes à préparer, avec les compteurs de chaque statut', async () => {
    const requetes = simulerApi()
    render(<VentesPage />)

    expect(await screen.findByText('Teva Bonno')).toBeInTheDocument()
    expect(screen.queryByText('Léa Martin')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^À préparer/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^À préparer/ })).toHaveTextContent('À préparer1')
    expect(screen.getByRole('button', { name: /^Toutes/ })).toHaveTextContent('Toutes2')
    expect(screen.getByText('3 articles à emballer')).toBeInTheDocument()
    const commande = ligne('Teva Bonno')
    expect(commande).toHaveTextContent('teva@example.pf')
    expect(commande).toHaveTextContent('3 articles, emballage cadeau')
    expect(commande).toHaveTextContent('Hier')
    expect(commande).toHaveTextContent('4 810 XPF')
    expect(commande).toHaveTextContent('À préparer')
    expect(requetes.map((requete) => requete.url)).toContain('/api/ventes')
    expect(document.title).toBe('Ventes et retours · Feuillet')
  })

  it('filtre par statut et cherche un client', async () => {
    simulerApi()
    render(<VentesPage />)
    await screen.findByText('Teva Bonno')

    fireEvent.click(screen.getByRole('button', { name: /^Toutes/ }))
    expect(screen.getByText('Léa Martin')).toBeInTheDocument()
    expect(ligne('Léa Martin')).toHaveTextContent('Retour jusqu’au 24 nov.')

    fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher un client' }), {
      target: { value: 'léa' },
    })

    expect(screen.queryByText('Teva Bonno')).not.toBeInTheDocument()
    expect(screen.getByText('Léa Martin')).toBeInTheDocument()
  })

  it('ouvre la commande par son bouton, l expédie puis recharge la liste', async () => {
    const requetes = simulerApi(({ url, methode }) =>
      url === '/api/ventes/v-2/expedition' && methode === 'POST'
        ? json({ ...aPreparer, statut: 'expediee', dateExpedition: '2026-11-14T20:00:00.000Z' })
        : undefined,
    )
    render(<VentesPage />)
    await screen.findByText('Teva Bonno')
    fireEvent.click(within(ligne('Teva Bonno')).getByRole('button'))

    expect(panneau().getByRole('heading', { name: 'Teva Bonno' })).toBeInTheDocument()
    expect(panneau().getAllByRole('row').find((element) => element.textContent?.includes("L'Île au trésor"))).toBeDefined()
    const chargements = () => requetes.filter((requete) => requete.url === '/api/ventes').length
    const avant = chargements()

    fireEvent.click(panneau().getByRole('button', { name: 'Marquer comme expédiée' }))

    expect(await panneau().findByRole('status')).toHaveTextContent(
      'La commande de Teva Bonno est marquée comme expédiée.',
    )
    expect(panneau().getByText(/^Expédiée le/)).toHaveTextContent('Expédiée le 14 novembre.')
    expect(panneau().getByText(/Le colis vient de partir/)).toBeInTheDocument()
    await waitFor(() => expect(chargements()).toBeGreaterThan(avant))
  })

  it('explique une commande déjà expédiée par ailleurs', async () => {
    simulerApi(({ url }) => {
      if (url === '/api/ventes/v-2/expedition') {
        return json({ code: 'COMMANDE_DEJA_EXPEDIEE', message: 'Déjà expédiée.' }, 409)
      }
      if (url === '/api/ventes/v-2') {
        return json({ ...aPreparer, statut: 'expediee', dateExpedition: '2026-11-14T19:00:00.000Z' })
      }
      return undefined
    })
    render(<VentesPage />)
    await screen.findByText('Teva Bonno')
    fireEvent.click(ligne('Teva Bonno'))

    fireEvent.click(panneau().getByRole('button', { name: 'Marquer comme expédiée' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cette commande a déjà été marquée comme expédiée.',
    )
    expect(await panneau().findByText('Expédiée le 14 novembre.')).toBeInTheDocument()
    expect(panneau().queryByRole('button', { name: 'Marquer comme expédiée' })).not.toBeInTheDocument()
  })

  it('ouvre une commande expédiée avec son suivi et ses retours, puis la ferme', async () => {
    simulerApi()
    render(<VentesPage />)
    await screen.findByText('Teva Bonno')
    fireEvent.click(screen.getByRole('button', { name: /^Expédiées/ }))

    fireEvent.click(ligne('Léa Martin'))

    expect(panneau().getByRole('heading', { name: 'Léa Martin' })).toBeInTheDocument()
    expect(panneau().getByText('Livraison au BP 12, Papeete')).toBeInTheDocument()
    expect(panneau().getByText('Colis expédié')).toBeInTheDocument()
    expect(panneau().getByText('Fin du délai de retour')).toBeInTheDocument()
    expect(panneau().getByText('Total TTC').nextElementSibling).toHaveTextContent('4 810 XPF')

    fireEvent.click(await panneau().findByRole('button', { name: 'J’ai reçu un colis de retour' }))
    expect(panneau().getByRole('form', { name: 'Enregistrer un retour reçu par colis' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fermer la commande' }))

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('n affiche aucun panneau tant qu aucune commande n est ouverte', async () => {
    simulerApi()
    render(<VentesPage />)
    await screen.findByText('Teva Bonno')

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('ferme la commande avec Échap ou en cliquant à côté', async () => {
    simulerApi()
    render(<VentesPage />)
    await screen.findByText('Teva Bonno')

    fireEvent.click(ligne('Teva Bonno'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()

    fireEvent.keyDown(ligne('Teva Bonno'), { key: 'Enter' })
    expect(screen.getByRole('complementary', { name: 'Commande choisie' })).toBeInTheDocument()
    fireEvent.click(document.querySelector('.tiroir-fond') as HTMLElement)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('expédie d un coup les commandes cochées', async () => {
    const requetes = simulerApi(({ url, methode }) =>
      url === '/api/ventes/v-2/expedition' && methode === 'POST'
        ? json({ ...aPreparer, statut: 'expediee', dateExpedition: '2026-11-14T20:00:00.000Z' })
        : undefined,
    )
    render(<VentesPage />)
    await screen.findByText('Teva Bonno')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Sélectionner la commande de Teva Bonno' }))
    const barre = within(screen.getByRole('region', { name: 'Commandes sélectionnées' }))
    expect(barre.getByText('1 commande sélectionnée')).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()

    fireEvent.click(barre.getByRole('button', { name: 'Marquer expédiées' }))

    expect(await screen.findByText('1 commande expédiée')).toBeInTheDocument()
    expect(requetes).toContainEqual({ url: '/api/ventes/v-2/expedition', methode: 'POST' })
  })

  it('affiche une erreur de chargement', async () => {
    simulerApi(({ url }) =>
      url.startsWith('/api/ventes')
        ? json({ code: 'INTERDIT', message: 'Accès réservé au responsable.' }, 403)
        : undefined,
    )
    render(<VentesPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Accès réservé au responsable.')
  })
})
