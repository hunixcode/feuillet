import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Produit } from '../../types/produit'
import { demandeDeTest, demandeHorsCatalogue, demandeMiseDeCote } from './demandesDeTest'
import PanneauDemande from './PanneauDemande.tsx'

const categories = [{ id: 'roman', libelle: 'Roman' }]

function produit(valeurs: Partial<Produit> = {}): Produit {
  return {
    id: 'p-9',
    reference: 'LIV-090',
    designation: 'Le Rouge et le Noir',
    type: 'livre',
    categorie: 'roman',
    prix: 1900,
    tauxTva: 5,
    archive: false,
    prixApplique: 1900,
    ...valeurs,
  }
}

interface Requete {
  url: string
  methode: string
  corps?: unknown
}

function json(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

function simulerApi(reponse: (requete: Requete) => Response) {
  const requetes: Requete[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree, options) => {
    const requete = {
      url: String(entree),
      methode: options?.method ?? 'GET',
      corps: options?.body ? JSON.parse(String(options.body)) : undefined,
    }
    requetes.push(requete)
    return reponse(requete)
  })
  return requetes
}

function afficher(demande = demandeHorsCatalogue(), produits: Produit[] = [], onChangement = vi.fn()) {
  render(
    <PanneauDemande demande={demande} produits={produits} categories={categories} onChangement={onChangement} />,
  )
  return onChangement
}

function remplirFiche() {
  fireEvent.change(screen.getByLabelText('Référence'), { target: { value: 'LIV-090' } })
  fireEvent.change(screen.getByLabelText('Catégorie'), { target: { value: 'roman' } })
  fireEvent.change(screen.getByLabelText('Prix TTC (XPF)'), { target: { value: '1900' } })
  fireEvent.change(screen.getByLabelText('Taux de TVA (%)'), { target: { value: '5' } })
}

describe('PanneauDemande', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('rappelle qu une demande n est pas une vente', () => {
    afficher(demandeDeTest())

    expect(screen.getByRole('heading', { name: 'L’Île au trésor' })).toBeInTheDocument()
    expect(screen.getByText(/Une demande n’est pas une vente : le client n’a rien payé/)).toBeInTheDocument()
    expect(screen.getByText('Article épuisé')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ajouter ce livre au catalogue' })).not.toBeInTheDocument()
  })

  it('donne la quantité mise de côté et la date limite', () => {
    afficher(demandeMiseDeCote({ quantiteSouhaitee: 3 }))

    expect(screen.getByText('Mis de côté').nextElementSibling).toHaveTextContent('1 exemplaire sur 3')
    expect(screen.getByText('Date limite').nextElementSibling).toHaveTextContent('15 novembre 2026 inclus')
  })

  it('donne la date de fin d une demande terminée', () => {
    afficher(demandeDeTest({ statut: 'expiree', dateFin: '2026-11-12T20:00:00.000Z' }))

    expect(screen.getByText('Expirée le').nextElementSibling).toHaveTextContent('12 novembre 2026')
  })

  it('pré-remplit la fiche du livre hors catalogue avec ce que le client a saisi', () => {
    afficher()

    expect(screen.getByText('Absent du catalogue')).toBeInTheDocument()
    expect(screen.getByLabelText('Désignation')).toHaveValue('Le Rouge et le Noir')
    expect(screen.getByLabelText('Auteur')).toHaveValue('Stendhal')
    expect(screen.getByLabelText('ISBN')).toHaveValue('978-2-07-041311-0')
    expect(screen.getByLabelText('Type')).toHaveValue('livre')
  })

  it('crée l article puis y rattache la demande', async () => {
    const cree = produit()
    const requetes = simulerApi(({ url }) =>
      url === '/api/produits' ? json(cree, 201) : json({ ...demandeHorsCatalogue(), produitId: 'p-9' }),
    )
    const onChangement = afficher()
    remplirFiche()

    fireEvent.click(screen.getByRole('button', { name: 'Créer l’article et rattacher la demande' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'La demande est rattachée à « Le Rouge et le Noir ».',
    )
    expect(requetes.map((requete) => `${requete.methode} ${requete.url}`)).toEqual([
      'POST /api/produits',
      'POST /api/demandes/d-2/rattachement',
    ])
    expect(requetes[0].corps).toMatchObject({
      designation: 'Le Rouge et le Noir',
      auteur: 'Stendhal',
      isbn: '978-2-07-041311-0',
      reference: 'LIV-090',
    })
    expect(requetes[1].corps).toEqual({ produitId: 'p-9' })
    expect(onChangement).toHaveBeenCalledWith(expect.objectContaining({ produitId: 'p-9' }))
  })

  it('garde l article créé et propose de réessayer si le rattachement échoue', async () => {
    let essais = 0
    const requetes = simulerApi(({ url }) => {
      if (url === '/api/produits') {
        return json(produit(), 201)
      }
      essais += 1
      return essais === 1
        ? json({ code: 'ERREUR_SERVEUR', message: 'Le serveur ne répond pas.' }, 500)
        : json({ ...demandeHorsCatalogue(), produitId: 'p-9' })
    })
    afficher()
    remplirFiche()
    fireEvent.click(screen.getByRole('button', { name: 'Créer l’article et rattacher la demande' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Le serveur ne répond pas.')
    fireEvent.click(screen.getByRole('button', { name: 'Rattacher à « Le Rouge et le Noir »' }))

    expect(await screen.findByRole('status')).toHaveTextContent('La demande est rattachée')
    expect(requetes.filter((requete) => requete.url === '/api/produits')).toHaveLength(1)
  })

  it('rattache la demande à un article déjà au catalogue', async () => {
    const existant = produit({ id: 'p-5', designation: 'Le Rouge et le Noir (poche)', reference: 'LIV-050' })
    const requetes = simulerApi(() => json({ ...demandeHorsCatalogue(), produitId: 'p-5' }))
    afficher(demandeHorsCatalogue(), [existant])

    fireEvent.click(screen.getByRole('radio', { name: 'Il est déjà au catalogue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Rattacher la demande' }))
    expect(screen.getByLabelText('Article du catalogue')).toHaveAccessibleDescription(
      'Choisissez l’article du catalogue qui correspond à la demande.',
    )
    expect(requetes).toHaveLength(0)

    fireEvent.change(screen.getByLabelText('Article du catalogue'), { target: { value: 'p-5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rattacher la demande' }))

    expect(await screen.findByRole('status')).toHaveTextContent('« Le Rouge et le Noir (poche) »')
    expect(requetes[0]).toEqual({
      url: '/api/demandes/d-2/rattachement',
      methode: 'POST',
      corps: { produitId: 'p-5' },
    })
  })

  it('explique une demande qui n est plus rattachable et recharge', async () => {
    simulerApi(() => json({ code: 'DEMANDE_NON_RATTACHABLE', message: 'Refusé.' }, 409))
    const onChangement = afficher(demandeHorsCatalogue(), [produit()])
    fireEvent.click(screen.getByRole('radio', { name: 'Il est déjà au catalogue' }))
    fireEvent.change(screen.getByLabelText('Article du catalogue'), { target: { value: 'p-9' } })

    fireEvent.click(screen.getByRole('button', { name: 'Rattacher la demande' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/ne peut plus être rattachée/)
    expect(onChangement).toHaveBeenCalledWith()
  })

  it('ne rattache rien si la création de l article est refusée', async () => {
    const requetes = simulerApi(() =>
      json({ code: 'REFERENCE_DEJA_UTILISEE', message: 'Cette référence est déjà utilisée.' }, 409),
    )
    const onChangement = afficher()
    remplirFiche()

    fireEvent.click(screen.getByRole('button', { name: 'Créer l’article et rattacher la demande' }))

    expect(await screen.findByText('Cette référence est déjà utilisée.')).toBeInTheDocument()
    expect(requetes.map((requete) => requete.url)).toEqual(['/api/produits'])
    expect(onChangement).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('ne propose pas les articles archivés', () => {
    afficher(demandeHorsCatalogue(), [
      produit({ id: 'p-1', designation: 'Le Rouge et le Noir (poche)' }),
      produit({ id: 'p-2', designation: 'Le Rouge et le Noir (ancienne édition)', archive: true }),
    ])

    fireEvent.click(screen.getByRole('radio', { name: 'Il est déjà au catalogue' }))

    const options = Array.from((screen.getByLabelText('Article du catalogue') as HTMLSelectElement).options)
    expect(options.map((option) => option.value)).toEqual(['', 'p-1'])
  })

  it('ne propose pas le rattachement d une demande hors catalogue annulée', () => {
    afficher(demandeHorsCatalogue({ statut: 'annulee', dateFin: '2026-11-10T20:00:00.000Z' }))

    expect(screen.queryByRole('heading', { name: 'Ajouter ce livre au catalogue' })).not.toBeInTheDocument()
    expect(screen.getByText('Annulée le')).toBeInTheDocument()
  })
})
