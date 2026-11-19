import type { Demande } from '../../types/demande'
import { formatJourTahiti } from '../../utils/format'
import EnteteInfo from './EnteteInfo.tsx'
import { LIBELLES_STATUT_DEMANDE } from './libelles'

interface TableauDemandesProps {
  demandes: Demande[]
  selection?: string
  onSelection: (demande: Demande) => void
}

export function OrigineDemande({ demande }: { demande: Demande }) {
  if (!demande.produitId) {
    return <span className="demandes-tag demandes-tag--hors">Absent du catalogue</span>
  }
  if (demande.statut === 'en_attente') {
    return <span className="demandes-tag">Article épuisé</span>
  }
  return null
}

function TableauDemandes({ demandes, selection, onSelection }: TableauDemandesProps) {
  return (
    <div className="demandes-tableau-cadre">
      <table className="demandes-tableau">
        <thead>
          <tr>
            <EnteteInfo
              libelle="Article demandé"
              info="« Article épuisé » : l’article est au catalogue mais plus en stock. « Absent du catalogue » : le client demande un livre que la librairie ne vend pas encore."
            />
            <EnteteInfo libelle="Client" info="Le client qui a fait la demande depuis son compte." />
            <EnteteInfo
              libelle="Quantité"
              info="Nombre d’exemplaires que le client souhaite. Une demande n’est pas une vente : il n’a encore rien payé."
              className="demandes-nombre"
              aDroite
            />
            <EnteteInfo libelle="Demandée le" info="Date à laquelle le client a fait la demande." />
            <EnteteInfo
              libelle="Statut"
              info="En attente : l’article n’est pas encore arrivé. Mise de côté : l’article est arrivé et réservé au client jusqu’à la date limite. Commandée : le client l’a acheté. Expirée : il ne l’a pas acheté à temps. Annulée : il a retiré sa demande."
            />
          </tr>
        </thead>
        <tbody>
          {demandes.map((demande) => (
            <tr key={demande.id} aria-current={demande.id === selection ? 'true' : undefined}>
              <td>
                <button type="button" className="demandes-lien" onClick={() => onSelection(demande)}>
                  {demande.titre}
                </button>
                {(demande.auteur || demande.isbn) && (
                  <span className="demandes-secondaire">
                    {[demande.auteur, demande.isbn && `ISBN ${demande.isbn}`].filter(Boolean).join(' · ')}
                  </span>
                )}
                <OrigineDemande demande={demande} />
              </td>
              <td>
                {demande.client?.nom ?? 'Client inconnu'}
                {demande.client?.email && <span className="demandes-secondaire">{demande.client.email}</span>}
              </td>
              <td className="demandes-nombre">{demande.quantiteSouhaitee}</td>
              <td>{formatJourTahiti(demande.date)}</td>
              <td>
                <span className={`demandes-statut demandes-statut--${demande.statut}`}>
                  {LIBELLES_STATUT_DEMANDE[demande.statut]}
                </span>
                {demande.statut === 'mise_de_cote' && demande.miseDeCote && (
                  <span className="demandes-secondaire">
                    {demande.miseDeCote.quantite} réservé{demande.miseDeCote.quantite > 1 ? 's' : ''} jusqu’au{' '}
                    {formatJourTahiti(demande.miseDeCote.dateLimite)}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TableauDemandes
