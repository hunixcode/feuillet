import type { LigneRapport } from '../../types/rapport'
import { formatXPF } from '../../utils/format'
import type { PointVentes } from './CourbeVentes.tsx'
import EnteteInfo from './EnteteInfo.tsx'

interface TableauVentesProduitsProps {
  produits: LigneRapport[]
  evolutions?: Record<string, PointVentes[]>
  selection?: string
  onSelection?: (produitId: string) => void
}

function MiniCourbe({ ventes }: { ventes: PointVentes[] }) {
  const plusHaut = Math.max(1, ...ventes.map((vente) => vente.quantite))
  const pas = ventes.length > 1 ? 76 / (ventes.length - 1) : 0
  const points = ventes
    .map((vente, index) => `${2 + index * pas},${22 - (Math.max(vente.quantite, 0) / plusHaut) * 20}`)
    .join(' ')
  return (
    <svg className="ventes-produits-mini" viewBox="0 0 80 24" aria-hidden="true">
      <polyline points={points} />
    </svg>
  )
}

function TableauVentesProduits({
  produits,
  evolutions,
  selection,
  onSelection,
}: TableauVentesProduitsProps) {
  const lignes = produits.filter(
    (produit) => produit.quantiteVendue > 0 || produit.quantiteRetournee > 0,
  )
  const plusFort = Math.max(0, ...lignes.map((produit) => produit.montantNet))
  const avecCourbe = Boolean(evolutions && onSelection)

  if (lignes.length === 0) {
    return <p className="graphique-ventes-vide">Aucun article vendu sur la période.</p>
  }

  return (
    <div className="ventes-produits-cadre">
      {avecCourbe && (
        <p className="ventes-produits-aide">
          Cliquez sur un article pour afficher sa courbe dans l’évolution ci-dessus.
        </p>
      )}
      <table className="ventes-produits">
        <thead>
          <tr>
            <EnteteInfo
              libelle="Article"
              info="Désignation et référence de l’article. Cliquez sur son nom pour afficher sa courbe dans l’évolution au-dessus."
            />
            {avecCourbe && (
              <EnteteInfo
                libelle="Tendance"
                info="Petite courbe des exemplaires vendus nets chaque jour de la semaine. Cliquez dessus pour l’agrandir."
              />
            )}
            <EnteteInfo
              libelle="Vendus"
              info="Exemplaires vendus sur la période, avant les retours."
              className="ventes-produits-nombre"
              aDroite
            />
            <EnteteInfo
              libelle="Retournés"
              info="Exemplaires rapportés par les clients sur la période."
              className="ventes-produits-nombre"
              aDroite
            />
            <EnteteInfo
              libelle="Net"
              info="Vendus moins retournés : les exemplaires vraiment partis."
              className="ventes-produits-nombre"
              aDroite
            />
            <EnteteInfo
              libelle="Montant net"
              info="Montant des ventes moins celui des retours. La barre compare l’article au meilleur de la période."
              className="ventes-produits-montant"
              aDroite
            />
          </tr>
        </thead>
        <tbody>
          {lignes.map((produit) => {
            const choisi = produit.produitId === selection
            const evolution = evolutions?.[produit.produitId]
            return (
              <tr
                key={produit.produitId}
                className={choisi ? 'ventes-produits-choisi' : undefined}
                aria-current={choisi ? 'true' : undefined}
              >
                <td>
                  {avecCourbe ? (
                    <button
                      type="button"
                      className="ventes-produits-lien"
                      aria-pressed={choisi}
                      onClick={() => onSelection?.(produit.produitId)}
                    >
                      {produit.designation}
                    </button>
                  ) : (
                    produit.designation
                  )}
                  <span className="ventes-produits-reference">{produit.reference}</span>
                </td>
                {avecCourbe && (
                  <td>
                    {evolution && (
                      <button
                        type="button"
                        className="ventes-produits-evolution"
                        aria-label={`Afficher la courbe de ${produit.designation}`}
                        onClick={() => onSelection?.(produit.produitId)}
                      >
                        <MiniCourbe ventes={evolution} />
                      </button>
                    )}
                  </td>
                )}
                <td className="ventes-produits-nombre">{produit.quantiteVendue}</td>
                <td className="ventes-produits-nombre">{produit.quantiteRetournee}</td>
                <td className="ventes-produits-nombre">{produit.quantiteNette}</td>
                <td className="ventes-produits-montant">
                  <span className="ventes-produits-jauge" aria-hidden="true">
                    <span
                      style={{
                        width: `${plusFort > 0 ? (Math.max(produit.montantNet, 0) / plusFort) * 100 : 0}%`,
                      }}
                    />
                  </span>
                  {formatXPF(produit.montantNet)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default TableauVentesProduits
