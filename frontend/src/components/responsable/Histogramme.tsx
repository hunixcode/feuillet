import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { dateLongue, majuscule, nombre, nomJour } from '../../utils/datesAdmin'
import { formatXPF } from '../../utils/format'

export interface JourHistogramme {
  jour: string
  valeur: number
  commandes: number
  retours: number
  futur: boolean
}

interface HistogrammeProps {
  jours: JourHistogramme[]
  fort?: number
  etiquettes?: number[]
  anime?: boolean
  hauteur?: number
  libelle?: string
  onChoix?: (jour: string) => void
}

function pluriel(valeur: number, mot: string): string {
  return `${valeur} ${mot}${valeur > 1 ? 's' : ''}`
}

export default function Histogramme({
  jours,
  fort = -1,
  etiquettes = [],
  anime = false,
  hauteur = 190,
  libelle = 'Ventes jour par jour',
  onChoix,
}: HistogrammeProps) {
  const cadre = useRef<HTMLDivElement>(null)
  const [largeur, setLargeur] = useState(480)

  useEffect(() => {
    const element = cadre.current
    if (!element) {
      return
    }
    const mesurer = () => {
      const mesure = Math.round(element.clientWidth)
      if (mesure > 0) {
        setLargeur(Math.max(280, mesure))
      }
    }
    mesurer()
    window.addEventListener('resize', mesurer)
    return () => window.removeEventListener('resize', mesurer)
  }, [])

  const marge = { haut: 26, bas: 28 }
  const max = Math.max(...jours.map((jour) => jour.valeur), 1)
  const pas = largeur / Math.max(jours.length, 1)
  const epaisseur = Math.min(24, pas * 0.46)
  const bas = hauteur - marge.bas
  const echelle = (valeur: number) => (valeur / max) * (bas - marge.haut)

  function clavier(evenement: KeyboardEvent<SVGRectElement>, jour: JourHistogramme) {
    if (onChoix && !jour.futur && (evenement.key === 'Enter' || evenement.key === ' ')) {
      evenement.preventDefault()
      onChoix(jour.jour)
    }
  }

  return (
    <div ref={cadre}>
      <svg className="histo" viewBox={`0 0 ${largeur} ${hauteur}`} role="img" aria-label={libelle}>
        {[0.5, 1].map((part) => {
          const y = bas - part * (bas - marge.haut)
          return <line key={part} className="grille" x1="0" x2={largeur} y1={y} y2={y} />
        })}
        <line className="base" x1="0" x2={largeur} y1={bas} y2={bas} />
        {jours.map((jour, index) => {
          const x = index * pas + (pas - epaisseur) / 2
          const h = echelle(jour.valeur)
          const y = bas - h
          const r = Math.min(4, h / 2)
          const titre = `${majuscule(nomJour(jour.jour))} ${dateLongue(jour.jour)}`
          const texte = jour.futur
            ? 'Journée à venir'
            : [
                formatXPF(jour.valeur),
                pluriel(jour.commandes, 'commande'),
                jour.retours ? pluriel(jour.retours, 'retour') : '',
              ]
                .filter(Boolean)
                .join(', ')
          const cliquable = Boolean(onChoix) && !jour.futur
          return (
            <g key={jour.jour}>
              <rect
                className="cible"
                x={index * pas}
                y="0"
                width={pas}
                height={hauteur}
                tabIndex={0}
                role={cliquable ? 'button' : undefined}
                data-bulle-titre={titre}
                data-bulle-texte={texte}
                aria-label={`${titre}, ${texte}`}
                style={cliquable ? { cursor: 'pointer' } : undefined}
                onClick={cliquable ? () => onChoix?.(jour.jour) : undefined}
                onKeyDown={(evenement) => clavier(evenement, jour)}
              />
              {jour.futur ? (
                <rect className="vide-jour" x={x} y={bas - 22} width={epaisseur} height="22" rx="4" />
              ) : (
                h > 0 && (
                  <path
                    className={['barre', index === fort ? 'barre-forte' : '', anime ? 'pousse' : '']
                      .filter(Boolean)
                      .join(' ')}
                    d={`M${x} ${bas} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + epaisseur - r} Q${x + epaisseur} ${y} ${x + epaisseur} ${y + r} V${bas} Z`}
                    style={{ pointerEvents: 'none', ['--i' as string]: index }}
                  />
                )
              )}
              {etiquettes.includes(index) && !jour.futur && (
                <text className="valeur" x={x + epaisseur / 2} y={y - 8}>
                  {nombre(jour.valeur)}
                </text>
              )}
              <text
                className={index === fort ? 'jour jour-fort' : 'jour'}
                x={x + epaisseur / 2}
                y={hauteur - 6}
              >
                {`${nomJour(jour.jour).slice(0, 3)}.`}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
