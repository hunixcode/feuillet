import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CommandeFournisseur, Reception } from '../../types/reappro'
import PanneauCommandeFournisseur from './PanneauCommandeFournisseur.tsx'

const commande: CommandeFournisseur = {
  id: 'cf-1',
  fournisseur: { id: 'f-1', nom: 'Diffusion Océanie' },
  produitId: 'p-1',
  reference: 'LIV-001',
  designation: "L'Île au trésor",
  quantiteCommandee: 10,
  quantiteRecue: 4,
  date: '2026-11-08T20:00:00.000Z',
  dateArriveePrevue: '2026-11-20',
  statut: 'partiellement_recue',
}

const validee: Reception = {
  id: 'r-1',
  commandeId: 'cf-1',
  produitId: 'p-1',
  date: '2026-11-10T20:00:00.000Z',
  quantiteRecue: 4,
  quantiteAbimee: 1,
  validee: true,
  dateValidation: '2026-11-10T20:05:00.000Z',
}

const aValider: Reception = {
  ...validee,
  id: 'r-2',
  date: '2026-11-12T20:00:00.000Z',
  quantiteRecue: 3,
  quantiteAbimee: 0,
  validee: false,
  dateValidation: undefined,
}

function json(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

interface Requete {
  url: string
  methode: string
  corps?: unknown
}

function simulerApi(reponse: (requete: Requete) => Response | undefined = () => undefined) {
  const requetes: Requete[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree, options) => {
    const requete = {
      url: String(entree),
      methode: options?.method ?? 'GET',
      corps: options?.body ? JSON.parse(String(options.body)) : undefined,
    }
    requetes.push(requete)
    return reponse(requete) ?? json([validee, aValider])
  })
  return requetes
}

function afficher(onChangement = vi.fn(), valeurs: Partial<CommandeFournisseur> = {}) {
  render(
    <PanneauCommandeFournisseur
      commande={{ ...commande, ...valeurs }}
      aujourdhui="2026-11-14"
      onChangement={onChangement}
    />,
  )
  return onChangement
}

function saisir(recus: string, abimes = '0') {
  fireEvent.change(screen.getByLabelText('Reçus en bon état'), { target: { value: recus } })
  fireEvent.change(screen.getByLabelText('Abîmés à la livraison'), { target: { value: abimes } })
  fireEvent.click(screen.getByRole('button', { name: 'Saisir la réception' }))
}

describe('PanneauCommandeFournisseur', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('résume la commande et ce qui est encore attendu', async () => {
    simulerApi()
    afficher()

    expect(screen.getByRole('heading', { name: "L'Île au trésor" })).toBeInTheDocument()
    expect(screen.getByText('Commandés').nextElementSibling).toHaveTextContent('10')
    expect(screen.getByText('Reçus').nextElementSibling).toHaveTextContent('4')
    expect(screen.getByText('Attendus').nextElementSibling).toHaveTextContent('6')
    expect(screen.getByText('Reçue en partie')).toHaveClass('statut-partielle')
    expect(screen.getByText(/Il reste 6 exemplaires à recevoir/)).toBeInTheDocument()
    await screen.findByText('4 exemplaires en bon état, 1 abîmé')
  })

  it('liste les réceptions validées et celles à valider', async () => {
    const requetes = simulerApi()
    afficher()

    const liste = within(await screen.findByRole('list'))
    expect(liste.getByText('4 exemplaires en bon état, 1 abîmé').closest('li')).toHaveTextContent('Validée')
    expect(
      liste.getByText('3 exemplaires en bon état').closest('li')?.querySelector('button'),
    ).toHaveTextContent('Valider l’entrée en stock')
    expect(requetes[0].url).toBe('/api/commandes-fournisseur/cf-1/receptions')
  })

  it('vérifie la saisie sous chaque champ', async () => {
    simulerApi()
    afficher()
    await screen.findByRole('list')

    saisir('')
    expect(screen.getByLabelText('Reçus en bon état')).toHaveAccessibleDescription(
      'Indiquez le nombre d’exemplaires reçus en bon état (0 s’il n’y en a aucun).',
    )

    saisir('0', '0')
    expect(screen.getByLabelText('Reçus en bon état')).toHaveAccessibleDescription(
      'La réception doit compter au moins un article.',
    )

    saisir('2', '-1')
    expect(screen.getByLabelText('Abîmés à la livraison')).toHaveAccessibleDescription(
      'La quantité abîmée doit être un nombre entier positif ou nul.',
    )
  })

  it('saisit une réception partielle puis la propose à la validation', async () => {
    const requetes = simulerApi()
    afficher()
    await screen.findByRole('list')

    saisir('3', '1')

    const statut = await screen.findByRole('status')
    expect(statut).toHaveTextContent(
      'Réception saisie. Elle apparaît dans la liste ci-dessous : validez-la pour faire entrer les exemplaires en stock.',
    )
    expect(statut.closest('form')).toContainElement(screen.getByRole('button', { name: 'Saisir la réception' }))
    const envoi = requetes.find((requete) => requete.methode === 'POST')
    expect(envoi).toEqual({
      url: '/api/commandes-fournisseur/cf-1/receptions',
      methode: 'POST',
      corps: { quantiteRecue: 3, quantiteAbimee: 1 },
    })
    await waitFor(() =>
      expect(requetes.filter((requete) => requete.url.endsWith('/receptions') && requete.methode === 'GET')).toHaveLength(2),
    )
  })

  it('explique sous le champ une quantité supérieure au restant', async () => {
    simulerApi(({ methode }) =>
      methode === 'POST'
        ? json(
            {
              code: 'QUANTITE_SUPERIEURE_AU_RESTANT',
              message: 'Quantité supérieure au restant.',
              details: { restant: 6 },
            },
            409,
          )
        : undefined,
    )
    afficher()
    await screen.findByRole('list')

    saisir('8')

    await waitFor(() =>
      expect(screen.getByLabelText('Reçus en bon état')).toHaveAccessibleDescription(
        /^Il ne reste que 6 exemplaires à recevoir sur cette commande/,
      ),
    )
  })

  it('valide une réception et transmet la commande à jour', async () => {
    const aJour = { ...commande, quantiteRecue: 7 }
    const requetes = simulerApi(({ url }) =>
      url === '/api/receptions/r-2/validation' ? json({ reception: { ...aValider, validee: true }, commande: aJour }) : undefined,
    )
    const onChangement = afficher()
    await screen.findByRole('list')

    fireEvent.click(screen.getByRole('button', { name: 'Valider l’entrée en stock' }))

    expect(await screen.findByRole('status')).toHaveTextContent('3 exemplaires entrés en stock.')
    expect(onChangement).toHaveBeenCalledWith(aJour)
    expect(requetes.some((requete) => requete.url === '/api/receptions/r-2/validation' && requete.methode === 'POST')).toBe(true)
  })

  it('explique un stock modifié pendant la validation et recharge', async () => {
    simulerApi(({ url }) =>
      url === '/api/receptions/r-2/validation'
        ? json({ code: 'STOCK_MODIFIE', message: 'Stock modifié.' }, 409)
        : undefined,
    )
    const onChangement = afficher()
    await screen.findByRole('list')

    fireEvent.click(screen.getByRole('button', { name: 'Valider l’entrée en stock' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/rien n’a été enregistré/)
    expect(onChangement).toHaveBeenCalled()
  })

  it('n autorise plus de réception sur une commande entièrement reçue', async () => {
    simulerApi(() => json([validee]))
    afficher(vi.fn(), {
      quantiteRecue: 10,
      statut: 'recue',
      dateReceptionComplete: '2026-11-12T20:00:00.000Z',
    })
    await screen.findByRole('list')

    expect(screen.queryByRole('button', { name: 'Saisir la réception' })).not.toBeInTheDocument()
    expect(screen.getByText('Entièrement reçue le 12 novembre 2026.')).toBeInTheDocument()
    expect(screen.getByText('Attendus').nextElementSibling).toHaveTextContent('0')
    expect(screen.getByText('Reçue')).toHaveClass('statut-recue')
  })
})
