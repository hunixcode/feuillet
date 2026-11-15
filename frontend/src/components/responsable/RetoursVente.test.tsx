import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Produit } from '../../types/produit'
import type { Retour } from '../../types/retour'
import RetoursVente from './RetoursVente.tsx'
import { retoursDeTest, venteDeTest } from './ventesDeTest'

const produits: Produit[] = [
  {
    id: 'p-3',
    reference: 'LIV-003',
    designation: 'Casino Royale',
    type: 'livre',
    categorie: 'roman',
    prix: 1450,
    tauxTva: 5,
    archive: false,
    prixApplique: 1450,
  },
]

interface Requete {
  url: string
  methode: string
  corps?: Record<string, unknown>
}

function json(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

function retour(valeurs: Partial<Retour> = {}): Retour {
  return {
    id: 'r-9',
    venteId: 'v-1',
    produitId: 'p-2',
    reference: 'PAP-001',
    designation: 'Carnet ligné A5',
    quantite: 1,
    date: '2026-11-14T20:00:00.000Z',
    issue: 'remboursement',
    revendable: true,
    valeur: 950,
    montantRembourse: 950,
    complementPaye: 0,
    ...valeurs,
  }
}

function simulerApi(reponse: (requete: Requete) => Response | undefined = () => undefined) {
  const requetes: Requete[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree, options) => {
    const requete: Requete = {
      url: String(entree),
      methode: options?.method ?? 'GET',
      corps: options?.body ? JSON.parse(String(options.body)) : undefined,
    }
    requetes.push(requete)
    return reponse(requete) ?? json(retoursDeTest())
  })
  return requetes
}

function afficher(onChangement = vi.fn(), vente = venteDeTest()) {
  render(<RetoursVente vente={vente} produits={produits} onChangement={onChangement} />)
  return onChangement
}

function envoi(requetes: Requete[]) {
  return requetes.find((requete) => requete.methode === 'POST')
}

async function formulaire() {
  const bouton = screen.queryByRole('button', { name: 'J’ai reçu un colis de retour' })
  if (bouton) {
    fireEvent.click(bouton)
  } else if (!screen.queryByRole('form')) {
    fireEvent.click(await screen.findByRole('button', { name: 'J’ai reçu un colis de retour' }))
  }
  return within(await screen.findByRole('form', { name: 'Enregistrer un retour reçu par colis' }))
}

describe('RetoursVente', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('attend l expédition avant tout retour', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    afficher(vi.fn(), venteDeTest({ statut: 'a_preparer', dateExpedition: undefined }))

    expect(screen.getByText(/Les retours seront possibles une fois la commande expédiée/)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('donne la date limite et ce qui peut encore être rendu', async () => {
    const requetes = simulerApi()
    afficher()

    expect(await screen.findByText(/Retour possible jusqu’au 24 novembre 2026 inclus/)).toHaveTextContent(
      '14 jours après l’achat.',
    )
    const ligne = screen.getByRole('cell', { name: /^L'Île au trésor/ }).closest('tr')
    expect(ligne).toHaveTextContent('211')
    expect(requetes[0].url).toBe('/api/ventes/v-1/retours')
    expect(screen.getByText('Remboursement · 1 exemplaire de L\'Île au trésor').closest('li')).toHaveTextContent(
      'Remboursé 1 530 XPF',
    )
  })

  it('rappelle le délai d un mois pour un cadeau', async () => {
    simulerApi()
    afficher(vi.fn(), venteDeTest({ occasionCadeau: 'noel' }))

    expect(await screen.findByText(/Retour possible/)).toHaveTextContent('Cadeau : 1 mois après l’achat.')
  })

  it('ferme le formulaire quand le délai est dépassé', async () => {
    simulerApi(() => json(retoursDeTest({ retourPossible: false, dateLimiteRetour: '2026-11-12T09:59:59.999Z' })))
    afficher()

    expect(await screen.findByText(/Délai de retour dépassé depuis le 11 novembre 2026/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enregistrer le retour' })).not.toBeInTheDocument()
  })

  it('n ouvre le formulaire qu à la réception d un colis', async () => {
    simulerApi()
    afficher()

    const bouton = await screen.findByRole('button', { name: 'J’ai reçu un colis de retour' })
    expect(screen.getByText(/sans demande préalable/)).toBeInTheDocument()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()

    fireEvent.click(bouton)
    expect(screen.getByRole('form', { name: 'Enregistrer un retour reçu par colis' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'J’ai reçu un colis de retour' })).toBeInTheDocument()
  })

  it('rembourse un article ouvert et dit qu il repart en vente sous cellophane', async () => {
    const requetes = simulerApi(({ methode }) => (methode === 'POST' ? json(retour(), 201) : undefined))
    const onChangement = afficher()
    const champs = await formulaire()

    fireEvent.change(champs.getByLabelText('Article rendu'), { target: { value: 'p-2' } })
    fireEvent.click(champs.getByRole('radio', { name: /Ouvert mais en bon état/ }))
    fireEvent.click(champs.getByRole('button', { name: 'Enregistrer le retour' }))

    const resultat = await screen.findByRole('status')
    expect(resultat).toHaveTextContent('Remboursement enregistré : 1 exemplaire de Carnet ligné A5.')
    expect(resultat).toHaveTextContent('À rembourser au client : 950 XPF.')
    expect(resultat).toHaveTextContent('peut repartir en vente sous cellophane')
    expect(envoi(requetes)).toEqual({
      url: '/api/ventes/v-1/retours',
      methode: 'POST',
      corps: { produitId: 'p-2', quantite: 1, issue: 'remboursement', revendable: true },
    })
    expect(onChangement).toHaveBeenCalled()
  })

  it('envoie un article abîmé en défectueux', async () => {
    const requetes = simulerApi(({ methode }) =>
      methode === 'POST' ? json(retour({ revendable: false }), 201) : undefined,
    )
    afficher()
    const champs = await formulaire()

    fireEvent.click(champs.getByRole('radio', { name: /Abîmé ou défectueux/ }))
    fireEvent.click(champs.getByRole('button', { name: 'Enregistrer le retour' }))

    expect(await screen.findByRole('status')).toHaveTextContent('L’article rendu passe en stock défectueux.')
    expect(envoi(requetes)?.corps).toMatchObject({ revendable: false })
  })

  it('vérifie la quantité avec ce qui reste retournable', async () => {
    const requetes = simulerApi()
    afficher()
    const champs = await formulaire()

    fireEvent.change(champs.getByLabelText('Quantité rendue'), { target: { value: '2' } })
    fireEvent.click(champs.getByRole('button', { name: 'Enregistrer le retour' }))

    expect(champs.getByLabelText('Quantité rendue')).toHaveAccessibleDescription(
      'Le client ne peut plus rendre que 1 exemplaire de cet article.',
    )
    expect(envoi(requetes)).toBeUndefined()
  })

  it('exige le plastique intact et un article pour un échange', async () => {
    const requetes = simulerApi()
    afficher()
    const champs = await formulaire()

    fireEvent.click(champs.getByRole('radio', { name: /Échange/ }))
    fireEvent.click(champs.getByRole('button', { name: 'Enregistrer le retour' }))

    expect(champs.getByRole('checkbox', { name: /le plastique de l’article rendu est intact/ })).toHaveAccessibleDescription(
      'Un échange n’est possible que si le plastique est intact. Sinon, proposez un remboursement.',
    )
    expect(champs.getByLabelText('Article envoyé en échange')).toHaveAccessibleDescription(
      'Choisissez l’article envoyé en échange.',
    )
    expect(champs.getByText(/à l’adresse de la commande \(BP 12, Papeete\), avec la livraison offerte/)).toBeInTheDocument()
    expect(envoi(requetes)).toBeUndefined()
  })

  it('enregistre un échange et montre le complément à payer', async () => {
    const requetes = simulerApi(({ methode }) =>
      methode === 'POST'
        ? json(
            retour({
              produitId: 'p-1',
              designation: "L'Île au trésor",
              issue: 'echange',
              montantRembourse: 0,
              complementPaye: 300,
              venteEchangeId: 'v-2',
            }),
            201,
          )
        : undefined,
    )
    afficher()
    const champs = await formulaire()

    fireEvent.click(champs.getByRole('radio', { name: /Échange/ }))
    fireEvent.click(champs.getByRole('checkbox', { name: /le plastique de l’article rendu est intact/ }))
    fireEvent.change(champs.getByLabelText('Article envoyé en échange'), { target: { value: 'p-3' } })
    fireEvent.click(champs.getByRole('button', { name: 'Enregistrer le retour' }))

    const resultat = await screen.findByRole('status')
    expect(resultat).toHaveTextContent('Échange enregistré')
    expect(resultat).toHaveTextContent('Complément à payer par le client : 300 XPF.')
    expect(resultat).toHaveTextContent('Le nouvel article part chez Léa Martin, à l’adresse de la commande, avec la livraison offerte.')
    expect(envoi(requetes)?.corps).toEqual({
      produitId: 'p-1',
      quantite: 1,
      issue: 'echange',
      revendable: true,
      echange: { lignes: [{ produitId: 'p-3', quantite: 1 }] },
    })
  })

  it('annonce un remplacement impossible remboursé à la place', async () => {
    const requetes = simulerApi(({ methode }) =>
      methode === 'POST'
        ? json(retour({ issue: 'remplacement', revendable: false, remplacementImpossible: true }), 201)
        : undefined,
    )
    afficher()
    const champs = await formulaire()

    fireEvent.click(champs.getByRole('radio', { name: /Remplacement/ }))
    fireEvent.click(champs.getByRole('button', { name: 'Enregistrer le retour' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Aucun exemplaire neuf n’était disponible : le retour a été remboursé à la place. À rembourser au client : 950 XPF.',
    )
    expect(envoi(requetes)?.corps).toMatchObject({ issue: 'remplacement', revendable: false })
  })

  it('explique sous le champ un article d échange devenu indisponible', async () => {
    simulerApi(({ methode }) =>
      methode === 'POST'
        ? json({ code: 'LIGNE_INDISPONIBLE', message: 'Indisponible.', details: { lignes: [] } }, 409)
        : undefined,
    )
    afficher()
    const champs = await formulaire()

    fireEvent.click(champs.getByRole('radio', { name: /Échange/ }))
    fireEvent.click(champs.getByRole('checkbox', { name: /le plastique de l’article rendu est intact/ }))
    fireEvent.change(champs.getByLabelText('Article envoyé en échange'), { target: { value: 'p-3' } })
    fireEvent.click(champs.getByRole('button', { name: 'Enregistrer le retour' }))

    await waitFor(() =>
      expect(champs.getByLabelText('Article envoyé en échange')).toHaveAccessibleDescription(
        /n’est plus disponible en stock/,
      ),
    )
  })

  it('explique sous la quantité ce que le serveur refuse', async () => {
    simulerApi(({ methode }) =>
      methode === 'POST'
        ? json(
            { code: 'QUANTITE_NON_RETOURNABLE', message: 'Non.', details: { quantiteRetournable: 0 } },
            409,
          )
        : undefined,
    )
    afficher()
    const champs = await formulaire()

    fireEvent.click(champs.getByRole('button', { name: 'Enregistrer le retour' }))

    await waitFor(() =>
      expect(champs.getByLabelText('Quantité rendue')).toHaveAccessibleDescription(
        'Tous les exemplaires de cet article ont déjà été retournés.',
      ),
    )
  })

  it('explique un délai dépassé entre-temps et recharge', async () => {
    simulerApi(({ methode }) =>
      methode === 'POST'
        ? json(
            {
              code: 'DELAI_RETOUR_DEPASSE',
              message: 'Délai dépassé.',
              details: { dateLimiteRetour: '2026-11-25T09:59:59.999Z' },
            },
            409,
          )
        : undefined,
    )
    const onChangement = afficher()
    const champs = await formulaire()

    fireEvent.click(champs.getByRole('button', { name: 'Enregistrer le retour' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Le délai de retour est dépassé depuis le 24 novembre 2026',
    )
    expect(onChangement).toHaveBeenCalled()
  })

  it('explique une commande pas encore expédiée', async () => {
    simulerApi(({ methode }) =>
      methode === 'POST' ? json({ code: 'VENTE_NON_EXPEDIEE', message: 'Non expédiée.' }, 409) : undefined,
    )
    afficher()
    const champs = await formulaire()

    fireEvent.click(champs.getByRole('button', { name: 'Enregistrer le retour' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Marquez-la d’abord comme expédiée/)
  })

  it('explique un stock modifié pendant l enregistrement', async () => {
    simulerApi(({ methode }) =>
      methode === 'POST' ? json({ code: 'STOCK_MODIFIE', message: 'Stock modifié.' }, 409) : undefined,
    )
    afficher()
    const champs = await formulaire()

    fireEvent.click(champs.getByRole('button', { name: 'Enregistrer le retour' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/rien n’a été enregistré/)
  })
})
