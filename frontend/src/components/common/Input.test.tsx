import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Input from './Input'

describe('Input', () => {
  it('associe le label au champ et transmet ses propriétés', () => {
    render(
      <Input
        label="Adresse courriel"
        id="email"
        type="email"
        placeholder="nom@exemple.test"
        required
      />,
    )

    const input = screen.getByRole('textbox', { name: 'Adresse courriel' })
    expect(input).toHaveAttribute('id', 'email')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAttribute('placeholder', 'nom@exemple.test')
    expect(input).toBeRequired()
  })

  it('génère un identifiant distinct si aucun id n’est fourni', () => {
    render(
      <>
        <Input label="Prénom" />
        <Input label="Nom" />
      </>,
    )

    const first = screen.getByRole('textbox', { name: 'Prénom' })
    const second = screen.getByRole('textbox', { name: 'Nom' })
    expect(first.id).not.toBe('')
    expect(second.id).not.toBe(first.id)
  })

  it('indique une erreur avec aria-invalid et associe son message', () => {
    render(<Input label="Adresse courriel" error="Adresse invalide." />)

    const input = screen.getByRole('textbox', { name: 'Adresse courriel' })
    const error = screen.getByText('Adresse invalide.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(error).toHaveAttribute('id', `${input.id}-error`)
    expect(input).toHaveAttribute('aria-describedby', error.id)
  })

  it('préserve les descriptions fournies et indique aria-invalid sans erreur', () => {
    render(
      <Input
        label="Mot de passe"
        aria-describedby="aide-mot-de-passe"
        aria-invalid="true"
      />,
    )

    const input = screen.getByRole('textbox', { name: 'Mot de passe' })
    expect(input).toHaveAttribute('aria-describedby', 'aide-mot-de-passe')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText(/erreur/i)).not.toBeInTheDocument()
  })

  it('combine la description existante et le message d’erreur', () => {
    render(
      <Input
        label="Adresse courriel"
        aria-describedby="aide"
        error="Adresse invalide."
      />,
    )

    const input = screen.getByRole('textbox', { name: 'Adresse courriel' })
    expect(input.getAttribute('aria-describedby')?.split(' ')).toEqual([
      'aide',
      `${input.id}-error`,
    ])
  })

  it('transmet la saisie et les classes CSS', async () => {
    const onChange = vi.fn()
    render(
      <Input label="Recherche" className="custom" onChange={onChange} />,
    )

    const input = screen.getByRole('textbox', { name: 'Recherche' })
    fireEvent.change(input, { target: { value: 'roman' } })
    expect(input).toHaveValue('roman')
    expect(input).toHaveClass('common-input__field', 'custom')
    expect(onChange).toHaveBeenCalled()
  })
})
