import type { LigneStock } from '../../types/stock'
import EnteteInfo from './EnteteInfo.tsx'
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
            <EnteteInfo
              libelle="Article"
              info="Désignation et référence de l’article. Cliquez sur son nom pour voir ses mouvements et corriger son stock."
            />
            <EnteteInfo
              libelle="En rayon"
              info="Exemplaires physiquement en magasin, mises de côté comprises. Les défectueux ne sont pas comptés ici."
              className="stock-nombre"
              aDroite
            />
            <EnteteInfo
              libelle="Mis de côté"
              info="Exemplaires réservés pour des clients qui les avaient demandés. Ils sont en rayon mais ne peuvent pas être vendus à quelqu’un d’autre."
              className="stock-nombre"
              aDroite
            />
            <EnteteInfo
              libelle="Vendable"
              info="En rayon moins mis de côté : ce qui peut encore être commandé par les clients."
              className="stock-nombre"
              aDroite
            />
            <EnteteInfo
              libelle="Défectueux"
              info="Exemplaires abîmés, rangés à part. Ils ne sont jamais vendables et attendent d’être renvoyés au fournisseur ou détruits."
              className="stock-nombre"
              aDroite
            />
            <EnteteInfo
              libelle="État"
              info="« Disponible » s’il reste au moins un exemplaire vendable, sinon « Épuisé »."
            />
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
