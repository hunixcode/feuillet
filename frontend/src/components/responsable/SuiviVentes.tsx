import type { Ref } from 'react'
import type { Categorie } from '../../types/categorie'
import ErrorMessage from '../common/ErrorMessage.tsx'
import CourbeVentes, { type PointVentes } from './CourbeVentes.tsx'

export interface ArticleSuivi {
  produitId: string
  designation: string
}

interface SuiviVentesProps {
  choix: string
  onChoix: (choix: string) => void
  categories: Categorie[]
  articles: ArticleSuivi[]
  ventes: PointVentes[] | null
  erreur?: string
  jourMarque?: string
  ref?: Ref<HTMLElement>
}

function SuiviVentes({
  choix,
  onChoix,
  categories,
  articles,
  ventes,
  erreur = '',
  jourMarque,
  ref,
}: SuiviVentesProps) {
  const [genre, identifiant] = choix.split(':')
  const description =
    genre === 'categorie'
      ? `catégorie ${categories.find((categorie) => categorie.id === identifiant)?.libelle ?? identifiant}`
      : genre === 'produit'
        ? (articles.find((article) => article.produitId === identifiant)?.designation ?? identifiant)
        : 'toutes les ventes'

  return (
    <section ref={ref} className="suivi-ventes" aria-labelledby="titre-suivi-ventes">
      <div className="suivi-ventes-entete">
        <h3 id="titre-suivi-ventes">Évolution sur la semaine</h3>
        <label className="suivi-ventes-choix">
          <span>Afficher</span>
          <select value={choix} onChange={(evenement) => onChoix(evenement.target.value)}>
            <option value="">Toutes les ventes</option>
            {categories.length > 0 && (
              <optgroup label="Par catégorie">
                {categories.map((categorie) => (
                  <option key={categorie.id} value={`categorie:${categorie.id}`}>
                    {categorie.libelle}
                  </option>
                ))}
              </optgroup>
            )}
            {articles.length > 0 && (
              <optgroup label="Par article">
                {articles.map((article) => (
                  <option key={article.produitId} value={`produit:${article.produitId}`}>
                    {article.designation}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
      </div>
      {erreur ? (
        <ErrorMessage>{erreur}</ErrorMessage>
      ) : ventes ? (
        <CourbeVentes description={description} ventes={ventes} jourMarque={jourMarque} />
      ) : (
        <p className="suivi-ventes-attente" role="status">
          Chargement de la courbe…
        </p>
      )}
      <p className="courbe-ventes-legende">
        Exemplaires vendus, retours déduits. Survolez un point pour voir le montant.
      </p>
    </section>
  )
}

export default SuiviVentes
