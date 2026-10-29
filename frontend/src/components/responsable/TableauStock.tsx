import type { LigneStock } from '../../types/stock'
import { libelleEtatStock } from './libelles'

interface TableauStockProps {
  lignes: LigneStock[]
  selection?: string
  onSelection: (ligne: LigneStock) => void
}

function TableauStock({ lignes, selection, onSelection }: TableauStockProps) {
  return (
    <div className="stock-tableau-cadre">
      <table className="stock-tableau">
        <thead>
          <tr>
            <th scope="col">Article</th>
            <th scope="col" className="stock-nombre">En rayon</th>
            <th scope="col" className="stock-nombre">Mis de côté</th>
            <th scope="col" className="stock-nombre">Vendable</th>
            <th scope="col" className="stock-nombre">Défectueux</th>
            <th scope="col">État</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne) => (
            <tr
              key={ligne.produitId}
              aria-current={selection === ligne.produitId ? 'true' : undefined}
            >
              <td>
                <button
                  type="button"
                  className="stock-lien"
                  onClick={() => onSelection(ligne)}
                >
                  {ligne.designation}
                </button>
                <span className="stock-reference">{ligne.reference}</span>
              </td>
              <td className="stock-nombre">{ligne.quantitePhysique}</td>
              <td className="stock-nombre">{ligne.quantiteMiseDeCote}</td>
              <td className="stock-nombre">
                <strong>{ligne.quantiteVendable}</strong>
              </td>
              <td className="stock-nombre">{ligne.quantiteDefectueuse}</td>
              <td>
                <span
                  className={
                    ligne.quantiteVendable === 0 ? 'stock-etat stock-etat--epuise' : 'stock-etat'
                  }
                >
                  {libelleEtatStock(ligne)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TableauStock
