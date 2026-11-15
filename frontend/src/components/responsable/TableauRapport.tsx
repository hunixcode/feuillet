import type { Categorie } from '../../types/categorie'
import type { LigneRapport } from '../../types/rapport'
import { formatXPF } from '../../utils/format'
import EnteteInfo from './EnteteInfo.tsx'

const NOMBRE = 'rapports-nombre'
const DEBUT_GROUPE = 'rapports-nombre rapports-debut-groupe'

const COLONNES = [
  { libelle: 'Article', info: 'Désignation de l’article, avec sa référence et sa catégorie.' },
  {
    libelle: 'Exemplaires vendus',
    info: 'Nombre d’exemplaires vendus sur la période, avant les retours.',
    classe: DEBUT_GROUPE,
  },
  {
    libelle: 'Ventes brutes',
    info: 'Montant TTC des exemplaires vendus sur la période, sans les frais d’emballage cadeau ni de livraison.',
    classe: NOMBRE,
  },
  {
    libelle: 'Exemplaires rendus',
    info: 'Exemplaires rapportés par les clients sur la période, puis remboursés ou échangés.',
    classe: DEBUT_GROUPE,
  },
  {
    libelle: 'Montant rendu',
    info: 'Valeur des exemplaires remboursés ou échangés. Elle est déduite des ventes brutes.',
    classe: NOMBRE,
  },
  {
    libelle: 'Remplacés',
    info: 'Exemplaires défectueux remplacés par un neuf. Ils ne changent pas le montant des ventes.',
    classe: NOMBRE,
  },
  {
    libelle: 'Vendus nets',
    info: 'Exemplaires vendus moins exemplaires rendus : ce qui est vraiment parti.',
    classe: DEBUT_GROUPE,
  },
  {
    libelle: 'Montant net',
    info: 'Ventes brutes moins montant rendu : ce que l’article a vraiment rapporté.',
    classe: NOMBRE,
  },
  {
    libelle: 'En stock à la fin',
    info: 'Exemplaires physiquement en magasin le dernier jour de la période.',
    classe: DEBUT_GROUPE,
  },
  {
    libelle: 'Part vendue',
    info: 'Vendus nets sur la période, en pourcentage de la quantité achetée lors du dernier réapprovisionnement. « — » si cette quantité est inconnue.',
    classe: NOMBRE,
  },
]

interface TableauRapportProps {
  produits: LigneRapport[]
  categories: Categorie[]
}

function TableauRapport({ produits, categories }: TableauRapportProps) {
  if (produits.length === 0) {
    return <p className="rapports-vide">Aucune vente ni retour sur cette période.</p>
  }

  function libelle(categorie: string): string {
    return categories.find((element) => element.id === categorie)?.libelle ?? categorie
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
                <span className="rapports-reference">
                  {produit.reference} · {libelle(produit.categorie)}
                </span>
              </td>
              <td className="rapports-nombre rapports-debut-groupe">{produit.quantiteVendue}</td>
              <td className="rapports-nombre">{formatXPF(produit.montantVentes)}</td>
              <td className="rapports-nombre rapports-debut-groupe">{produit.quantiteRetournee}</td>
              <td className="rapports-nombre rapports-retour">
                {produit.montantRetours > 0 ? `− ${formatXPF(produit.montantRetours)}` : '—'}
              </td>
              <td className="rapports-nombre">{produit.quantiteRemplacee}</td>
              <td className="rapports-nombre rapports-debut-groupe">{produit.quantiteNette}</td>
              <td className="rapports-nombre rapports-fort">{formatXPF(produit.montantNet)}</td>
              <td className="rapports-nombre rapports-debut-groupe">{produit.stockRestant}</td>
              <td className="rapports-nombre">
                {produit.pourcentageVendu === null ? '—' : `${produit.pourcentageVendu} %`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TableauRapport
