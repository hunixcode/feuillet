import { formatJourCourt, formatXPF } from '../../utils/format'

const LARGEUR = 640
const HAUTEUR = 150
const GAUCHE = 40
const DROITE = LARGEUR - 40
const HAUT = 26
const AXE = 112

export interface PointVentes {
  jour: string
  quantite: number
  montant: number
}

interface CourbeVentesProps {
  description: string
  ventes: PointVentes[]
  jourMarque?: string
}

function CourbeVentes({ description, ventes, jourMarque = '' }: CourbeVentesProps) {
  const plusHaut = Math.max(1, ...ventes.map((vente) => vente.quantite))
  const pas = ventes.length > 1 ? (DROITE - GAUCHE) / (ventes.length - 1) : 0
  const points = ventes.map((vente, index) => ({
    ...vente,
    x: GAUCHE + index * pas,
    y: AXE - (Math.max(vente.quantite, 0) / plusHaut) * (AXE - HAUT),
  }))

  return (
    <>
      <svg
        className="courbe-ventes-trace"
        viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
        role="img"
        aria-label={`Exemplaires vendus chaque jour : ${description}`}
      >
        <line className="courbe-ventes-axe" x1={GAUCHE} x2={DROITE} y1={AXE} y2={AXE} />
        <polyline
          className="courbe-ventes-ligne"
          points={points.map((point) => `${point.x},${point.y}`).join(' ')}
        />
        {points.map((point) => (
          <g
            key={point.jour}
            className={
              point.jour === jourMarque
                ? 'courbe-ventes-point courbe-ventes-point--marque'
                : 'courbe-ventes-point'
            }
          >
            <title>
              {`${formatJourCourt(point.jour)} : ${point.quantite} vendus, ${formatXPF(point.montant)}`}
            </title>
            <circle className="courbe-ventes-cible" cx={point.x} cy={point.y} r={16} />
            <circle className="courbe-ventes-marque" cx={point.x} cy={point.y} r={5} />
            <text className="courbe-ventes-valeur" x={point.x} y={point.y - 12} textAnchor="middle">
              {point.quantite}
            </text>
            <text className="courbe-ventes-jour" x={point.x} y={AXE + 24} textAnchor="middle">
              {formatJourCourt(point.jour)}
            </text>
          </g>
        ))}
      </svg>
      <table className="visuellement-cache">
        <caption>Ventes par jour : {description}</caption>
        <thead>
          <tr>
            <th scope="col">Jour</th>
            <th scope="col">Exemplaires</th>
            <th scope="col">Montant net</th>
          </tr>
        </thead>
        <tbody>
          {ventes.map((vente) => (
            <tr key={vente.jour}>
              <td>{formatJourCourt(vente.jour)}</td>
              <td>{vente.quantite}</td>
              <td>{formatXPF(vente.montant)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

export default CourbeVentes
