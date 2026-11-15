import type { ProduitAReapprovisionner } from '../../types/reappro'
import EnteteInfo from './EnteteInfo.tsx'

const COLONNES = [
  { libelle: 'Article', info: 'Désignation de l’article et sa référence.' },
  {
    libelle: 'Déjà vendu',
    info: 'Part de la quantité achetée à l’origine qui n’est plus vendable, depuis l’achat.',
  },
  {
    libelle: 'Vendable',
    info: 'Exemplaires en rayon moins ceux mis de côté pour des clients.',
    classe: 'rapports-nombre',
  },
  {
    libelle: 'Acheté à l’origine',
    info: 'Quantité reçue lors de la dernière commande fournisseur complète, ou à défaut le stock de départ.',
    classe: 'rapports-nombre',
  },
  {
    libelle: 'Seuil d’alerte',
    info: 'L’article est à recommander quand son stock vendable passe sous ce pourcentage de la quantité achetée.',
    classe: 'rapports-nombre',
  },
  {
    libelle: 'En commande',
    info: 'Exemplaires déjà commandés au fournisseur et pas encore reçus, pour ne pas commander deux fois.',
    classe: 'rapports-nombre',
  },
]

interface TableauReapprovisionnementProps {
  produits: ProduitAReapprovisionner[]
}

function TableauReapprovisionnement({ produits }: TableauReapprovisionnementProps) {
  if (produits.length === 0) {
    return <p className="rapports-vide">Aucun article n’est sous son seuil d’alerte.</p>
  }

  return (
    <div className="rapports-tableau-cadre">
      <table className="rapports-tableau">
        <thead>
          <tr>
            {COLONNES.map((colonne) => (
              <EnteteInfo
                key={colonne.libelle}
                libelle={colonne.libelle}
                info={colonne.info}
                className={colonne.classe}
                aDroite={Boolean(colonne.classe)}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {produits.map((produit) => (
            <tr key={produit.produitId}>
              <td>
                {produit.designation}
                <span className="rapports-reference">{produit.reference}</span>
              </td>
              <td>
                <span className="rapports-part">
                  <span className="rapports-part-jauge" aria-hidden="true">
                    <span style={{ width: `${Math.min(produit.pourcentageVendu, 100)}%` }} />
                  </span>
                  {produit.pourcentageVendu} %
                </span>
              </td>
              <td className="rapports-nombre">
                {produit.quantiteVendable === 0 ? (
                  <span className="rapports-epuise">Épuisé</span>
                ) : (
                  produit.quantiteVendable
                )}
              </td>
              <td className="rapports-nombre">{produit.quantiteAcheteeOrigine}</td>
              <td className="rapports-nombre">{produit.seuilAlerte} %</td>
              <td className="rapports-nombre">
                {produit.quantiteEnCommande > 0 ? produit.quantiteEnCommande : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TableauReapprovisionnement
