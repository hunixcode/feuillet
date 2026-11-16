import type { Vente } from '../../types/vente'
import { formatXPF } from '../../utils/format'
import EnteteInfo from './EnteteInfo.tsx'
import InfoBulle from './InfoBulle.tsx'
import { LIBELLES_OCCASION } from './libelles'

interface DetailVenteProps {
  vente: Vente
}

function DetailVente({ vente }: DetailVenteProps) {
  return (
    <div className="ventes-bloc">
      <dl className="ventes-infos">
        <div>
          <dt>Adresse de livraison</dt>
          <dd>{vente.adresseLivraison || 'Non renseignée'}</dd>
        </div>
        <div>
          <dt>
            <InfoBulle
              libelle="Cadeau"
              info="Une commande passée pour une occasion (Noël, anniversaire, fête) est un cadeau : le client a 1 mois pour la retourner au lieu de 14 jours."
            />
          </dt>
          <dd>
            {vente.occasionCadeau ? LIBELLES_OCCASION[vente.occasionCadeau] : 'Non'}
            {vente.emballageCadeau && ', avec emballage cadeau'}
          </dd>
        </div>
      </dl>

      <div className="ventes-tableau-cadre">
        <table className="ventes-tableau ventes-tableau--lignes">
          <thead>
            <tr>
              <EnteteInfo libelle="Article" info="Article commandé et sa référence, tels qu’au jour de la commande." />
              <EnteteInfo
                libelle="Qté"
                info="Nombre d’exemplaires commandés."
                className="ventes-nombre"
                aDroite
              />
              <EnteteInfo
                libelle="Prix unitaire"
                info="Prix TTC d’un exemplaire au jour de la commande, promotion déduite. Il ne change plus, même si le prix du catalogue change."
                className="ventes-nombre"
                aDroite
              />
              <EnteteInfo
                libelle="TVA"
                info="Taux de TVA de l’article, et montant de TVA compris dans la ligne."
                className="ventes-nombre"
                aDroite
              />
              <EnteteInfo
                libelle="Montant"
                info="Prix unitaire × quantité, TVA comprise."
                className="ventes-nombre"
                aDroite
              />
            </tr>
          </thead>
          <tbody>
            {vente.lignes.map((ligne) => (
              <tr key={ligne.produitId}>
                <td>
                  {ligne.designation}
                  <span className="ventes-secondaire">{ligne.reference}</span>
                </td>
                <td className="ventes-nombre">{ligne.quantite}</td>
                <td className="ventes-nombre">
                  {formatXPF(ligne.prixUnitaire)}
                  {ligne.remise > 0 && <span className="ventes-remise">−{ligne.remise} %</span>}
                </td>
                <td className="ventes-nombre">
                  {ligne.tauxTva} %
                  <span className="ventes-secondaire">{formatXPF(ligne.montantTva)}</span>
                </td>
                <td className="ventes-nombre">{formatXPF(ligne.montant)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ventes-totaux">
        <div>
          <dt>Sous-total des articles</dt>
          <dd>{formatXPF(vente.sousTotal)}</dd>
        </div>
        <div className="ventes-totaux-tva">
          <dt>dont TVA</dt>
          <dd>{formatXPF(vente.montantTva)}</dd>
        </div>
        {vente.fraisEmballage > 0 && (
          <div>
            <dt>Emballage cadeau</dt>
            <dd>{formatXPF(vente.fraisEmballage)}</dd>
          </div>
        )}
        <div>
          <dt>Livraison</dt>
          <dd>{vente.fraisLivraison > 0 ? formatXPF(vente.fraisLivraison) : 'Offerte'}</dd>
        </div>
        <div className="ventes-totaux-total">
          <dt>Total payé</dt>
          <dd>{formatXPF(vente.total)}</dd>
        </div>
      </dl>
    </div>
  )
}

export default DetailVente
