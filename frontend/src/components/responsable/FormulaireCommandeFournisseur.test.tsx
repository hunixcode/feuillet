import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Produit } from '../../types/produit'
import FormulaireCommandeFournisseur from './FormulaireCommandeFournisseur.tsx'

const fournisseurs = [{ id: 'f-1', nom: 'Diffusion Océanie' }]

const produits: Produit[] = [
  {
    id: 'p-1',
    reference: 'LIV-001',
    designation: "L'Île au trésor",
    type: 'livre',
    categorie: 'roman',
    prix: 1800,
    tauxTva: 5,
    archive: false,
    prixApplique: 1800,
  },
]

function json(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

function afficher(onCreee = vi.fn(), liste = fournisseurs) {
  render(
    <FormulaireCommandeFournisseur
      fournisseurs={liste}
      produits={produits}
      aujourdhui="2026-11-14"
      onCreee={onCreee}
      onAnnuler={vi.fn()}
    />,
  )
  return onCreee
}

function remplir(quantite: string, date: string) {
  fireEvent.change(screen.getByLabelText('Fournisseur'), { target: { value: 'f-1' } })
  fireEvent.change(screen.getByLabelText('Article'), { target: { value: 'p-1' } })
  fireEvent.change(screen.getByLabelText('Quantité'), { target: { value: quantite } })
  fireEvent.change(screen.getByLabelText('Arrivée prévue'), { target: { value: date } })
}

describe('FormulaireCommandeFournisseur', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche les erreurs sous chaque champ sans rien envoyer', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    afficher()

    fireEvent.click(screen.getByRole('button', { name: 'Passer la commande' }))

    expect(screen.getByLabelText('Fournisseur')).toHaveAccessibleDescription('Choisissez le fournisseur.')
    expect(screen.getByLabelText('Article')).toHaveAccessibleDescription('Choisissez l’article à commander.')
    expect(screen.getByLabelText('Quantité')).toHaveAccessibleDescription(
      'Indiquez le nombre d’exemplaires à commander.',
    )
    expect(screen.getByLabelText('Arrivée prévue')).toHaveAccessibleDescription(
      'Indiquez la date d’arrivée annoncée par le fournisseur.',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuse une quantité hors limites et une date passée', () => {
    afficher()
    remplir('0', '2026-11-13')

    fireEvent.click(screen.getByRole('button', { name: 'Passer la commande' }))

    expect(screen.getByLabelText('Quantité')).toHaveAccessibleDescription(
      'La quantité doit être un nombre entier entre 1 et 9999.',
    )
    expect(screen.getByLabelText('Arrivée prévue')).toHaveAccessibleDescription(
      'La date d’arrivée prévue ne peut pas être passée.',
    )
  })

  it('passe la commande', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ id: 'cf-9' }, 201))
    const onCreee = afficher()
    remplir('12', '2026-11-20')

    fireEvent.click(screen.getByRole('button', { name: 'Passer la commande' }))

    await waitFor(() => expect(onCreee).toHaveBeenCalledWith({ id: 'cf-9' }))
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      fournisseurId: 'f-1',
      produitId: 'p-1',
      quantiteCommandee: 12,
      dateArriveePrevue: '2026-11-20',
    })
  })

  it('place les erreurs du serveur sous les champs concernés', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json(
        {
          code: 'VALIDATION',
          message: 'Certains champs sont invalides.',
          details: { champs: { produitId: 'Produit introuvable ou archivé.' } },
        },
        400,
      ),
    )
    afficher()
    remplir('12', '2026-11-20')

    fireEvent.click(screen.getByRole('button', { name: 'Passer la commande' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Article')).toHaveAccessibleDescription(
        'Produit introuvable ou archivé.',
      ),
    )
  })

  it('demande d ajouter un fournisseur s il n y en a aucun', () => {
    afficher(vi.fn(), [])

    expect(screen.getByText(/Ajoutez d’abord un fournisseur/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Passer la commande' })).not.toBeInTheDocument()
  })
})
