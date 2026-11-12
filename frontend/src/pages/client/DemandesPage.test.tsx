import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PanierProvider } from '../../contexts/PanierContext.tsx'
import type { Demande, NotificationClient } from '../../types/demande'
import DemandesPage from './DemandesPage.tsx'

const enAttente: Demande = {
  id: 'd-1',
  titre: 'Le Rivage des Syrtes',
  auteur: 'Julien Gracq',
  quantiteSouhaitee: 1,
  date: '2026-11-02T20:00:00.000Z',
  statut: 'en_attente',
}

const miseDeCote: Demande = {
  id: 'd-2',
  produitId: 'p-1',
  titre: 'L\'Île au trésor',
  quantiteSouhaitee: 3,
  date: '2026-11-01T20:00:00.000Z',
  statut: 'mise_de_cote',
  miseDeCote: { quantite: 2, dateLimite: '2026-11-16T09:59:59.999Z' },
}

const honoree: Demande = {
  id: 'd-3',
  produitId: 'p-2',
  titre: 'Dune',
  quantiteSouhaitee: 1,
  date: '2026-10-20T20:00:00.000Z',
  statut: 'honoree',
  dateFin: '2026-10-25T20:00:00.000Z',
}

const notification: NotificationClient = {
  id: 'n-1',
  clientId: 'u-1',
  produitId: 'p-1',
  type: 'reapprovisionnement',
  date: '2026-11-08T20:00:00.000Z',
  message: '« L\'Île au trésor » est arrivé : 2 exemplaires mis de côté pour vous jusqu\'au 15/11/2026.',
  lue: false,
}

function reponse(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

interface OptionsApi {
  demandes?: Demande[]
  notifications?: NotificationClient[]
  envoi?: (corps: unknown) => Response
  annulation?: () => Response
}

function simulerApi(options: OptionsApi = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree, init) => {
    const url = String(entree)
    const methode = init?.method ?? 'GET'
    if (url === '/api/demandes' && methode === 'GET') {
      return reponse(options.demandes ?? [])
    }
    if (url === '/api/demandes' && methode === 'POST') {
      return options.envoi
        ? options.envoi(JSON.parse(String(init?.body)))
        : reponse({ code: 'ERREUR_SERVEUR', message: 'Erreur inattendue.' }, 500)
    }
    if (url.endsWith('/annulation')) {
      return options.annulation
        ? options.annulation()
        : reponse({ ...enAttente, statut: 'annulee', dateFin: '2026-11-11T20:00:00.000Z' })
    }
    if (url === '/api/notifications') {
      return reponse(options.notifications ?? [])
    }
    if (url.endsWith('/lue')) {
      return reponse({ ...notification, lue: true })
    }
    return reponse({ code: 'INTROUVABLE', message: 'Inconnu.' }, 404)
  })
}

function afficher(url = '/demandes') {
  render(
    <PanierProvider>
      <MemoryRouter initialEntries={[url]}>
        <DemandesPage />
      </MemoryRouter>
    </PanierProvider>,
  )
}

function ligne(titre: string) {
  return screen.getByText(titre).closest('li') as HTMLElement
}

describe('page Mes demandes', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('affiche le titre de la page et de l onglet', async () => {
    simulerApi()
    afficher()

    expect(screen.getByRole('heading', { level: 1, name: 'Mes demandes' })).toBeInTheDocument()
    expect(document.title).toBe('Mes demandes · Feuillet')
    expect(await screen.findByRole('heading', { name: 'Aucune demande pour l\'instant.' })).toBeInTheDocument()
  })

  it('suit chaque demande avec sa quantité, sa date et son statut', async () => {
    simulerApi({ demandes: [enAttente, miseDeCote, honoree] })
    afficher()

    await screen.findByText('Le Rivage des Syrtes')
    const attente = within(ligne('Le Rivage des Syrtes'))
    expect(attente.getByText('Julien Gracq, 1 exemplaire, demandé le 2 novembre 2026')).toBeInTheDocument()
    expect(attente.getByText('En attente')).toBeInTheDocument()
    const cote = within(ligne('L\'Île au trésor'))
    expect(cote.getByText('Mise de côté')).toBeInTheDocument()
    expect(
      cote.getByText(
        '2 exemplaires mis de côté pour vous jusqu\'au 15 novembre 2026. Commandez avant cette date.',
      ),
    ).toBeInTheDocument()
    expect(within(ligne('Dune')).getByText('Honorée le 25 octobre 2026')).toBeInTheDocument()
  })

  it('annule une demande en attente', async () => {
    const fetchMock = simulerApi({ demandes: [enAttente] })
    afficher()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Annuler la demande de Le Rivage des Syrtes' }),
    )

    expect(await screen.findByText('Annulée le 11 novembre 2026')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Annuler la demande/ })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/demandes/d-1/annulation',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('explique qu une demande qui n est plus en attente ne peut pas être annulée', async () => {
    simulerApi({
      demandes: [enAttente],
      annulation: () =>
        reponse({ code: 'DEMANDE_NON_ANNULABLE', message: 'Demande non annulable.' }, 409),
    })
    afficher()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Annuler la demande de Le Rivage des Syrtes' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cette demande n\'est plus en attente : elle ne peut plus être annulée.',
    )
  })

  it('ajoute au panier les exemplaires mis de côté', async () => {
    simulerApi({ demandes: [miseDeCote] })
    afficher()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Ajouter L\'Île au trésor au panier' }),
    )

    expect(JSON.parse(localStorage.getItem('panier') ?? '[]')).toEqual([
      { produitId: 'p-1', quantite: 2 },
    ])
    expect(screen.getByRole('link', { name: 'Voir le panier' })).toHaveAttribute('href', '/panier')
  })

  it('montre les notifications de réapprovisionnement et les masque une fois lues', async () => {
    const fetchMock = simulerApi({ notifications: [notification, { ...notification, id: 'n-2', lue: true }] })
    afficher()

    const notifications = within(await screen.findByRole('region', { name: 'Bonne nouvelle' }))
    expect(notifications.getAllByRole('listitem')).toHaveLength(1)
    expect(notifications.getByText(notification.message)).toBeInTheDocument()

    fireEvent.click(notifications.getByRole('button', { name: `Masquer : ${notification.message}` }))

    expect(screen.queryByRole('region', { name: 'Bonne nouvelle' })).not.toBeInTheDocument()
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/notifications/n-1/lue',
        expect.objectContaining({ method: 'POST' }),
      ),
    )
  })

  it('envoie une demande pour un livre absent du catalogue', async () => {
    const fetchMock = simulerApi({
      envoi: (corps) => reponse({ ...enAttente, id: 'd-9', ...(corps as object) }, 201),
    })
    afficher('/demandes?titre=Le%20Rivage%20des%20Syrtes')
    await screen.findByRole('heading', { name: 'Aucune demande pour l\'instant.' })

    expect(screen.getByLabelText('Titre')).toHaveValue('Le Rivage des Syrtes')
    fireEvent.change(screen.getByLabelText('Auteur (facultatif)'), {
      target: { value: ' Julien Gracq ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un exemplaire' }))
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer la demande' }))

    expect(
      await screen.findByText('Demande envoyée pour « Le Rivage des Syrtes ».'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Titre')).toHaveValue('')
    expect(within(ligne('Le Rivage des Syrtes')).getByText('En attente')).toBeInTheDocument()
    const envoi = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(JSON.parse(String(envoi?.[1]?.body))).toEqual({
      titre: 'Le Rivage des Syrtes',
      auteur: 'Julien Gracq',
      quantiteSouhaitee: 2,
    })
  })

  it('affiche sous chaque champ les erreurs renvoyées par la librairie', async () => {
    simulerApi({
      envoi: () =>
        reponse(
          {
            code: 'VALIDATION',
            message: 'Certains champs sont invalides.',
            details: {
              champs: {
                titre: 'Le titre est obligatoire.',
                isbn: 'L\'ISBN doit compter 10 ou 13 chiffres.',
              },
            },
          },
          400,
        ),
    })
    afficher()
    await screen.findByRole('heading', { name: 'Aucune demande pour l\'instant.' })

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer la demande' }))

    expect(await screen.findByText('Le titre est obligatoire.')).toBeInTheDocument()
    expect(screen.getByText('L\'ISBN doit compter 10 ou 13 chiffres.')).toBeInTheDocument()
    expect(screen.getByLabelText('Titre')).toHaveAttribute('aria-invalid', 'true')
  })

  it('affiche une erreur réseau et permet de réessayer', async () => {
    let echecs = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree) => {
      if (String(entree) === '/api/demandes' && echecs === 0) {
        echecs += 1
        throw new TypeError('offline')
      }
      return reponse(String(entree) === '/api/demandes' ? [enAttente] : [])
    })
    afficher()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de joindre le serveur. Vérifiez votre connexion.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(await screen.findByText('Le Rivage des Syrtes')).toBeInTheDocument()
  })
})
