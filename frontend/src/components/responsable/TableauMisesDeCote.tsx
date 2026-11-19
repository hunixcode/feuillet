import type { Demande } from '../../types/demande'
import { formatJourTahiti } from '../../utils/format'
import EnteteInfo from './EnteteInfo.tsx'

interface TableauMisesDeCoteProps {
  demandes: Demande[]
  selection?: string
  onSelection: (demande: Demande) => void
}

function TableauMisesDeCote({ demandes, selection, onSelection }: TableauMisesDeCoteProps) {
  return (
    <div className="demandes-tableau-cadre">
      <table className="demandes-tableau">
        <thead>
          <tr>
            <EnteteInfo libelle="Article" info="L’article arrivé et réservé pour le client." />
            <EnteteInfo libelle="Client" info="Le client pour qui l’article est réservé." />
            <EnteteInfo
              libelle="Réservés"
              info="Exemplaires mis de côté, sur le nombre demandé. Il peut y en avoir moins si la livraison ne suffisait pas pour tout le monde."
              className="demandes-nombre"
              aDroite
            />
            <EnteteInfo
              libelle="Date limite"
              info="Dernier jour pour que le client commande. Ensuite, la mise de côté expire seule et les exemplaires redeviennent vendables à tous."
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
              </td>
              <td>{demande.client?.nom ?? 'Client inconnu'}</td>
              <td className="demandes-nombre">
                {demande.miseDeCote?.quantite ?? 0} sur {demande.quantiteSouhaitee}
              </td>
              <td>{demande.miseDeCote ? formatJourTahiti(demande.miseDeCote.dateLimite) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TableauMisesDeCote
