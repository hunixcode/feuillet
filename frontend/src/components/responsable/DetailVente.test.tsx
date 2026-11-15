import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DetailVente from './DetailVente.tsx'
import { venteDeTest } from './ventesDeTest'

function total(libelle: string) {
  return screen.getByText(libelle).closest('div')
}

describe('DetailVente', () => {
  it('donne les prix figés, les remises et la TVA de chaque ligne', () => {
    render(<DetailVente vente={venteDeTest()} />)

    const ligne = screen.getByText("L'Île au trésor").closest('tr')
    expect(ligne).toHaveTextContent('LIV-001')
    expect(ligne).toHaveTextContent('1 530 XPF−15 %')
    expect(ligne).toHaveTextContent('5 %146 XPF')
    expect(ligne).toHaveTextContent('3 060 XPF')
    expect(screen.getByText('Carnet ligné A5').closest('tr')).not.toHaveTextContent('−')
  })

  it('détaille le sous-total, la TVA, les frais et le total donnés par le serveur', () => {
    render(
      <DetailVente
        vente={venteDeTest({ emballageCadeau: true, fraisEmballage: 300, occasionCadeau: 'anniversaire' })}
      />,
    )

    expect(total('Sous-total des articles')).toHaveTextContent('4 010 XPF')
    expect(total('dont TVA')).toHaveTextContent('277 XPF')
    expect(total('Emballage cadeau')).toHaveTextContent('300 XPF')
    expect(total('Livraison')).toHaveTextContent('800 XPF')
    expect(total('Total payé')).toHaveTextContent('4 810 XPF')
    expect(screen.getByText('Anniversaire, avec emballage cadeau')).toBeInTheDocument()
  })

  it('donne l adresse de livraison', () => {
    render(<DetailVente vente={venteDeTest()} />)

    expect(screen.getByText('BP 12, Papeete')).toBeInTheDocument()
  })
})
