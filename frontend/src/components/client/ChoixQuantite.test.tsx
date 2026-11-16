import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ChoixQuantite from './ChoixQuantite.tsx'

describe('choix de la quantité', () => {
  it('ajoute et retire un exemplaire', () => {
    const onChange = vi.fn()
    render(<ChoixQuantite valeur={2} onChange={onChange} libelle="Quantité" />)

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un exemplaire' }))
    fireEvent.click(screen.getByRole('button', { name: 'Retirer un exemplaire' }))

    expect(onChange).toHaveBeenNthCalledWith(1, 3)
    expect(onChange).toHaveBeenNthCalledWith(2, 1)
  })

  it('ne descend pas sous 1', () => {
    render(<ChoixQuantite valeur={1} onChange={vi.fn()} libelle="Quantité" />)

    expect(screen.getByRole('button', { name: 'Retirer un exemplaire' })).toBeDisabled()
  })

  it('accepte une quantité tapée au clavier si c est un entier positif', () => {
    const onChange = vi.fn()
    render(<ChoixQuantite valeur={1} onChange={onChange} libelle="Quantité de Casino Royale" />)
    const champ = screen.getByLabelText('Quantité de Casino Royale')

    fireEvent.change(champ, { target: { value: '5' } })
    fireEvent.change(champ, { target: { value: '0' } })
    fireEvent.change(champ, { target: { value: 'abc' } })
    fireEvent.change(champ, { target: { value: '2.5' } })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(5)
  })
})
