import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EtatStock, LigneStock } from '../../types/stock'
import FormulaireDefectueux from './FormulaireDefectueux.tsx'

const ligne: LigneStock = {
  produitId: 'p-1',
  reference: 'LIV-001',
  designation: "L'Île au trésor",
  quantitePhysique: 8,
  quantiteMiseDeCote: 1,
  quantiteDefectueuse: 2,
  quantiteVendable: 7,
}

const etat: EtatStock = {
  produitId: 'p-1',
  quantitePhysique: 7,
  quantiteMiseDeCote: 1,
  quantiteDefectueuse: 3,
  quantiteVendable: 6,
}

function simulerFetch(corps: unknown, status = 200) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(corps), { status }))
}

function requete(fetchMock: ReturnType<typeof simulerFetch>) {
  const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
  return { url, corps: JSON.parse(String(options.body)) }
}

describe('FormulaireDefectueux', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('rappelle le vendable et le défectueux de l article', () => {
    render(<FormulaireDefectueux ligne={ligne} onChangement={vi.fn()} onRecharger={vi.fn()} />)

    expect(screen.getByText('7 vendables, 2 défectueux.')).toBeInTheDocument()
  })

  it('déclare des exemplaires abîmés', async () => {
    const fetchMock = simulerFetch(etat)
    const onChangement = vi.fn()
    render(<FormulaireDefectueux ligne={ligne} onChangement={onChangement} onRecharger={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Quantité'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Motif'), { target: { value: 'Couverture déchirée' } })
    fireEvent.click(screen.getByRole('button', { name: 'Passer en défectueux' }))

    await waitFor(() => expect(onChangement).toHaveBeenCalledWith(etat))
    expect(requete(fetchMock)).toEqual({
      url: '/api/produits/p-1/stock/defectueux',
      corps: { quantite: 1, motif: 'Couverture déchirée' },
    })
    expect(screen.getByRole('status')).toHaveTextContent('Exemplaires passés en stock défectueux.')
  })

  it.each([
    ['Renvoi fournisseur', '', 'Renvoi fournisseur'],
    ['Destruction', 'Pages arrachées', 'Destruction : Pages arrachées'],
  ])('sort du défectueux avec l issue %s', async (issue, precision, motif) => {
    const fetchMock = simulerFetch(etat)
    render(<FormulaireDefectueux ligne={ligne} onChangement={vi.fn()} onRecharger={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Sortir du stock défectueux' }))
    fireEvent.change(screen.getByLabelText('Quantité'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Issue'), { target: { value: issue } })
    fireEvent.change(screen.getByLabelText('Précision (facultatif)'), {
      target: { value: precision },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la sortie' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Sortie du stock défectueux enregistrée.',
    )
    expect(requete(fetchMock)).toEqual({
      url: '/api/produits/p-1/stock/defectueux/sortie',
      corps: { quantite: 2, motif },
    })
  })

  it('bloque la sortie quand il n y a aucun défectueux', () => {
    render(
      <FormulaireDefectueux
        ligne={{ ...ligne, quantiteDefectueuse: 0 }}
        onChangement={vi.fn()}
        onRecharger={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sortir du stock défectueux' }))

    expect(screen.getByText('Aucun exemplaire défectueux à sortir.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enregistrer la sortie' })).toBeDisabled()
  })

  it('explique une déclaration au-delà du vendable', async () => {
    simulerFetch({ code: 'STOCK_INSUFFISANT', message: 'Stock insuffisant.' }, 409)
    render(<FormulaireDefectueux ligne={ligne} onChangement={vi.fn()} onRecharger={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Quantité'), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText('Motif'), { target: { value: 'Abîmés' } })
    fireEvent.click(screen.getByRole('button', { name: 'Passer en défectueux' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de déclarer abîmés plus d’exemplaires que le stock vendable.',
    )
  })

  it('explique une sortie au-delà du défectueux', async () => {
    simulerFetch({ code: 'STOCK_INSUFFISANT', message: 'Stock insuffisant.' }, 409)
    render(<FormulaireDefectueux ligne={ligne} onChangement={vi.fn()} onRecharger={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Sortir du stock défectueux' }))
    fireEvent.change(screen.getByLabelText('Quantité'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la sortie' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de sortir plus d’exemplaires que le stock défectueux.',
    )
  })

  it('affiche les erreurs du serveur sous chaque champ', async () => {
    simulerFetch(
      {
        code: 'VALIDATION',
        message: 'Certains champs sont invalides.',
        details: { champs: { quantite: 'Entier strictement positif attendu.' } },
      },
      400,
    )
    render(<FormulaireDefectueux ligne={ligne} onChangement={vi.fn()} onRecharger={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Passer en défectueux' }))

    expect(await screen.findByText('Entier strictement positif attendu.')).toBeInTheDocument()
    expect(screen.getByLabelText('Quantité')).toHaveAttribute('aria-invalid', 'true')
  })

  it.each([
    ['Déclarer abîmé', 'Passer en défectueux'],
    ['Sortir du stock défectueux', 'Enregistrer la sortie'],
  ])('recharge le stock quand il a changé pendant l action %s', async (onglet, bouton) => {
    simulerFetch({ code: 'STOCK_MODIFIE', message: 'Conflit.' }, 409)
    const onRecharger = vi.fn()
    render(<FormulaireDefectueux ligne={ligne} onChangement={vi.fn()} onRecharger={onRecharger} />)

    fireEvent.click(screen.getByRole('button', { name: onglet }))
    fireEvent.change(screen.getByLabelText('Quantité'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: bouton }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Le stock a changé, rechargez et recommencez.',
    )
    expect(onRecharger).toHaveBeenCalledTimes(1)
  })

  it('efface les messages en changeant d action', async () => {
    simulerFetch({ code: 'STOCK_MODIFIE', message: 'Conflit.' }, 409)
    render(<FormulaireDefectueux ligne={ligne} onChangement={vi.fn()} onRecharger={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Passer en défectueux' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Le stock a changé, rechargez et recommencez.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sortir du stock défectueux' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sortir du stock défectueux' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
