import type { CommandeFournisseur } from '../../types/reappro'
import { formatJourCourt, formatJourTahiti } from '../../utils/format'
import EnteteInfo from './EnteteInfo.tsx'
import { LIBELLES_STATUT_COMMANDE, enRetard, restantARecevoir } from './libelles'

interface TableauCommandesFournisseurProps {
  commandes: CommandeFournisseur[]
  aujourdhui: string
  selection?: string
  onSelection: (commande: CommandeFournisseur) => void
}

function TableauCommandesFournisseur({
  commandes,
  aujourdhui,
  selection,
  onSelection,
}: TableauCommandesFournisseurProps) {
  return (
    <div className="commandes-tableau-cadre">
      <table className="commandes-tableau">
        <thead>
          <tr>
            <EnteteInfo
              libelle="Article"
              info="Article commandé et sa référence. Cliquez dessus pour voir le détail de la commande et enregistrer une réception."
            />
            <EnteteInfo libelle="Fournisseur" info="Fournisseur à qui l’article a été commandé." />
            <EnteteInfo
              libelle="Commandés"
              info="Nombre d’exemplaires demandés au fournisseur."
              className="commandes-nombre"
              aDroite
            />
            <EnteteInfo
              libelle="Reçus"
              info="Exemplaires déjà arrivés en bon état et entrés en stock. Les exemplaires abîmés à la livraison ne sont pas comptés."
              className="commandes-nombre"
              aDroite
            />
            <EnteteInfo
              libelle="Encore attendus"
              info="Commandés moins reçus : les exemplaires que le fournisseur doit encore livrer."
              className="commandes-nombre"
              aDroite
            />
            <EnteteInfo
              libelle="Arrivée prévue"
              info="Date à laquelle le fournisseur doit livrer. « En retard » si elle est passée et que tout n’est pas arrivé."
            />
            <EnteteInfo
              libelle="Statut"
              info="En cours : rien n’est arrivé. Partiellement reçue : une partie est arrivée. Reçue : tout est arrivé."
            />
            <EnteteInfo
              libelle="Commandée le"
              info="Date à laquelle la commande a été passée."
              aDroite
            />
          </tr>
        </thead>
        <tbody>
          {commandes.map((commande) => {
            const restant = restantARecevoir(commande)
            const retard = enRetard(commande, aujourdhui)
            return (
              <tr
                key={commande.id}
                aria-current={selection === commande.id ? 'true' : undefined}
              >
                <td>
                  <button
                    type="button"
                    className="commandes-lien"
                    onClick={() => onSelection(commande)}
                  >
                    {commande.designation}
                  </button>
                  <span className="commandes-reference">{commande.reference}</span>
                </td>
                <td>{commande.fournisseur.nom}</td>
                <td className="commandes-nombre">{commande.quantiteCommandee}</td>
                <td className="commandes-nombre">{commande.quantiteRecue}</td>
                <td className="commandes-nombre">
                  {restant > 0 ? <strong>{restant}</strong> : '—'}
                </td>
                <td>
                  {commande.statut === 'recue' ? (
                    <span className="commandes-discret">{formatJourCourt(commande.dateArriveePrevue)}</span>
                  ) : (
                    <span className={retard ? 'commandes-date commandes-date--retard' : 'commandes-date'}>
                      {formatJourCourt(commande.dateArriveePrevue)}
                      {retard && <span className="commandes-retard">En retard</span>}
                    </span>
                  )}
                </td>
                <td>
                  <span className={`commandes-statut commandes-statut--${commande.statut}`}>
                    {LIBELLES_STATUT_COMMANDE[commande.statut]}
                  </span>
                </td>
                <td className="commandes-discret">{formatJourTahiti(commande.date)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default TableauCommandesFournisseur
