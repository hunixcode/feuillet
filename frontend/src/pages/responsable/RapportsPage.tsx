import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Segment from '../../components/client/Segment.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Loader from '../../components/common/Loader.tsx'
import Histogramme, { type JourHistogramme } from '../../components/responsable/Histogramme.tsx'
import IconeAdmin from '../../components/responsable/IconeAdmin.tsx'
import Vignette from '../../components/responsable/Vignette.tsx'
import { listerCategories } from '../../services/categorieService'
import { listerProduits } from '../../services/produitService'
import { exporterRapport, lireRapport, type FiltresRapport } from '../../services/rapportService'
import { listerCommandesFournisseur, listerProduitsAReapprovisionner } from '../../services/reapproService'
import type { Categorie } from '../../types/categorie'
import type { Produit } from '../../types/produit'
import type { Rapport, TotauxRapport } from '../../types/rapport'
import type { CommandeFournisseur, ProduitAReapprovisionner } from '../../types/reappro'
import { ajouterJours, dateCourte, dateLongue, ecartJours, jourDe, moisCourt, nombre, nomJour, numeroJour } from '../../utils/datesAdmin'
import { messageErreur } from '../../utils/erreurs'
import { formatXPF, jourIso } from '../../utils/format'

type Mode = 'semaine' | 'libre'

interface ErreursFiltres {
  debut?: string
  fin?: string
}

const JOURS_MAXIMUM = 31

function enregistrer(contenu: Blob, nom: string) {
  const adresse = URL.createObjectURL(contenu)
  const lien = document.createElement('a')
  lien.href = adresse
  lien.download = nom
  document.body.append(lien)
  lien.click()
  lien.remove()
  URL.revokeObjectURL(adresse)
}

function periodeTexte(debut: string, fin: string): string {
  if (debut === fin) return `le ${dateLongue(debut)}`
  return moisCourt(debut) === moisCourt(fin)
    ? `du ${numeroJour(debut)} au ${dateLongue(fin)}`
    : `du ${dateLongue(debut)} au ${dateLongue(fin)}`
}

function pluriel(valeur: number, mot: string): string {
  return `${valeur} ${mot}${valeur > 1 ? 's' : ''}`
}

interface EcartProps {
  actuel: number
  ancien: number | undefined
  periode: string
  hausseBonne?: boolean
}

function Ecart({ actuel, ancien, periode, hausseBonne = true }: EcartProps) {
  if (ancien === undefined) {
    return null
  }
  if (!ancien) {
    return <dd className="ecart ecart-neutre">{`Rien sur ${periode}`}</dd>
  }
  const valeur = Math.round(((actuel - ancien) / ancien) * 100)
  const bon = valeur === 0 ? null : valeur > 0 === hausseBonne
  return (
    <dd
      className={`ecart ${bon === null ? 'ecart-neutre' : bon ? 'ecart-hausse' : 'ecart-baisse'}`}
      data-bulle-titre={`${formatXPF(ancien)} sur ${periode}`}
      data-bulle-texte="Comparaison avec la période de même durée juste avant."
    >
      {`${valeur > 0 ? '+' : valeur < 0 ? '−' : ''}${Math.abs(valeur)} % sur ${periode}`}
    </dd>
  )
}

function RapportsPage() {
  const [aujourdhui] = useState(() => jourIso(new Date()))
  const [categories, setCategories] = useState<Categorie[]>([])
  const [produits, setProduits] = useState<Produit[]>([])
  const [aRecommander, setARecommander] = useState<ProduitAReapprovisionner[] | null>(null)
  const [enCommande, setEnCommande] = useState<CommandeFournisseur[]>([])
  const [erreurRecommander, setErreurRecommander] = useState('')

  const [mode, setMode] = useState<Mode>('semaine')
  const [jour, setJour] = useState(aujourdhui)
  const [debut, setDebut] = useState('')
  const [fin, setFin] = useState('')
  const [categorie, setCategorie] = useState('')
  const [erreursFiltres, setErreursFiltres] = useState<ErreursFiltres>({})
  const [filtres, setFiltres] = useState<FiltresRapport>({ semaine: aujourdhui })

  const [rapport, setRapport] = useState<Rapport | null>(null)
  const [precedent, setPrecedent] = useState<TotauxRapport | undefined>(undefined)
  const [jours, setJours] = useState<JourHistogramme[] | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreurRapport, setErreurRapport] = useState('')
  const [toutAfficher, setToutAfficher] = useState(false)
  const [exportEnCours, setExportEnCours] = useState(false)
  const [erreurExport, setErreurExport] = useState('')

  useEffect(() => {
    let actif = true
    listerCategories()
      .then((liste) => {
        if (actif) {
          setCategories(liste)
        }
      })
      .catch(() => {})
    listerProduits()
      .then((liste) => {
        if (actif) {
          setProduits(liste)
        }
      })
      .catch(() => {})
    listerCommandesFournisseur()
      .then((liste) => {
        if (actif) {
          setEnCommande(liste.filter((commande) => commande.statut !== 'recue'))
        }
      })
      .catch(() => {})
    listerProduitsAReapprovisionner()
      .then((liste) => {
        if (actif) {
          setARecommander(liste)
        }
      })
      .catch((probleme: unknown) => {
        if (actif) {
          setErreurRecommander(messageErreur(probleme))
        }
      })
    return () => {
      actif = false
    }
  }, [])

  useEffect(() => {
    let actif = true
    lireRapport(filtres)
      .then((resultat) => {
        if (!actif) {
          return
        }
        setRapport(resultat)
        const premier = jourDe(resultat.periode.debut)
        const dernier = jourDe(resultat.periode.fin)
        const duree = ecartJours(premier, dernier) + 1
        const filtreCategorie = filtres.categorie ? { categorie: filtres.categorie } : {}
        lireRapport({ debut: ajouterJours(premier, -duree), fin: ajouterJours(premier, -1), ...filtreCategorie })
          .then((avant) => {
            if (actif) {
              setPrecedent(avant.totaux)
            }
          })
          .catch(() => {})
        if (duree > JOURS_MAXIMUM) {
          setJours([])
          return
        }
        const liste = Array.from({ length: duree }, (_, index) => ajouterJours(premier, index))
        Promise.all(
          liste.map((date) =>
            date > aujourdhui
              ? Promise.resolve(null)
              : lireRapport({ debut: date, fin: date, ...filtreCategorie }).catch(() => null),
          ),
        ).then((rapports) => {
          if (actif) {
            setJours(
              liste.map((date, index) => ({
                jour: date,
                valeur: rapports[index]?.totaux.net ?? 0,
                commandes: rapports[index]?.statistiques.nombreVentes ?? 0,
                retours: rapports[index]?.statistiques.nombreRetours ?? 0,
                futur: date > aujourdhui,
              })),
            )
          }
        })
      })
      .catch((probleme: unknown) => {
        if (actif) {
          setRapport(null)
          setErreurRapport(messageErreur(probleme))
        }
      })
      .finally(() => {
        if (actif) {
          setChargement(false)
        }
      })
    return () => {
      actif = false
    }
  }, [filtres, aujourdhui])

  function charger(nouveaux: FiltresRapport) {
    setChargement(true)
    setErreurRapport('')
    setPrecedent(undefined)
    setJours(null)
    setFiltres(nouveaux)
  }

  function filtreCategorie(valeur = categorie): FiltresRapport {
    return valeur ? { categorie: valeur } : {}
  }

  function changerMode(nouveau: Mode) {
    setMode(nouveau)
    setErreursFiltres({})
    if (nouveau === 'semaine') {
      charger({ semaine: jour, ...filtreCategorie() })
    }
  }

  function changerSemaine(decalage: number) {
    const nouveau = ajouterJours(jour, decalage)
    setJour(nouveau)
    charger({ semaine: nouveau, ...filtreCategorie() })
  }

  function changerCategorie(valeur: string) {
    setCategorie(valeur)
    const { categorie: _ancienne, ...reste } = filtres
    charger({ ...reste, ...filtreCategorie(valeur) })
  }

  function appliquer(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    const erreurs: ErreursFiltres = {}
    if (!debut) {
      erreurs.debut = 'Choisissez la date de début.'
    }
    if (!fin) {
      erreurs.fin = 'Choisissez la date de fin.'
    } else if (debut && fin < debut) {
      erreurs.fin = 'La date de fin doit être après la date de début.'
    }
    setErreursFiltres(erreurs)
    if (Object.keys(erreurs).length > 0) {
      return
    }
    charger({ debut, fin, ...filtreCategorie() })
  }

  async function exporter() {
    setExportEnCours(true)
    setErreurExport('')
    try {
      const fichier = await exporterRapport(filtres)
      enregistrer(fichier.contenu, fichier.nom)
    } catch (probleme) {
      setErreurExport(messageErreur(probleme))
    } finally {
      setExportEnCours(false)
    }
  }

  const produitDe = (id: string) => produits.find((produit) => produit.id === id)
  const lignes =
    rapport?.produits.filter(
      (produit) => toutAfficher || produit.quantiteVendue > 0 || produit.quantiteRetournee > 0,
    ) ?? []
  const periode = rapport ? { debut: jourDe(rapport.periode.debut), fin: jourDe(rapport.periode.fin) } : null
  const libellePrecedent = filtres.semaine ? 'la semaine précédente' : 'la période précédente'
  const passes = (jours ?? []).filter((element) => !element.futur)
  const meilleur = passes.reduce<JourHistogramme | null>(
    (choix, element) => (!choix || element.valeur > choix.valeur ? element : choix),
    null,
  )
  const indexMeilleur = meilleur && meilleur.valeur > 0 ? (jours ?? []).indexOf(meilleur) : -1
  const indexFort = (jours ?? []).findIndex(
    (element) => element.jour === (periode && periode.fin > aujourdhui ? aujourdhui : periode?.fin),
  )
  const semaineSuivanteFuture = periode ? ajouterJours(periode.fin, 1) > aujourdhui : true

  return (
    <>
      <title>Réapprovisionnement et rapports · Feuillet</title>
      <header className="tete">
        <div>
          <h1>Réapprovisionnement et rapports</h1>
          <p>Ventes, retours et stock sur la période choisie, et les articles à recommander.</p>
        </div>
        <div className="tete-actions">
          <button
            className="bouton bouton-petit bouton-contour"
            type="button"
            disabled={!rapport || exportEnCours}
            aria-busy={exportEnCours || undefined}
            onClick={exporter}
          >
            <IconeAdmin nom="telecharger" epaisseur={1.8} />
            Exporter en CSV
          </button>
        </div>
      </header>

      {erreurExport && <ErrorMessage>{erreurExport}</ErrorMessage>}

      <section className="feuille" aria-label="Résultats de la période">
        <div className="outils">
          <Segment
            libelle="Choix de la période"
            valeur={mode}
            onChange={(valeur) => changerMode(valeur as Mode)}
            options={[
              { valeur: 'semaine', libelle: 'Semaine' },
              { valeur: 'libre', libelle: 'Période libre' },
            ]}
          />
          {mode === 'semaine' ? (
            <div className="periode">
              <button type="button" aria-label="Semaine précédente" onClick={() => changerSemaine(-7)}>
                <IconeAdmin nom="gauche" epaisseur={2} />
              </button>
              <span>{periode && filtres.semaine ? `Semaine ${periodeTexte(periode.debut, periode.fin)}` : 'Semaine'}</span>
              <button
                type="button"
                aria-label="Semaine suivante"
                disabled={semaineSuivanteFuture}
                onClick={() => changerSemaine(7)}
              >
                <IconeAdmin nom="droite" epaisseur={2} />
              </button>
            </div>
          ) : (
            <form className="dates-libres" onSubmit={appliquer} noValidate>
              <label className="gris" htmlFor="date-debut">
                Du
              </label>
              <input
                id="date-debut"
                type="date"
                value={debut}
                max={aujourdhui}
                aria-invalid={erreursFiltres.debut ? true : undefined}
                aria-describedby={erreursFiltres.debut ? 'erreur-debut' : undefined}
                onChange={(evenement) => setDebut(evenement.target.value)}
              />
              <label className="gris" htmlFor="date-fin">
                Au
              </label>
              <input
                id="date-fin"
                type="date"
                value={fin}
                aria-invalid={erreursFiltres.fin ? true : undefined}
                aria-describedby={erreursFiltres.fin ? 'erreur-fin' : undefined}
                onChange={(evenement) => setFin(evenement.target.value)}
              />
              <button className="bouton bouton-petit" type="submit">
                Afficher
              </button>
            </form>
          )}
          <select
            className="choix-liste"
            aria-label="Catégorie"
            value={categorie}
            onChange={(evenement) => changerCategorie(evenement.target.value)}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((element) => (
              <option key={element.id} value={element.id}>
                {element.libelle}
              </option>
            ))}
          </select>
        </div>
        {mode === 'libre' && (erreursFiltres.debut || erreursFiltres.fin) && (
          <div className="feuille-corps">
            {erreursFiltres.debut && (
              <p className="champ-erreur" id="erreur-debut">
                {erreursFiltres.debut}
              </p>
            )}
            {erreursFiltres.fin && (
              <p className="champ-erreur" id="erreur-fin">
                {erreursFiltres.fin}
              </p>
            )}
          </div>
        )}

        {erreurRapport && <ErrorMessage>{erreurRapport}</ErrorMessage>}
        {chargement && <Loader />}

        {rapport && periode && !chargement && (
          <>
            {!filtres.semaine && (
              <p className="feuille-note equation-periode">
                {`Période ${periodeTexte(periode.debut, periode.fin)}`}
              </p>
            )}
            <dl className="equation">
              <div>
                <dt
                  data-bulle-titre="Ventes brutes"
                  data-bulle-texte="Montant TTC des articles vendus sur la période, sans les frais d’emballage cadeau ni de livraison."
                >
                  Ventes brutes
                </dt>
                <dd>
                  {nombre(rapport.totaux.ventesBrutes)}
                  <span>XPF</span>
                </dd>
                <Ecart actuel={rapport.totaux.ventesBrutes} ancien={precedent?.ventesBrutes} periode={libellePrecedent} />
              </div>
              <div className="operateur" aria-hidden="true">
                −
              </div>
              <div>
                <dt
                  data-bulle-titre="Retours"
                  data-bulle-texte="Valeur des articles remboursés ou échangés sur la période. Les remplacements de défectueux n’en font pas partie."
                >
                  Retours
                </dt>
                <dd>
                  {nombre(rapport.totaux.retours)}
                  <span>XPF</span>
                </dd>
                <Ecart
                  actuel={rapport.totaux.retours}
                  ancien={precedent?.retours}
                  periode={libellePrecedent}
                  hausseBonne={false}
                />
              </div>
              <div className="operateur" aria-hidden="true">
                =
              </div>
              <div className="resultat">
                <dt
                  data-bulle-titre="Net"
                  data-bulle-texte="Ventes brutes moins retours : ce que la librairie a vraiment encaissé sur les articles."
                >
                  Net
                </dt>
                <dd>
                  {nombre(rapport.totaux.net)}
                  <span>XPF</span>
                </dd>
                <Ecart actuel={rapport.totaux.net} ancien={precedent?.net} periode={libellePrecedent} />
              </div>
              <p className="equation-quantites">
                {`${pluriel(rapport.totaux.quantiteVendue, 'article')} vendu${rapport.totaux.quantiteVendue > 1 ? 's' : ''}, ${rapport.totaux.quantiteRetournee} retourné${rapport.totaux.quantiteRetournee > 1 ? 's' : ''}, ${rapport.totaux.quantiteNette} net${rapport.totaux.quantiteNette > 1 ? 's' : ''}, sur ${pluriel(rapport.statistiques.nombreVentes, 'commande')}. Panier moyen ${formatXPF(rapport.statistiques.panierMoyen)}, ${pluriel(rapport.statistiques.nombreRetours, 'retour')} enregistré${rapport.statistiques.nombreRetours > 1 ? 's' : ''}. Frais de livraison et d’emballage non compris.`}
              </p>
            </dl>
            <div className="feuille-corps">
              <div className="verre-tete" style={{ color: 'var(--gris)' }}>
                <span>Ventes nettes par jour</span>
                {meilleur && indexMeilleur >= 0 && (
                  <span>
                    {'Meilleur jour, '}
                    <strong style={{ color: 'var(--noir)' }}>{`${nomJour(meilleur.jour)} ${dateLongue(meilleur.jour)}`}</strong>
                  </span>
                )}
              </div>
              {jours === null && <Loader />}
              {jours && jours.length === 0 && (
                <p className="tiroir-note">{`Le détail jour par jour s’affiche pour une période de ${JOURS_MAXIMUM} jours au plus.`}</p>
              )}
              {jours && jours.length > 0 && (
                <div className="histo-clair">
                  <Histogramme
                    jours={jours}
                    hauteur={220}
                    fort={indexFort}
                    etiquettes={indexMeilleur >= 0 ? [indexMeilleur] : []}
                    libelle={`Ventes nettes par jour, ${periodeTexte(periode.debut, periode.fin)}`}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <div className="deux">
        <section className="feuille" aria-labelledby="titre-articles">
          <div className="feuille-tete">
            <h2 className="feuille-titre" id="titre-articles">
              Par article
            </h2>
            <label className="feuille-note case-ligne">
              <input
                type="checkbox"
                checked={toutAfficher}
                onChange={(evenement) => setToutAfficher(evenement.target.checked)}
              />
              Afficher aussi les articles sans vente ni retour
            </label>
          </div>
          {rapport && !chargement && lignes.length > 0 && (
            <table className="liste">
              <thead>
                <tr>
                  <th scope="col">Article</th>
                  <th scope="col" className="num">
                    Vendus
                  </th>
                  <th scope="col" className="num optionnel">
                    Retournés
                  </th>
                  <th
                    scope="col"
                    className="num"
                    data-bulle-titre="Net"
                    data-bulle-texte="Vendus moins retournés. Survolez un chiffre pour le détail des montants."
                  >
                    Net
                  </th>
                  <th
                    scope="col"
                    className="num optionnel"
                    data-bulle-titre="En stock"
                    data-bulle-texte="Exemplaires en magasin à la fin de la période."
                  >
                    En stock
                  </th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((ligne) => {
                  const produit = produitDe(ligne.produitId)
                  return (
                    <tr key={ligne.produitId}>
                      <td>
                        <span className="article">
                          <Vignette key={produit?.isbn} isbn={produit?.isbn} type={produit?.type} />
                          <span>
                            <span className="article-titre">{ligne.designation}</span>
                            <span className="article-meta">{`${formatXPF(ligne.montantNet)} nets`}</span>
                          </span>
                        </span>
                      </td>
                      <td className="num">{ligne.quantiteVendue}</td>
                      <td className={ligne.quantiteRetournee ? 'num optionnel' : 'num optionnel gris'}>
                        {ligne.quantiteRetournee}
                      </td>
                      <td
                        className="num fort"
                        tabIndex={0}
                        data-bulle-titre={`${formatXPF(ligne.montantNet)} nets`}
                        data-bulle-texte={`Ventes ${formatXPF(ligne.montantVentes)}, retours ${formatXPF(ligne.montantRetours)}, ${pluriel(ligne.quantiteRemplacee, 'remplacement')}${ligne.pourcentageVendu !== null ? `, ${ligne.pourcentageVendu} % de l’achat vendu` : ''}.`}
                      >
                        {ligne.quantiteNette}
                      </td>
                      <td className="num optionnel">{ligne.stockRestant}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {rapport && !chargement && lignes.length === 0 && (
            <p className="vide-liste">Aucune vente sur cette période.</p>
          )}
        </section>

        <section className="feuille" aria-labelledby="titre-reappro">
          <div className="feuille-tete">
            <h2 className="feuille-titre" id="titre-reappro">
              À recommander
            </h2>
            <Link className="lien-fleche" to="/admin/commandes">
              Passer une commande fournisseur
            </Link>
            <p className="feuille-note">
              Le stock en vente est passé sous le seuil d’alerte. Le pourcentage est la part de la
              quantité achetée déjà vendue.
            </p>
          </div>
          {erreurRecommander && <ErrorMessage>{erreurRecommander}</ErrorMessage>}
          {!erreurRecommander && !aRecommander && <Loader />}
          {aRecommander && aRecommander.length === 0 && (
            <p className="vide-liste">Aucun article sous son seuil d’alerte.</p>
          )}
          {aRecommander && aRecommander.length > 0 && (
            <ul className="rangees">
              {aRecommander.map((article) => {
                const produit = produitDe(article.produitId)
                const commande = enCommande.find((element) => element.produitId === article.produitId)
                return (
                  <li className="rangee" key={article.produitId}>
                    <Vignette key={produit?.isbn} isbn={produit?.isbn} type={produit?.type} />
                    <div>
                      <p className="rangee-titre">{article.designation}</p>
                      <p className="rangee-meta">
                        <strong style={{ color: 'var(--noir)', fontWeight: 600 }}>
                          {`${article.pourcentageVendu} % vendu`}
                        </strong>
                        {`, ${article.quantiteVendable} en vente sur ${article.quantiteAcheteeOrigine}, seuil à ${article.seuilAlerte} %`}
                      </p>
                      <span style={{ display: 'block', marginTop: 8 }}>
                        <span
                          className={article.pourcentageVendu >= 90 ? 'jauge jauge-alerte' : 'jauge'}
                          style={{ width: '100%' }}
                        >
                          <span style={{ width: `${Math.max(2, Math.min(100, article.pourcentageVendu))}%` }} />
                        </span>
                      </span>
                    </div>
                    <div className="rangee-fin">
                      {commande || article.quantiteEnCommande > 0 ? (
                        <span
                          className="etiquette"
                          data-bulle-titre="Commande en route"
                          data-bulle-texte={`${article.quantiteEnCommande} exemplaires commandés${commande ? `, arrivée prévue le ${dateLongue(commande.dateArriveePrevue)}` : ''}.`}
                        >
                          <IconeAdmin nom="camion" epaisseur={1.7} />
                          {commande ? dateCourte(commande.dateArriveePrevue) : `${article.quantiteEnCommande} en commande`}
                        </span>
                      ) : (
                        <Link className="action-ligne" to="/admin/commandes">
                          Commander
                        </Link>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}

export default RapportsPage
