import type { FiltresMouvements } from '../../services/stockService'
import type { Produit } from '../../types/produit'
import type { LigneStock, Mouvement, TypeMouvement } from '../../types/stock'
import { dateCourte, heure, jourDe } from '../../utils/datesAdmin'
import { LIBELLES_MOUVEMENT, LIBELLES_OPERATEUR, libelleQuantiteMouvement } from './libelles'
import Vignette from './Vignette.tsx'

interface JournalMouvementsProps {
  mouvements: Mouvement[]
  articles: LigneStock[]
  produits?: Map<string, Produit>
  filtres: FiltresMouvements
  onFiltres: (filtres: FiltresMouvements) => void
}

function classeQuantite(mouvement: Mouvement): string {
  if (mouvement.quantiteAvant !== undefined && mouvement.quantiteApres !== undefined) {
    return 'num'
  }
  return mouvement.quantite > 0 ? 'num signe-plus' : 'num signe-moins'
}

function JournalMouvements({ mouvements, articles, produits, filtres, onFiltres }: JournalMouvementsProps) {
  function designation(produitId: string): string {
    return articles.find((article) => article.produitId === produitId)?.designation ?? 'Article archivé'
  }

  return (
    <>
      <div className="outils">
        <select
          className="choix-liste"
          aria-label="Article"
          value={filtres.produit ?? ''}
          onChange={(evenement) => onFiltres({ ...filtres, produit: evenement.target.value })}
        >
          <option value="">Tous les articles</option>
          {articles.map((article) => (
            <option key={article.produitId} value={article.produitId}>
              {article.designation}
            </option>
          ))}
        </select>
        <select
          className="choix-liste"
          aria-label="Type de mouvement"
          value={filtres.type ?? ''}
          onChange={(evenement) => onFiltres({ ...filtres, type: evenement.target.value as TypeMouvement | '' })}
        >
          <option value="">Tous les mouvements</option>
          {Object.entries(LIBELLES_MOUVEMENT).map(([valeur, libelle]) => (
            <option key={valeur} value={valeur}>
              {libelle}
            </option>
          ))}
        </select>
        <span className="outils-droite">
          {`${mouvements.length} mouvement${mouvements.length > 1 ? 's' : ''}`}
        </span>
      </div>

      {mouvements.length === 0 ? (
        <p className="vide-liste">Aucun mouvement ne correspond.</p>
      ) : (
        <table className="liste">
          <thead>
            <tr>
              <th scope="col" data-bulle-titre="Date" data-bulle-texte="Jour et heure du mouvement, à l’heure de Tahiti.">
                Date
              </th>
              <th scope="col">Article</th>
              <th
                scope="col"
                className="optionnel"
                data-bulle-titre="Mouvement"
                data-bulle-texte="Entrée : réception fournisseur. Vente : commande d’un client. Retour : article rendu. Remplacement : défectueux échangé contre un neuf. Ajustement : correction d’inventaire ou article déclaré abîmé."
              >
                Mouvement
              </th>
              <th
                scope="col"
                className="num"
                data-bulle-titre="Quantité"
                data-bulle-texte="Exemplaires ajoutés (+) ou retirés (−). Pour une correction d’inventaire : la quantité avant → après le comptage."
              >
                Quantité
              </th>
              <th scope="col" className="optionnel-large">
                Motif
              </th>
              <th
                scope="col"
                className="optionnel"
                data-bulle-titre="Par"
                data-bulle-texte="Qui a provoqué le mouvement : le responsable, un client (commande en ligne) ou le système (opération automatique)."
              >
                Par
              </th>
            </tr>
          </thead>
          <tbody>
            {mouvements.map((mouvement) => {
              const produit = produits?.get(mouvement.produitId)
              return (
                <tr key={mouvement.id}>
                  <td>
                    <span className="article-titre" style={{ fontWeight: 500 }}>
                      {dateCourte(jourDe(mouvement.date))}
                    </span>
                    <span className="article-meta">{heure(mouvement.date)}</span>
                  </td>
                  <td>
                    <span className="article">
                      <Vignette key={produit?.isbn} isbn={produit?.isbn} type={produit?.type} />
                      <span className="article-titre">{designation(mouvement.produitId)}</span>
                    </span>
                  </td>
                  <td className="optionnel">{LIBELLES_MOUVEMENT[mouvement.type]}</td>
                  <td className={classeQuantite(mouvement)}>{libelleQuantiteMouvement(mouvement)}</td>
                  <td className="optionnel-large gris">{mouvement.motif}</td>
                  <td className="optionnel">{LIBELLES_OPERATEUR[mouvement.operateur]}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </>
  )
}

export default JournalMouvements
