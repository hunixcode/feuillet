import type { Vente } from '../../types/vente'
import { formatDateHeure, formatXPF } from '../../utils/format'
import EnteteInfo from './EnteteInfo.tsx'
import { LIBELLES_OCCASION, LIBELLES_STATUT_VENTE } from './libelles'

interface TableauVentesProps {
  ventes: Vente[]
  selection?: string
  onSelection: (vente: Vente) => void
}

function TableauVentes({ ventes, selection, onSelection }: TableauVentesProps) {
  return (
    <div className="ventes-tableau-cadre">
      <table className="ventes-tableau">
        <thead>
          <tr>
            <EnteteInfo
              libelle="Date"
              info="Jour et heure où le client a validé sa commande en ligne, à l’heure de Tahiti. Cliquez dessus pour ouvrir la commande."
            />
            <EnteteInfo libelle="Client" info="Nom et e-mail du client au moment de la commande." />
            <EnteteInfo
              libelle="Adresse de livraison"
              info="Adresse où le colis doit être envoyé. Toutes les commandes sont livrées : il n’y a pas de vente au comptoir."
            />
            <EnteteInfo
              libelle="Total"
              info="Montant payé par le client : articles TTC, plus les frais de livraison et d’emballage cadeau."
              className="ventes-nombre"
              aDroite
            />
            <EnteteInfo
              libelle="Statut"
              info="À préparer : le colis n’est pas encore parti. Expédiée : le colis a été confié au transporteur ; les retours deviennent possibles."
            />
          </tr>
        </thead>
        <tbody>
          {ventes.map((vente) => (
            <tr key={vente.id} aria-current={selection === vente.id ? 'true' : undefined}>
              <td>
                <button type="button" className="ventes-lien" onClick={() => onSelection(vente)}>
                  {formatDateHeure(vente.date)}
                </button>
                {vente.occasionCadeau && (
                  <span className="ventes-cadeau">Cadeau · {LIBELLES_OCCASION[vente.occasionCadeau]}</span>
                )}
              </td>
              <td>
                {vente.client.nom}
                <span className="ventes-secondaire">{vente.client.email}</span>
              </td>
              <td className="ventes-adresse">{vente.adresseLivraison || '—'}</td>
              <td className="ventes-nombre">{formatXPF(vente.total)}</td>
              <td>
                <span className={`ventes-statut ventes-statut--${vente.statut}`}>
                  {LIBELLES_STATUT_VENTE[vente.statut]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TableauVentes
