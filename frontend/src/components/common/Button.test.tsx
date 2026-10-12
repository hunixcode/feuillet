import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Button from './Button'

describe('Button', () => {
  it('affiche un bouton primaire actif par défaut', () => {
    render(<Button>Enregistrer</Button>)

    const button = screen.getByRole('button', { name: 'Enregistrer' })
    expect(button).toBeEnabled()
    expect(button).toHaveClass('common-button--primary')
    expect(button).not.toHaveAttribute('aria-busy', 'true')
  })

  it('applique la variante secondaire et les classes supplémentaires', () => {
    render(
      <Button variant="secondary" className="custom">
        Annuler
      </Button>,
    )

    expect(screen.getByRole('button', { name: 'Annuler' })).toHaveClass(
      'common-button--secondary',
      'custom',
    )
  })

  it('désactive le bouton et indique le chargement', () => {
    render(<Button loading>Enregistrer</Button>)

    const button = screen.getByRole('button', { name: 'Enregistrer' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('reste désactivé si la propriété disabled est fournie', () => {
    render(<Button disabled>Enregistrer</Button>)

    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
  })

  it('transmet les attributs HTML et les événements', async () => {
    const onClick = vi.fn()
    render(
      <Button type="submit" name="action" value="save" onClick={onClick}>
        Enregistrer
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Enregistrer' })
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toHaveAttribute('name', 'action')
    expect(button).toHaveAttribute('value', 'save')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('ne déclenche pas le clic pendant le chargement', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Enregistrer
      </Button>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(onClick).not.toHaveBeenCalled()
  })
})
