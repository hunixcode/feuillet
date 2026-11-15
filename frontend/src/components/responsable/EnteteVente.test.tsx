import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import EnteteVente from './EnteteVente.tsx'
import { venteDeTest } from './ventesDeTest'

describe('EnteteVente', () => {
  it('donne le client, la date et la date d expédition', () => {
    render(<EnteteVente vente={venteDeTest()} expedition={false} onExpedier={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Léa Martin' })).toBeInTheDocument()
    expect(screen.getByText('Commande du 10/11/2026 10:00')).toBeInTheDocument()
    expect(screen.getByText('Expédiée le 11/11/2026 09:00')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marquer comme expédiée' })).not.toBeInTheDocument()
  })

  it('propose de marquer une commande à préparer comme expédiée', () => {
    const onExpedier = vi.fn()
    render(
      <EnteteVente
        vente={venteDeTest({ statut: 'a_preparer', dateExpedition: undefined })}
        expedition={false}
        onExpedier={onExpedier}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Marquer comme expédiée' }))

    expect(onExpedier).toHaveBeenCalledTimes(1)
  })
})
