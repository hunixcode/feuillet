import Select from '../common/Select.tsx'
import type { FiltresMouvements } from '../../services/stockService'
import type { LigneStock, Mouvement, TypeMouvement } from '../../types/stock'
import { formatDateHeure } from '../../utils/format'
import {
  LIBELLES_MOUVEMENT,
  LIBELLES_OPERATEUR,
  libelleQuantiteMouvement,
} from './libelles'
import EnteteInfo from './EnteteInfo.tsx'

interface JournalMouvementsProps {
  mouvements: Mouvement[]
  articles: LigneStock[]
  filtres: FiltresMouvements
  onFiltres: (filtres: FiltresMouvements) => void
}

function JournalMouvements({ mouvements, articles, filtres, onFiltres }: JournalMouvementsProps) {
  function designation(produitId: string): string {
    return articles.find((article) => article.produitId === produitId)?.designation ?? 'Article archivé'
  }

  return (
    <div className="stock-journal">
      <div className="stock-filtres">
        <Select
          label="Article"
          value={filtres.produit ?? ''}
          onChange={(evenement) => onFiltres({ ...filtres, produit: evenement.target.value })}
        >
          <option value="">Tous les articles</option>
          {articles.map((article) => (
            <option key={article.produitId} value={article.produitId}>
              {article.designation}
            </option>
          ))}
        </Select>
        <Select
          label="Type de mouvement"
          value={filtres.type ?? ''}
          onChange={(evenement) =>
            onFiltres({ ...filtres, type: evenement.target.value as TypeMouvement | '' })
          }
        >
          <option value="">Tous les types</option>
          {Object.entries(LIBELLES_MOUVEMENT).map(([valeur, libelle]) => (
            <option key={valeur} value={valeur}>
              {libelle}
            </option>
          ))}
        </Select>
      </div>

      {mouvements.length === 0 ? (
        <p className="stock-vide">Aucun mouvement ne correspond.</p>
      ) : (
        <div className="stock-tableau-cadre">
          <table className="stock-tableau">
            <thead>
              <tr>
                <EnteteInfo
                  libelle="Date"
                  info="Jour et heure du mouvement, à l’heure de Tahiti."
                />
                <EnteteInfo
                  libelle="Article"
                  info="Article dont le stock a changé."
                />
                <EnteteInfo
                  libelle="Type"
                  info="Entrée : réception fournisseur. Vente : commande d’un client. Retour : article rendu. Remplacement : défectueux échangé contre un neuf. Ajustement : correction d’inventaire ou article déclaré abîmé."
                />
                <EnteteInfo
                  libelle="Quantité"
                  info="Exemplaires ajoutés (+) ou retirés (−) du stock. Pour une correction d’inventaire : la quantité avant → après le comptage."
                  className="stock-nombre"
                  aDroite
                />
                <EnteteInfo
                  libelle="Motif"
                  info="Raison du mouvement, par exemple la commande ou la réception concernée."
                />
                <EnteteInfo
                  libelle="Opérateur"
                  info="Qui a provoqué le mouvement : le responsable, un client (commande en ligne) ou le système (opération automatique, sans intervention de personne)."
                />
              </tr>
            </thead>
            <tbody>
              {mouvements.map((mouvement) => (
                <tr key={mouvement.id}>
                  <td>{formatDateHeure(mouvement.date)}</td>
                  <td>{designation(mouvement.produitId)}</td>
                  <td>{LIBELLES_MOUVEMENT[mouvement.type]}</td>
                  <td className="stock-nombre">{libelleQuantiteMouvement(mouvement)}</td>
                  <td>{mouvement.motif}</td>
                  <td>{LIBELLES_OPERATEUR[mouvement.operateur]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default JournalMouvements
