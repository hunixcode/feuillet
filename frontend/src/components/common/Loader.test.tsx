import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Loader from './Loader'

describe('Loader', () => {
  it('annonce le chargement avec le message par défaut', () => {
    render(<Loader />)

    expect(screen.getByRole('status')).toHaveTextContent('Chargement…')
  })

  it('affiche le message personnalisé et masque le décoratif aux lecteurs d’écran', () => {
    render(<Loader>Chargement des produits</Loader>)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Chargement des produits',
    )
    expect(screen.getByRole('status').querySelector('[aria-hidden="true"]'))
      .toBeInTheDocument()
  })
})
