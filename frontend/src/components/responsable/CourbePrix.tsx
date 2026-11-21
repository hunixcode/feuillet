import { useEffect, useState } from 'react'
import ErrorMessage from '../common/ErrorMessage.tsx'
import Loader from '../common/Loader.tsx'
import { historiquePrix } from '../../services/catalogueAdminService'
import type { EntreePrix, Promotion } from '../../types/produit'
import { dateLongue, jourDe, majuscule, moisCourt, nomJour, nombre } from '../../utils/datesAdmin'
import { messageErreur } from '../../utils/erreurs'
import { formatXPF, jourIso } from '../../utils/format'

const L = 560
const H = 200
const MARGE = { g: 6, d: 64, h: 30, b: 28 }
const ECART_ETIQUETTES = 52
const DUREE_MINIMALE = 30 * 86_400_000

interface CourbePrixProps {
  produitId: string
  prixActuel: number
  promotion?: Promotion
  prixPromotion?: number
}

function temps(jour: string): number {
  return Date.parse(`${jour}T12:00:00Z`)
}

function dateComplete(jour: string): string {
  return `${dateLongue(jour)} ${jour.slice(0, 4)}`
}

function moisAnnee(jour: string): string {
  return `${moisCourt(jour)} ${jour.slice(2, 4)}`
}

interface CourbeProps {
  entrees: EntreePrix[]
  libelle: string
  aujourdhui: string
  promotion?: Promotion
  prixPromotion?: number
}

function Courbe({ entrees, libelle, aujourdhui, promotion, prixPromotion }: CourbeProps) {
  const points = entrees.map((entree) => {
    const jour = jourDe(entree.date)
    return { jour, t: temps(jour), prix: entree.prix }
  })
  const promo = promotion && prixPromotion !== undefined ? promotion : undefined
  const fin = Math.max(temps(aujourdhui), promo ? temps(promo.fin) : 0, points[points.length - 1].t)
  const debut = Math.min(points[0].t, fin - DUREE_MINIMALE)
  const prix = points.map((point) => point.prix)
  const prixMin = Math.min(...prix, promo ? (prixPromotion as number) : Infinity)
  const prixMax = Math.max(...prix)
  const bas = prixMin - Math.max(80, (prixMax - prixMin) * 0.6)
  const haut = prixMax + Math.max(40, (prixMax - prixMin) * 0.2)
  const x = (t: number) =>
    MARGE.g + ((Math.max(t, debut) - debut) / Math.max(1, fin - debut)) * (L - MARGE.g - MARGE.d)
  const y = (valeur: number) => MARGE.h + (1 - (valeur - bas) / (haut - bas)) * (H - MARGE.h - MARGE.b)

  let trace = `M ${x(points[0].t)} ${y(points[0].prix)}`
  for (const point of points.slice(1)) {
    trace += ` H ${x(point.t)} V ${y(point.prix)}`
  }
  trace += ` H ${x(fin)}`
  const aire = `${trace} V ${H - MARGE.b} H ${x(points[0].t)} Z`

  const grille = [...new Set([0, 0.5, 1].map((part) => Math.round((bas + part * (haut - bas)) / 50) * 50))]

  const etiquettes: { x: number; texte: string }[] = []
  for (const point of points) {
    const position = Math.min(x(point.t), L - MARGE.d - 40)
    const precedente = etiquettes[etiquettes.length - 1]
    if (!precedente || position - precedente.x >= ECART_ETIQUETTES) {
      etiquettes.push({ x: position, texte: moisAnnee(point.jour) })
    }
  }

  const promoDebut = promo ? x(temps(promo.debut)) : 0
  const promoFin = promo ? x(temps(promo.fin)) : 0
  const promoY = promo ? y(prixPromotion as number) : 0
  const texteAGauche = promoDebut - 8 > 190
  const dernier = points[points.length - 1]

  return (
    <svg className="courbe" viewBox={`0 0 ${L} ${H}`} role="img" aria-label={libelle}>
      <g className="grille">
        {grille.map((valeur) => (
          <g key={valeur}>
            <line x1={MARGE.g} x2={L - MARGE.d} y1={y(valeur)} y2={y(valeur)} />
            <text className="axe-y" x={L - MARGE.d + 8} y={y(valeur) + 4} fill="#9a9993" fontSize="11">
              {nombre(valeur)}
            </text>
          </g>
        ))}
      </g>
      {promo && (
        <rect
          className="promo-zone"
          x={promoDebut}
          y={MARGE.h - 18}
          width={Math.max(6, promoFin - promoDebut)}
          height={H - MARGE.b - MARGE.h + 18}
          rx="3"
        />
      )}
      <path className="aire" d={aire} />
      <path className="trace" d={trace} />
      {promo && (
        <>
          <line className="promo-trait" x1={promoDebut} x2={promoFin} y1={promoY} y2={promoY} />
          <text
            className="promo-texte"
            textAnchor={texteAGauche ? 'end' : 'start'}
            x={texteAGauche ? promoDebut - 8 : promoDebut}
            y={texteAGauche ? promoY + 4 : promoY + 18}
          >
            {`Promotion −${promo.remise} %, ${nombre(prixPromotion as number)}`}
          </text>
        </>
      )}
      <g className="axe">
        {etiquettes.map((etiquette) => (
          <text key={`${etiquette.x}-${etiquette.texte}`} x={etiquette.x} y={H - 6}>
            {etiquette.texte}
          </text>
        ))}
      </g>
      {points.map((point, index) => (
        <g key={`${point.jour}-${index}`}>
          <circle className="point" cx={x(point.t)} cy={y(point.prix)} r="4.5" />
          <circle
            className="point-cible"
            cx={x(point.t)}
            cy={y(point.prix)}
            r="14"
            tabIndex={0}
            aria-label={`${dateComplete(point.jour)}, ${formatXPF(point.prix)}`}
            data-bulle-titre={majuscule(`${nomJour(point.jour)} ${dateComplete(point.jour)}`)}
            data-bulle-texte={`${index === 0 ? 'Création, ' : 'Nouveau prix, '}${formatXPF(point.prix)}`}
          />
        </g>
      ))}
      <text className="valeur" x={x(fin) - 4} y={y(dernier.prix) - 12} textAnchor="end">
        {nombre(dernier.prix)}
      </text>
    </svg>
  )
}

function CourbePrix({ produitId, prixActuel, promotion, prixPromotion }: CourbePrixProps) {
  const [entrees, setEntrees] = useState<EntreePrix[] | null>(null)
  const [erreur, setErreur] = useState('')
  const [aujourdhui] = useState(() => jourIso(new Date()))

  useEffect(() => {
    let actif = true
    historiquePrix(produitId)
      .then((liste) => {
        if (actif) {
          setEntrees([...liste].sort((a, b) => a.date.localeCompare(b.date)))
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

  const changements = entrees ? entrees.length - 1 : 0
  const dernier = entrees?.[entrees.length - 1]

  return (
    <section className="tiroir-section" aria-labelledby="titre-courbe">
      <h3 id="titre-courbe">
        Évolution du prix
        {entrees && entrees.length > 0 && (
          <small>
            {changements > 0 ? `${changements} changement${changements > 1 ? 's' : ''}` : 'Prix de départ'}
          </small>
        )}
      </h3>
      {erreur && <ErrorMessage>{erreur}</ErrorMessage>}
      {!erreur && entrees === null && <Loader />}
      {entrees?.length === 0 && <p className="tiroir-note">Aucun prix enregistré.</p>}
      {entrees && dernier && (
        <>
          <div className="courbe-tete">
            <p className="courbe-prix">
              {nombre(prixActuel)}
              <span>XPF TTC</span>
            </p>
            <p className="courbe-depuis">
              {changements > 0
                ? `Depuis le ${dateComplete(jourDe(dernier.date))}`
                : 'Inchangé depuis la création'}
            </p>
          </div>
          <Courbe
            entrees={entrees}
            aujourdhui={aujourdhui}
            libelle={`Évolution du prix : ${entrees.length} prix enregistré${entrees.length > 1 ? 's' : ''}${promotion ? ', promotion en cours' : ''}`}
            promotion={promotion}
            prixPromotion={prixPromotion}
          />
          <table className="visuellement-cache">
            <caption>Prix enregistrés</caption>
            <tbody>
              {entrees.map((entree, index) => (
                <tr key={`${entree.date}-${index}`}>
                  <td>{dateComplete(jourDe(entree.date))}</td>
                  <td>{formatXPF(entree.prix)}</td>
                </tr>
              ))}
              {promotion && prixPromotion !== undefined && (
                <tr>
                  <td>{`Promotion du ${dateComplete(promotion.debut)} au ${dateComplete(promotion.fin)}`}</td>
                  <td>{formatXPF(prixPromotion)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}

export default CourbePrix
