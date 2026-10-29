import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EtatStock, LigneStock } from '../../types/stock'
import FormulaireInventaire from './FormulaireInventaire.tsx'

const ligne: LigneStock = {
  produitId: 'p-1',
  reference: 'LIV-001',
  designation: "L'Île au trésor",
  quantitePhysique: 12,
  quantiteMiseDeCote: 2,
  quantiteDefectueuse: 0,
  quantiteVendable: 10,
}

const etat: EtatStock = {
  produitId: 'p-1',
  quantitePhysique: 10,
  quantiteMiseDeCote: 2,
  quantiteDefectueuse: 0,
  quantiteVendable: 8,
}

function simulerFetch(corps: unknown, status = 200) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(corps), { status }))
}

function saisir(quantite: string, motif: string) {
  fireEvent.change(screen.getByLabelText('Quantité comptée'), { target: { value: quantite } })
  fireEvent.change(screen.getByLabelText('Motif'), { target: { value: motif } })
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la correction' }))
}

describe('FormulaireInventaire', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche la quantité enregistrée en lecture seule', () => {
    render(<FormulaireInventaire ligne={ligne} onChangement={vi.fn()} onRecharger={vi.fn()} />)

    const champ = screen.getByLabelText('Quantité enregistrée')
    expect(champ).toHaveValue(12)
    expect(champ).toHaveAttribute('readonly')
  })

  it('envoie la quantité comptée et le motif puis transmet le nouvel état', async () => {
    const fetchMock = simulerFetch(etat)
    const onChangement = vi.fn()
    render(<FormulaireInventaire ligne={ligne} onChangement={onChangement} onRecharger={vi.fn()} />)

    saisir('10', '  Comptage annuel ')

    await waitFor(() => expect(onChangement).toHaveBeenCalledWith(etat))
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/produits/p-1/stock/inventaire')
    expect(JSON.parse(String(options.body))).toEqual({ quantiteComptee: 10, motif: 'Comptage annuel' })
    expect(screen.getByRole('status')).toHaveTextContent('Correction d’inventaire enregistrée.')
    expect(screen.getByLabelText('Quantité comptée')).toHaveValue(null)
  })

  it('affiche les erreurs du serveur sous chaque champ', async () => {
    simulerFetch(
      {
        code: 'VALIDATION',
        message: 'Certains champs sont invalides.',
        details: { champs: { quantiteComptee: 'Entier positif attendu.', motif: 'Motif obligatoire.' } },
      },
      400,
    )
    const onChangement = vi.fn()
    render(<FormulaireInventaire ligne={ligne} onChangement={onChangement} onRecharger={vi.fn()} />)

    saisir('-1', '')

    expect(await screen.findByText('Entier positif attendu.')).toBeInTheDocument()
    expect(screen.getByText('Motif obligatoire.')).toBeInTheDocument()
    expect(screen.getByLabelText('Quantité comptée')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onChangement).not.toHaveBeenCalled()
  })

  it('explique un compte inférieur au mis de côté', async () => {
    simulerFetch({ code: 'STOCK_INSUFFISANT', message: 'Stock insuffisant.' }, 409)
    const onRecharger = vi.fn()
    render(<FormulaireInventaire ligne={ligne} onChangement={vi.fn()} onRecharger={onRecharger} />)

    saisir('1', 'Comptage')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La quantité comptée ne peut pas être inférieure aux exemplaires mis de côté.',
    )
    expect(screen.getByLabelText('Quantité comptée')).toHaveValue(1)
    expect(onRecharger).not.toHaveBeenCalled()
  })

  it('recharge le stock et demande de recommencer quand il a changé', async () => {
    simulerFetch({ code: 'STOCK_MODIFIE', message: 'Conflit.' }, 409)
    const onChangement = vi.fn()
    const onRecharger = vi.fn()
    render(<FormulaireInventaire ligne={ligne} onChangement={onChangement} onRecharger={onRecharger} />)

    saisir('11', 'Comptage')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Le stock a changé, rechargez et recommencez.',
    )
    expect(onRecharger).toHaveBeenCalledTimes(1)
    expect(onChangement).not.toHaveBeenCalled()
  })

  it('désactive le bouton pendant l envoi', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}))
    render(<FormulaireInventaire ligne={ligne} onChangement={vi.fn()} onRecharger={vi.fn()} />)

    saisir('11', 'Comptage')

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Enregistrer la correction' })).toBeDisabled(),
    )
  })
})
