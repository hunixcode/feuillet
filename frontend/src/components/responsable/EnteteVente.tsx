import type { Vente } from '../../types/vente'
import { formatDateHeure } from '../../utils/format'
import Button from '../common/Button.tsx'
import { LIBELLES_STATUT_VENTE } from './libelles'

interface EnteteVenteProps {
  vente: Vente
  expedition: boolean
  onExpedier: () => void
}

function EnteteVente({ vente, expedition, onExpedier }: EnteteVenteProps) {
  return (
    <div className="ventes-entete-vente">
      <p className="ventes-surtitre">Commande du {formatDateHeure(vente.date)}</p>
      <h2>{vente.client.nom}</h2>
      <p className="ventes-secondaire">{vente.client.email}</p>
      <div className="ventes-statut-ligne">
        <span className={`ventes-statut ventes-statut--${vente.statut}`}>
          {LIBELLES_STATUT_VENTE[vente.statut]}
          {vente.dateExpedition && ` le ${formatDateHeure(vente.dateExpedition)}`}
        </span>
        {vente.statut === 'a_preparer' && (
          <Button type="button" loading={expedition} onClick={onExpedier}>
            Marquer comme expédiée
          </Button>
        )}
      </div>
    </div>
  )
}

export default EnteteVente
