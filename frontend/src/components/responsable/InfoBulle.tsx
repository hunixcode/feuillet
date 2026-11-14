import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import './InfoBulle.css'

const LARGEUR = 240
const MARGE = 8

interface InfoBulleProps {
  libelle: string
  info: string
  aDroite?: boolean
}

function InfoBulle({ libelle, info, aDroite = false }: InfoBulleProps) {
  const id = useId()
  const ancre = useRef<HTMLSpanElement>(null)
  const [position, setPosition] = useState<CSSProperties | null>(null)

  useEffect(() => {
    if (!position) {
      return
    }
    const fermer = () => setPosition(null)
    window.addEventListener('scroll', fermer, true)
    window.addEventListener('resize', fermer)
    return () => {
      window.removeEventListener('scroll', fermer, true)
      window.removeEventListener('resize', fermer)
    }
  }, [position])

  function ouvrir() {
    const cadre = ancre.current?.getBoundingClientRect()
    if (!cadre) {
      return
    }
    const voulu = aDroite ? cadre.right - LARGEUR : cadre.left
    const plusADroite = window.innerWidth - LARGEUR - MARGE
    setPosition({
      top: cadre.bottom + MARGE,
      left: Math.max(MARGE, Math.min(voulu, plusADroite)),
      width: LARGEUR,
    })
  }

  return (
    <span
      ref={ancre}
      className="info-terme"
      tabIndex={0}
      aria-describedby={id}
      onMouseEnter={ouvrir}
      onMouseLeave={() => setPosition(null)}
      onFocus={ouvrir}
      onBlur={() => setPosition(null)}
      onKeyDown={(evenement) => {
        if (evenement.key === 'Escape') {
          setPosition(null)
        }
      }}
    >
      {libelle}
      <span
        className={position ? 'info-bulle info-bulle--visible' : 'info-bulle'}
        id={id}
        role="tooltip"
        aria-hidden="true"
        style={position ?? undefined}
      >
        {info}
      </span>
    </span>
  )
}

export default InfoBulle
