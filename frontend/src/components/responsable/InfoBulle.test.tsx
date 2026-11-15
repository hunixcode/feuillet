import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import InfoBulle from './InfoBulle.tsx'

function terme() {
  return screen.getByText('Vendable', { selector: '.info-terme' })
}

function bulle() {
  return document.querySelector('.info-bulle') as HTMLElement
}

function placer(cadre: Partial<DOMRect>) {
  vi.spyOn(terme(), 'getBoundingClientRect').mockReturnValue({
    top: 0,
    bottom: 20,
    left: 0,
    right: 0,
    width: 0,
    height: 20,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...cadre,
  })
}

describe('InfoBulle', () => {
  it('rattache l explication au terme pour les lecteurs d écran', () => {
    render(<InfoBulle libelle="Vendable" info="En rayon moins mis de côté." />)

    expect(terme()).toHaveAccessibleDescription('En rayon moins mis de côté.')
    expect(terme()).toHaveAttribute('tabindex', '0')
    expect(bulle()).not.toHaveClass('info-bulle--visible')
  })

  it('s affiche sous le terme au survol puis se cache', () => {
    render(<InfoBulle libelle="Vendable" info="En rayon moins mis de côté." />)
    placer({ left: 100, right: 160, bottom: 50 })

    fireEvent.mouseEnter(terme())

    expect(bulle()).toHaveClass('info-bulle--visible')
    expect(bulle()).toHaveStyle({ top: '58px', left: '100px', width: '240px' })

    fireEvent.mouseLeave(terme())

    expect(bulle()).not.toHaveClass('info-bulle--visible')
  })

  it('s aligne à droite du terme pour une colonne de nombres', () => {
    render(<InfoBulle libelle="Vendable" info="Texte" aDroite />)
    placer({ left: 400, right: 500 })

    fireEvent.mouseEnter(terme())

    expect(bulle()).toHaveStyle({ left: '260px' })
  })

  it('reste dans la fenêtre', () => {
    render(<InfoBulle libelle="Vendable" info="Texte" />)
    placer({ left: window.innerWidth - 20, right: window.innerWidth })

    fireEvent.mouseEnter(terme())

    expect(bulle()).toHaveStyle({ left: `${window.innerWidth - 248}px` })
  })

  it('s ouvre au clavier et se ferme avec Échap', () => {
    render(<InfoBulle libelle="Vendable" info="Texte" />)

    fireEvent.focus(terme())
    expect(bulle()).toHaveClass('info-bulle--visible')

    fireEvent.keyDown(terme(), { key: 'Escape' })
    expect(bulle()).not.toHaveClass('info-bulle--visible')
  })

  it('garde Échap pour elle seulement quand elle est ouverte', () => {
    const echap = vi.fn()
    document.addEventListener('keydown', echap)
    render(<InfoBulle libelle="Vendable" info="Texte" />)

    fireEvent.focus(terme())
    fireEvent.keyDown(terme(), { key: 'Escape' })
    expect(echap).not.toHaveBeenCalled()

    fireEvent.keyDown(terme(), { key: 'Escape' })
    expect(echap).toHaveBeenCalledTimes(1)
    document.removeEventListener('keydown', echap)
  })

  it('se cache quand la page défile', () => {
    render(<InfoBulle libelle="Vendable" info="Texte" />)
    fireEvent.mouseEnter(terme())

    fireEvent.scroll(window)

    expect(bulle()).not.toHaveClass('info-bulle--visible')
  })
})
