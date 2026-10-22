import { useEffect, useState } from 'react'
import ErrorMessage from '../common/ErrorMessage.tsx'
import Loader from '../common/Loader.tsx'
import { historiquePrix } from '../../services/catalogueAdminService'
import type { EntreePrix, Promotion } from '../../types/produit'
import { messageErreur } from '../../utils/erreurs'
import { formatDate, formatXPF } from '../../utils/format'

const LARGEUR = 360
const HAUTEUR = 200
const GAUCHE = 24
const DROITE = LARGEUR - 16
const FIN_TRACE = DROITE - 36
const HAUT = 44
const AXE = 150
const ECART_MOIS = 40

const formatPrix = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const formatMois = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
const formatMoisAnnee = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' })

interface CourbePrixProps {
  produitId: string
  prixActuel: number
  promotion?: Promotion
  prixPromotion?: number
}

interface Point {
  x: number
  y: number
  prix: number
  date: Date
}

function prixCourt(prix: number): string {
  return formatPrix.format(prix).replace(/[  ]/g, ' ')
}

function dessiner(entrees: EntreePrix[], promotion?: Promotion, prixPromotion?: number) {
  const dates = entrees.map((entree) => new Date(entree.date))
  const debutPromotion = promotion ? new Date(`${promotion.debut}T00:00:00`) : undefined
  const debut = dates[0].getTime()
  const fin = Math.max(Date.now(), ...dates.map((date) => date.getTime()))
  const valeurs = entrees.map((entree) => entree.prix)
  if (promotion && prixPromotion !== undefined) {
    valeurs.push(prixPromotion)
  }
  const bas = Math.min(...valeurs)
  const haut = Math.max(...valeurs)

  const x = (temps: number) =>
    fin === debut ? GAUCHE : GAUCHE + ((temps - debut) / (fin - debut)) * (FIN_TRACE - GAUCHE)
  const y = (prix: number) =>
    haut === bas ? (HAUT + AXE) / 2 : AXE - 12 - ((prix - bas) / (haut - bas)) * (AXE - 12 - HAUT)

  const points: Point[] = entrees.map((entree, index) => ({
    x: x(dates[index].getTime()),
    y: y(entree.prix),
    prix: entree.prix,
    date: dates[index],
  }))

  const pointPromotion =
    promotion && prixPromotion !== undefined && debutPromotion
      ? {
          x: x(Math.min(Math.max(debutPromotion.getTime(), debut), fin)),
          y: y(prixPromotion),
          prix: prixPromotion,
          date: debutPromotion,
        }
      : undefined

  const finCatalogue = pointPromotion ? pointPromotion.x : DROITE
  const trace = points.flatMap((point, index) => {
    const suivant = points[index + 1]
    const xFin = suivant ? suivant.x : finCatalogue
    return [`${point.x},${point.y}`, `${xFin},${point.y}`]
  })

  const plusieursAnnees =
    new Set([...points, ...(pointPromotion ? [pointPromotion] : [])].map((p) => p.date.getFullYear()))
      .size > 1
  const mois: { x: number; texte: string }[] = []
  for (const point of [...points, ...(pointPromotion ? [pointPromotion] : [])]) {
    const precedent = mois[mois.length - 1]
    if (!precedent || point.x - precedent.x >= ECART_MOIS) {
      mois.push({
        x: point.x,
        texte: (plusieursAnnees ? formatMoisAnnee : formatMois).format(point.date),
      })
    }
  }

  const etiquettes = points.filter(
    (point, index) => index === 0 || point.prix !== points[index - 1].prix,
  )

  return {
    trace: trace.join(' '),
    points: etiquettes,
    dernier: points[points.length - 1],
    pointPromotion,
    mois,
  }
}

function CourbePrix({ produitId, prixActuel, promotion, prixPromotion }: CourbePrixProps) {
  const [entrees, setEntrees] = useState<EntreePrix[] | null>(null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let actif = true
    historiquePrix(produitId)
      .then((liste) => {
        if (actif) {
          setEntrees(liste)
        }
      })
      .catch((probleme: unknown) => {
        if (actif) {
          setErreur(messageErreur(probleme))
        }
      })
    return () => {
      actif = false
    }
  }, [produitId, prixActuel])

  const dessin = entrees && entrees.length > 0 ? dessiner(entrees, promotion, prixPromotion) : null

  return (
    <section className="catalogue-bloc" aria-labelledby="titre-courbe">
      <h3 id="titre-courbe">Historique du prix</h3>
      {erreur && <ErrorMessage>{erreur}</ErrorMessage>}
      {!erreur && entrees === null && <Loader />}
      {entrees?.length === 0 && <p className="catalogue-vide">Aucun prix enregistré.</p>}
      {dessin && entrees && (
        <figure className="catalogue-courbe-cadre">
          <svg
            className="catalogue-courbe"
            viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
            role="img"
            aria-label={`Historique du prix : ${entrees.length} prix enregistrés${promotion ? ', promotion en cours' : ''}`}
          >
            <line className="catalogue-courbe-axe" x1={GAUCHE} x2={DROITE} y1={AXE} y2={AXE} />
            <polyline className="catalogue-courbe-catalogue" points={dessin.trace} />
            {dessin.pointPromotion && (
              <polyline
                className="catalogue-courbe-promotion"
                points={`${dessin.pointPromotion.x},${dessin.dernier.y} ${dessin.pointPromotion.x},${dessin.pointPromotion.y} ${DROITE},${dessin.pointPromotion.y}`}
              />
            )}
            {dessin.points.map((point) => (
              <g key={point.date.toISOString()}>
                <circle className="catalogue-courbe-point" cx={point.x} cy={point.y} r={4} />
                <text
                  className="catalogue-courbe-prix"
                  x={point.x > FIN_TRACE - 40 ? point.x - 6 : point.x + 2}
                  y={point.y - 12}
                  textAnchor={point.x > FIN_TRACE - 40 ? 'end' : 'start'}
                >
                  {prixCourt(point.prix)}
                </text>
              </g>
            ))}
            {dessin.pointPromotion && (
              <g>
                <circle
                  className="catalogue-courbe-point catalogue-courbe-point--promotion"
                  cx={dessin.pointPromotion.x}
                  cy={dessin.pointPromotion.y}
                  r={4}
                />
                <text
                  className="catalogue-courbe-prix"
                  x={dessin.pointPromotion.x - 10}
                  y={dessin.pointPromotion.y + 4}
                  textAnchor="end"
                >
                  {prixCourt(dessin.pointPromotion.prix)}
                </text>
              </g>
            )}
            {dessin.mois.map((repere) => (
              <text
                key={`${repere.x}-${repere.texte}`}
                className="catalogue-courbe-mois"
                x={repere.x}
                y={AXE + 26}
                textAnchor="middle"
              >
                {repere.texte}
              </text>
            ))}
          </svg>
          <figcaption className="catalogue-courbe-legende">
            <span className="catalogue-courbe-legende-catalogue">Prix catalogue</span>
            {promotion && <span className="catalogue-courbe-legende-promotion">Promotion</span>}
          </figcaption>
          <table className="visuellement-cache">
            <caption>Prix enregistrés</caption>
            <tbody>
              {entrees.map((entree) => (
                <tr key={entree.date}>
                  <td>{formatDate(entree.date)}</td>
                  <td>{formatXPF(entree.prix)}</td>
                </tr>
              ))}
              {promotion && prixPromotion !== undefined && (
                <tr>
                  <td>Promotion depuis le {formatDate(promotion.debut)}</td>
                  <td>{formatXPF(prixPromotion)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </figure>
      )}
    </section>
  )
}

export default CourbePrix
