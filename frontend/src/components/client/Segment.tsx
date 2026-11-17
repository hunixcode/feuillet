import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'

interface OptionSegment {
  valeur: string
  libelle: string
  to?: string
  state?: unknown
}

interface SegmentProps {
  libelle: string
  options: OptionSegment[]
  valeur: string
  onChange?: (valeur: string) => void
}

export default function Segment({ libelle, options, valeur, onChange }: SegmentProps) {
  const conteneur = useRef<HTMLDivElement>(null)
  const [curseur, setCurseur] = useState<CSSProperties>()

  useLayoutEffect(() => {
    const placer = () => {
      const actif = conteneur.current?.querySelector<HTMLElement>('[data-actif="true"]')
      if (actif && actif.offsetWidth > 0) {
        setCurseur({ width: actif.offsetWidth, transform: `translateX(${actif.offsetLeft}px)` })
      }
    }
    const cadre = window.requestAnimationFrame(placer)
    void document.fonts?.ready.then(placer)
    window.addEventListener('resize', placer)
    return () => {
      window.cancelAnimationFrame(cadre)
      window.removeEventListener('resize', placer)
    }
  }, [valeur])

  return (
    <div className="segment" role="group" aria-label={libelle} ref={conteneur}>
      <span className="segment-curseur" style={curseur} hidden={!curseur} />
      {options.map((option) =>
        option.to ? (
          <Link
            key={option.valeur}
            to={option.to}
            state={option.state}
            replace
            data-actif={option.valeur === valeur}
            aria-current={option.valeur === valeur ? 'page' : undefined}
          >
            {option.libelle}
          </Link>
        ) : (
          <button
            key={option.valeur}
            type="button"
            data-actif={option.valeur === valeur}
            aria-pressed={option.valeur === valeur}
            onClick={() => onChange?.(option.valeur)}
          >
            {option.libelle}
          </button>
        ),
      )}
    </div>
  )
}
