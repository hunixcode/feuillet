import { formatJourCourt, formatXPF } from '../../utils/format'

export interface VenteDuJour {
  jour: string
  net: number
}

interface GraphiqueVentesProps {
  ventes: VenteDuJour[]
  selection: string
  onSelection: (jour: string) => void
}

function GraphiqueVentes({ ventes, selection, onSelection }: GraphiqueVentesProps) {
  const plusFort = Math.max(...ventes.map((vente) => vente.net))

  if (plusFort <= 0) {
    return <p className="graphique-ventes-vide">Aucune vente sur la période.</p>
  }

  function classes(vente: VenteDuJour): string {
    return [
      'graphique-ventes-jour',
      vente.net === plusFort && 'graphique-ventes-jour--fort',
      vente.jour === selection && 'graphique-ventes-jour--choisi',
    ]
      .filter(Boolean)
      .join(' ')
  }

  return (
    <figure className="graphique-ventes">
      <ol className="graphique-ventes-barres" aria-label="Ventes nettes par jour">
        {ventes.map((vente) => (
          <li key={vente.jour}>
            <button
              type="button"
              className={classes(vente)}
              aria-pressed={vente.jour === selection}
              onClick={() => onSelection(vente.jour === selection ? '' : vente.jour)}
            >
              <span className="graphique-ventes-zone">
                <span
                  className="graphique-ventes-barre"
                  style={{ height: `${(Math.max(vente.net, 0) / plusFort) * 100}%` }}
                >
                  <span className="graphique-ventes-valeur">{formatXPF(vente.net)}</span>
                </span>
              </span>
              <span className="graphique-ventes-date">{formatJourCourt(vente.jour)}</span>
            </button>
          </li>
        ))}
      </ol>
      <figcaption className="graphique-ventes-legende">
        Cliquez sur un jour pour voir ses ventes en détail.
      </figcaption>
    </figure>
  )
}

export default GraphiqueVentes
