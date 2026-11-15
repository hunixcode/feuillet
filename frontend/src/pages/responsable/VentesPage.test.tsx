import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { retoursDeTest, venteDeTest } from '../../components/responsable/ventesDeTest'
import VentesPage from './VentesPage.tsx'

const aPreparer = venteDeTest({
  id: 'v-2',
  date: '2026-11-13T20:00:00.000Z',
  statut: 'a_preparer',
  dateExpedition: undefined,
  client: { id: 'c-2', nom: 'Teva Bonno', email: 'teva@example.pf' },
})

const expediee = venteDeTest()

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
    if (requete.url.endsWith('/retours')) {
      return json(retoursDeTest())
    }
    if (requete.url === '/api/ventes?statut=a_preparer') {
      return json([aPreparer])
    }
    if (requete.url === '/api/ventes?statut=expediee') {
      return json([expediee])
    }
    return json([aPreparer, expediee])
  })
  return requetes
}

function liste() {
  return within(screen.getByRole('region', { name: /À préparer|Expédiées|Toutes les commandes/ }))
}

describe('page des ventes et retours', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('montre d abord les commandes à préparer', async () => {
    const requetes = simulerApi()
    render(<VentesPage />)

    expect(await liste().findByRole('button', { name: '13/11/2026 10:00' })).toBeInTheDocument()
    expect(liste().getByText('1', { selector: '.ventes-compte' })).toBeInTheDocument()
    expect(requetes.map((requete) => requete.url)).toContain('/api/ventes?statut=a_preparer')
    expect(document.title).toBe('Ventes et retours · Feuillet')
  })

  it('filtre par statut', async () => {
    const requetes = simulerApi()
    render(<VentesPage />)
    await liste().findByRole('button', { name: '13/11/2026 10:00' })

    fireEvent.change(screen.getByLabelText('Statut'), { target: { value: '' } })

    expect(await liste().findByRole('button', { name: '10/11/2026 10:00' })).toBeInTheDocument()
    expect(requetes.map((requete) => requete.url)).toContain('/api/ventes')
  })

  it('marque une commande comme expédiée et recharge la liste', async () => {
    const requetes = simulerApi(({ url, methode }) =>
      url === '/api/ventes/v-2/expedition' && methode === 'POST'
        ? json({ ...aPreparer, statut: 'expediee', dateExpedition: '2026-11-14T20:00:00.000Z' })
        : undefined,
    )
    render(<VentesPage />)
    fireEvent.click(await liste().findByRole('button', { name: '13/11/2026 10:00' }))
    const chargements = () => requetes.filter((requete) => requete.url === '/api/ventes?statut=a_preparer').length
    const avant = chargements()

    fireEvent.click(screen.getByRole('button', { name: 'Marquer comme expédiée' }))

    expect(await screen.findByText('La commande de Teva Bonno est marquée comme expédiée.')).toBeInTheDocument()
    const panneau = within(screen.getByRole('complementary'))
    expect(panneau.getByText('Expédiée le 14/11/2026 10:00')).toBeInTheDocument()
    fireEvent.click(panneau.getByRole('tab', { name: 'Retours' }))
    expect(await panneau.findByText(/Retour possible jusqu’au/)).toBeInTheDocument()
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
    fireEvent.click(await liste().findByRole('button', { name: '13/11/2026 10:00' }))

    fireEvent.click(screen.getByRole('button', { name: 'Marquer comme expédiée' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cette commande a déjà été marquée comme expédiée.',
    )
    expect(await screen.findByText('Expédiée le 14/11/2026 09:00')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marquer comme expédiée' })).not.toBeInTheDocument()
  })

  it('ouvre une commande expédiée avec ses retours puis la ferme', async () => {
    simulerApi()
    render(<VentesPage />)
    await liste().findByRole('button', { name: '13/11/2026 10:00' })
    fireEvent.change(screen.getByLabelText('Statut'), { target: { value: 'expediee' } })

    fireEvent.click(await liste().findByRole('button', { name: '10/11/2026 10:00' }))

    const panneau = within(screen.getByRole('complementary'))
    expect(panneau.getByRole('heading', { name: 'Léa Martin' })).toBeInTheDocument()
    expect(panneau.getByRole('tab', { name: 'Commande' })).toHaveAttribute('aria-selected', 'true')
    expect(panneau.getByRole('tabpanel', { name: 'Commande' })).toHaveTextContent('Total payé')

    fireEvent.click(panneau.getByRole('tab', { name: 'Retours' }))

    fireEvent.click(await panneau.findByRole('button', { name: 'J’ai reçu un colis de retour' }))
    expect(panneau.getByRole('form', { name: 'Enregistrer un retour reçu par colis' })).toBeInTheDocument()
    expect(panneau.queryByRole('tabpanel', { name: 'Commande' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fermer la commande' }))

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('n affiche rien à côté de la liste tant qu aucune commande n est ouverte', async () => {
    simulerApi()
    render(<VentesPage />)

    await liste().findByRole('button', { name: '13/11/2026 10:00' })

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('ferme la commande avec Échap ou en cliquant à côté', async () => {
    simulerApi()
    const { container } = render(<VentesPage />)
    fireEvent.click(await liste().findByRole('button', { name: '13/11/2026 10:00' }))
    expect(screen.getByRole('button', { name: 'Fermer la commande' })).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()

    fireEvent.click(liste().getByRole('button', { name: '13/11/2026 10:00' }))
    const voile = container.querySelector('.ventes-voile')
    expect(voile).not.toBeNull()
    fireEvent.click(voile as Element)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('revient sur l onglet Commande en ouvrant une autre commande', async () => {
    simulerApi()
    render(<VentesPage />)
    await liste().findByRole('button', { name: '13/11/2026 10:00' })
    fireEvent.change(screen.getByLabelText('Statut'), { target: { value: '' } })
    fireEvent.click(await liste().findByRole('button', { name: '10/11/2026 10:00' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Retours' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fermer la commande' }))

    fireEvent.click(liste().getByRole('button', { name: '13/11/2026 10:00' }))

    expect(screen.getByRole('heading', { name: 'Teva Bonno' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Commande' })).toHaveAttribute('aria-selected', 'true')
  })

  it('passe d un onglet à l autre avec les flèches du clavier', async () => {
    simulerApi()
    render(<VentesPage />)
    fireEvent.click(await liste().findByRole('button', { name: '13/11/2026 10:00' }))

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Commande' }), { key: 'ArrowRight' })

    expect(screen.getByRole('tab', { name: 'Retours' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Retours' })).toHaveFocus()
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
