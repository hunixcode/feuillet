import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GestionFournisseurs from './GestionFournisseurs.tsx'

const fournisseurs = [
  { id: 'f-1', nom: 'Diffusion Océanie', contact: 'commandes@do.pf' },
  { id: 'f-2', nom: 'Éditions du Récif' },
]

function json(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

function afficher(onEnregistre = vi.fn()) {
  render(<GestionFournisseurs fournisseurs={fournisseurs} onEnregistre={onEnregistre} />)
  return onEnregistre
}

describe('GestionFournisseurs', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('liste les fournisseurs avec leur contact', () => {
    afficher()

    expect(screen.getByText('Diffusion Océanie').closest('tr')).toHaveTextContent('commandes@do.pf')
    expect(screen.getByText('Éditions du Récif').closest('tr')).toHaveTextContent('Non renseigné')
  })

  it('exige un nom', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    afficher()

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le fournisseur' }))

    expect(screen.getByLabelText('Nom')).toHaveAccessibleDescription('Le nom est obligatoire.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ajoute un fournisseur', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ id: 'f-3' }, 201))
    const onEnregistre = afficher()

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: '  Papeterie du Lagon ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le fournisseur' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Papeterie du Lagon a été ajouté.')
    expect(onEnregistre).toHaveBeenCalled()
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/fournisseurs')
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ nom: 'Papeterie du Lagon' })
  })

  it('modifie un fournisseur existant', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ id: 'f-1' }))
    afficher()

    fireEvent.click(screen.getByRole('button', { name: 'Modifier Diffusion Océanie' }))

    expect(screen.getByRole('heading', { name: 'Modifier Diffusion Océanie' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nom')).toHaveValue('Diffusion Océanie')
    expect(screen.getByLabelText('Contact (facultatif)')).toHaveValue('commandes@do.pf')

    fireEvent.change(screen.getByLabelText('Contact (facultatif)'), { target: { value: '40 50 60 70' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }))

    await waitFor(() => expect(String(fetchMock.mock.calls[0][0])).toBe('/api/fournisseurs/f-1'))
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PUT')
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      nom: 'Diffusion Océanie',
      contact: '40 50 60 70',
    })
    expect(await screen.findByRole('heading', { name: 'Ajouter un fournisseur' })).toBeInTheDocument()
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
    afficher()

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Papeterie du Lagon' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le fournisseur' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Contact (facultatif)')).toHaveAccessibleDescription(
        'Le contact ne doit pas dépasser 200 caractères.',
      ),
    )
  })
})
