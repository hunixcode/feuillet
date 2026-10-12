import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ErrorMessage from './ErrorMessage'

describe('ErrorMessage', () => {
  it('annonce le message avec le rôle alert', () => {
    render(<ErrorMessage>Une erreur est survenue.</ErrorMessage>)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Une erreur est survenue.',
    )
  })

  it('ajoute une classe CSS personnalisée', () => {
    render(<ErrorMessage className="custom">Échec.</ErrorMessage>)

    expect(screen.getByRole('alert')).toHaveClass('common-error', 'custom')
  })
})
