import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CommandeFournisseur } from '../../types/reappro'
import FicheFournisseur from './FicheFournisseur.tsx'

const fournisseur = { id: 'f-1', nom: 'Diffusion Océanie', contact: 'commandes@do.pf' }

const commande: CommandeFournisseur = {
  id: 'cf-1',
  fournisseur: { id: 'f-1', nom: 'Diffusion Océanie' },
  produitId: 'p-1',
  reference: 'LIV-001',
  designation: "L'Île au trésor",
  quantiteCommandee: 10,
  quantiteRecue: 4,
  date: '2026-11-02T20:00:00.000Z',
  dateArriveePrevue: '2026-11-20',
  statut: 'partiellement_recue',
}

function json(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

describe('FicheFournisseur', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('exige un nom', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    render(<FicheFournisseur onEnregistre={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le fournisseur' }))

    expect(screen.getByLabelText('Nom')).toHaveAccessibleDescription('Le nom est obligatoire.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ajoute un fournisseur', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(json({ id: 'f-3', nom: 'Papeterie du Lagon' }, 201))
    const onEnregistre = vi.fn()
    render(<FicheFournisseur onEnregistre={onEnregistre} />)

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: '  Papeterie du Lagon ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le fournisseur' }))

    await waitFor(() =>
      expect(onEnregistre).toHaveBeenCalledWith(
        { id: 'f-3', nom: 'Papeterie du Lagon' },
        'Papeterie du Lagon a été ajouté.',
      ),
    )
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/fournisseurs')
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ nom: 'Papeterie du Lagon' })
  })

  it('modifie un fournisseur existant et liste ses commandes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ...fournisseur, contact: '40 50 60 70' }))
    const onEnregistre = vi.fn()
    render(<FicheFournisseur fournisseur={fournisseur} commandes={[commande]} onEnregistre={onEnregistre} />)

    expect(screen.getByRole('heading', { name: 'Diffusion Océanie' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nom')).toHaveValue('Diffusion Océanie')
    expect(screen.getByLabelText('Contact (facultatif)')).toHaveValue('commandes@do.pf')
    expect(screen.getByText("L'Île au trésor").closest('li')).toHaveTextContent('4 reçus sur 10')
    expect(screen.getByText('Reçue en partie')).toHaveClass('statut-partielle')

    fireEvent.change(screen.getByLabelText('Contact (facultatif)'), { target: { value: '40 50 60 70' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(String(fetchMock.mock.calls[0][0])).toBe('/api/fournisseurs/f-1'))
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PUT')
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      nom: 'Diffusion Océanie',
      contact: '40 50 60 70',
    })
    await waitFor(() => expect(onEnregistre).toHaveBeenCalledWith(expect.objectContaining({ id: 'f-1' }), 'Diffusion Océanie a été modifié.'))
  })

  it('place les erreurs du serveur sous les champs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json(
        {
          code: 'VALIDATION',
          message: 'Certains champs sont invalides.',
          details: { champs: { contact: 'Le contact ne doit pas dépasser 200 caractères.' } },
        },
        400,
      ),
    )
    render(<FicheFournisseur onEnregistre={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Papeterie du Lagon' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le fournisseur' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Contact (facultatif)')).toHaveAccessibleDescription(
        'Le contact ne doit pas dépasser 200 caractères.',
      ),
    )
  })
})
