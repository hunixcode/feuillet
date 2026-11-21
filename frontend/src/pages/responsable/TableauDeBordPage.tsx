import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Loader from '../../components/common/Loader.tsx'
import type { PointVentes } from '../../components/responsable/CourbeVentes.tsx'
import Histogramme from '../../components/responsable/Histogramme.tsx'
import IconeAdmin from '../../components/responsable/IconeAdmin.tsx'
import InfoBulle from '../../components/responsable/InfoBulle.tsx'
import SuiviVentes from '../../components/responsable/SuiviVentes.tsx'
import TableauVentesProduits from '../../components/responsable/TableauVentesProduits.tsx'
import Vignette from '../../components/responsable/Vignette.tsx'
import { listerCategories } from '../../services/categorieService'
import { listerDemandes } from '../../services/demandeAdminService'
import { listerProduits } from '../../services/produitService'
import { lireRapport } from '../../services/rapportService'
import {
  listerCommandesFournisseur,
  listerProduitsAReapprovisionner,
} from '../../services/reapproService'
import { listerVentes } from '../../services/venteAdminService'
import type { Categorie } from '../../types/categorie'
import type { Demande } from '../../types/demande'
import type { Produit } from '../../types/produit'
import type { Rapport } from '../../types/rapport'
import type { CommandeFournisseur, ProduitAReapprovisionner } from '../../types/reappro'
import type { Vente } from '../../types/vente'
import {
  ajouterJours,
  dans,
  dateCourte,
  dateLongue,
  dateRelative,
  ecartJours,
  heure,
  jourDe,
  majuscule,
  moisCourt,
  nombre,
  nomJour,
  numeroJour,
} from '../../utils/datesAdmin'
import { messageErreur } from '../../utils/erreurs'
import { formatJour, formatXPF, jourIso } from '../../utils/format'
import './TableauDeBordPage.css'

interface RapportDuJour {
  jour: string
  rapport: Rapport
}

interface Donnees {
  aRecommander: ProduitAReapprovisionner[]
  arrivages: CommandeFournisseur[]
  misesDeCote: Demande[]
  aPreparer: Vente[]
  produits: Produit[]
  categories: Categorie[]
  rapport: Rapport
  jours: RapportDuJour[]
  netPrecedent: number
  precedente: Rapport['periode']
}

function pluriel(valeur: number, singulier: string, plurielTexte = `${singulier}s`): string {
  return `${valeur} ${valeur > 1 ? plurielTexte : singulier}`
}

function periodeTexte(debut: string, fin: string): string {
  const memeMois = moisCourt(debut) === moisCourt(fin)
  return memeMois
    ? `${numeroJour(debut)} au ${dateLongue(fin)}`
    : `${dateLongue(debut)} au ${dateLongue(fin)}`
}

async function rapportsParJour(debut: string, categorie = ''): Promise<RapportDuJour[]> {
  const jours = Array.from({ length: 7 }, (_, index) => ajouterJours(debut, index))
  const rapports = await Promise.all(
    jours.map((jour) => lireRapport({ debut: jour, fin: jour, categorie })),
  )
  return jours.map((jour, index) => ({ jour, rapport: rapports[index] }))
}

function totauxParJour(jours: RapportDuJour[]): PointVentes[] {
  return jours.map(({ jour, rapport }) => ({
    jour,
    quantite: rapport.totaux.quantiteNette,
    montant: rapport.totaux.net,
  }))
}

function useCompteur(cible: number | null): number | null {
  const [progres, setProgres] = useState(0)
  const calme = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true

  useEffect(() => {
    if (cible === null || calme || typeof requestAnimationFrame !== 'function') {
      return
    }
    const debut = performance.now()
    let cadre = 0
    const etape = (maintenant: number) => {
      const t = Math.min(1, (maintenant - debut) / 1300)
      setProgres(t)
      if (t < 1) {
        cadre = requestAnimationFrame(etape)
      }
    }
    cadre = requestAnimationFrame(etape)
    return () => cancelAnimationFrame(cadre)
  }, [cible, calme])

  if (cible === null) {
    return null
  }
  if (calme || progres >= 1) {
    return cible
  }
  return Math.round((cible * (1 - Math.pow(1 - progres, 4))) / 10) * 10
}

function entree(index: number): CSSProperties {
  return { ['--i' as string]: index }
}

function TableauDeBordPage() {
  const [aujourdhui] = useState(() => jourIso(new Date()))
  const [miseAJour] = useState(() => heure(new Date()))
  const [donnees, setDonnees] = useState<Donnees | null>(null)
  const [erreur, setErreur] = useState('')
  const [jourChoisi, setJourChoisi] = useState('')
  const [courbe, setCourbe] = useState('')
  const [courbesCategorie, setCourbesCategorie] = useState<Record<string, PointVentes[]>>({})
  const [erreurCourbe, setErreurCourbe] = useState('')
  const suivi = useRef<HTMLElement>(null)
  const detailSection = useRef<HTMLElement>(null)

  useEffect(() => {
    let actif = true
    Promise.all([
      listerProduitsAReapprovisionner(),
      listerCommandesFournisseur(),
      listerDemandes('mise_de_cote'),
      listerVentes('a_preparer'),
      listerProduits().catch(() => [] as Produit[]),
      listerCategories(),
      lireRapport({ semaine: aujourdhui }).then(async (rapport) => ({
        rapport,
        jours: await rapportsParJour(rapport.periode.debut),
      })),
      lireRapport({ semaine: ajouterJours(aujourdhui, -7) }),
    ])
      .then(([aRecommander, commandes, demandes, aPreparer, produits, categories, semaine, avant]) => {
        if (actif) {
          setDonnees({
            aRecommander: [...aRecommander].sort(
              (a, b) =>
                a.quantiteVendable / Math.max(1, a.quantiteAcheteeOrigine) -
                b.quantiteVendable / Math.max(1, b.quantiteAcheteeOrigine),
            ),
            arrivages: commandes
              .filter((commande) => commande.statut !== 'recue')
              .sort((a, b) => a.dateArriveePrevue.localeCompare(b.dateArriveePrevue)),
            misesDeCote: [...demandes].sort((a, b) =>
              (a.miseDeCote?.dateLimite ?? '').localeCompare(b.miseDeCote?.dateLimite ?? ''),
            ),
            aPreparer,
            produits,
            categories,
            ...semaine,
            netPrecedent: avant.totaux.net,
            precedente: avant.periode,
          })
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
  }, [aujourdhui])

  const jours = donnees?.jours ?? []
  const passes = jours.filter(({ jour }) => jour <= aujourdhui)
  const net = passes.reduce((somme, { rapport }) => somme + rapport.totaux.net, 0)
  const montant = useCompteur(donnees ? net : null)

  const produitDe = (id: string) => donnees?.produits.find((produit) => produit.id === id)
  const commandeDe = (id: string) => donnees?.arrivages.find((commande) => commande.produitId === id)

  function choisirJour(jour: string) {
    setJourChoisi((actuel) => (actuel === jour ? '' : jour))
    detailSection.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  function choisirCourbe(choix: string) {
    setCourbe(choix)
    setErreurCourbe('')
    const [genre, categorie] = choix.split(':')
    if (genre !== 'categorie' || !donnees || courbesCategorie[categorie]) {
      return
    }
    rapportsParJour(donnees.rapport.periode.debut, categorie)
      .then((resultat) =>
        setCourbesCategorie((courbes) => ({ ...courbes, [categorie]: totauxParJour(resultat) })),
      )
      .catch((probleme: unknown) => setErreurCourbe(messageErreur(probleme)))
  }

  function choisirProduit(produitId: string) {
    const choix = `produit:${produitId}`
    choisirCourbe(courbe === choix ? '' : choix)
    suivi.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
  }

  const detail = jours.find(({ jour }) => jour === jourChoisi)?.rapport ?? donnees?.rapport
  const evolutions: Record<string, PointVentes[]> = {}
  for (const produit of donnees?.rapport.produits ?? []) {
    evolutions[produit.produitId] = jours.map(({ jour, rapport }) => {
      const ligne = rapport.produits.find((element) => element.produitId === produit.produitId)
      return { jour, quantite: ligne?.quantiteNette ?? 0, montant: ligne?.montantNet ?? 0 }
    })
  }
  const articlesVendus = (donnees?.rapport.produits ?? []).filter(
    (produit) => produit.quantiteVendue > 0 || produit.quantiteRetournee > 0,
  )
  const [genreCourbe, cibleCourbe] = courbe.split(':')
  const ventesCourbe =
    genreCourbe === 'produit'
      ? (evolutions[cibleCourbe] ?? [])
      : genreCourbe === 'categorie'
        ? (courbesCategorie[cibleCourbe] ?? null)
        : totauxParJour(jours)

  const indexAujourdhui = jours.findIndex(({ jour }) => jour === aujourdhui)
  const meilleur = passes.reduce<RapportDuJour | null>(
    (choix, jour) => (!choix || jour.rapport.totaux.net > choix.rapport.totaux.net ? jour : choix),
    null,
  )
  const indexMeilleur = meilleur ? jours.indexOf(meilleur) : -1
  const indexChoisi = jours.findIndex(({ jour }) => jour === jourChoisi)
  const evolution =
    donnees && donnees.netPrecedent > 0
      ? Math.round(((net - donnees.netPrecedent) / donnees.netPrecedent) * 100)
      : null

  return (
    <>
      <title>Tableau de bord · Feuillet</title>
      <header className="tete">
        <div>
          <h1>Tableau de bord</h1>
          <p>{`${majuscule(formatJour(new Date(`${aujourdhui}T12:00:00.000Z`)))}. Mis à jour à ${miseAJour}.`}</p>
        </div>
        <div className="tete-actions">
          <Link className="bouton bouton-petit bouton-contour" to="/admin/rapports">
            Rapport de la semaine
          </Link>
        </div>
      </header>

      {erreur && <ErrorMessage>{erreur}</ErrorMessage>}
      {!erreur && !donnees && <Loader />}

      {donnees && (
        <>
          <section className="vitrine entree" style={entree(0)} aria-labelledby="titre-semaine">
            <img className="vitrine-photo" src="/images/etagere.jpg" alt="" />
            <div>
              <h2 className="vitrine-date" id="titre-semaine">
                {`Semaine du ${periodeTexte(donnees.rapport.periode.debut, donnees.rapport.periode.fin)}`}
              </h2>
              <p className="vitrine-montant">
                {nombre(montant ?? net)}
                <span>XPF</span>
              </p>
              <p className="vitrine-legende">
                de ventes cette semaine, retours déduits
                {evolution !== null && (
                  <span
                    className={evolution < 0 ? 'evolution evolution-baisse' : 'evolution'}
                    data-bulle-titre={`Semaine du ${periodeTexte(donnees.precedente.debut, donnees.precedente.fin)}`}
                    data-bulle-texte={`${formatXPF(donnees.netPrecedent)} de ventes nettes`}
                  >
                    <IconeAdmin nom={evolution < 0 ? 'baisse' : 'hausse'} epaisseur={2.4} />
                    {`${evolution > 0 ? '+' : ''}${evolution} % sur la semaine dernière`}
                  </span>
                )}
              </p>
              <div className="vitrine-chiffres">
                <Link to="/admin/ventes">
                  <strong>{donnees.aPreparer.length}</strong>
                  <span>à préparer</span>
                </Link>
                <div>
                  <strong>{passes.reduce((somme, { rapport }) => somme + rapport.statistiques.nombreVentes, 0)}</strong>
                  <span>commandes</span>
                </div>
                <div>
                  <strong>{passes.reduce((somme, { rapport }) => somme + rapport.totaux.quantiteVendue, 0)}</strong>
                  <span>articles vendus</span>
                </div>
                <div>
                  <strong>{passes.reduce((somme, { rapport }) => somme + rapport.statistiques.nombreRetours, 0)}</strong>
                  <span>retours</span>
                </div>
              </div>
            </div>
            <div className="verre">
              <div className="verre-tete">
                <span>Ventes nettes par jour</span>
                {meilleur && meilleur.rapport.totaux.net > 0 && (
                  <span>
                    Meilleur jour, <strong>{nomJour(meilleur.jour)}</strong>
                  </span>
                )}
              </div>
              <Histogramme
                libelle="Ventes nettes par jour"
                anime
                jours={jours.map(({ jour, rapport }) => ({
                  jour,
                  valeur: rapport.totaux.net,
                  commandes: rapport.statistiques.nombreVentes,
                  retours: rapport.statistiques.nombreRetours,
                  futur: jour > aujourdhui,
                }))}
                fort={indexChoisi >= 0 ? indexChoisi : indexAujourdhui}
                etiquettes={[indexMeilleur, indexAujourdhui]}
                onChoix={choisirJour}
              />
            </div>
          </section>

          <section className="feuille entree" style={entree(1)} aria-labelledby="titre-recommander">
            <div className="feuille-tete">
              <h2 className="feuille-titre" id="titre-recommander">
                À recommander
              </h2>
              <Link className="lien-fleche" to="/admin/stock">
                Tout le stock
              </Link>
              <p className="feuille-note">
                Le stock vendable est passé sous le seuil d’alerte de la quantité achetée.
              </p>
            </div>
            {donnees.aRecommander.length === 0 ? (
              <p className="vide-liste">Aucun article sous son seuil d’alerte.</p>
            ) : (
              <div className="etagere">
                {donnees.aRecommander.map((article) => {
                  const part = Math.round(
                    (article.quantiteVendable / Math.max(1, article.quantiteAcheteeOrigine)) * 100,
                  )
                  const commande = commandeDe(article.produitId)
                  const fiche = produitDe(article.produitId)
                  return (
                    <article className="casier" key={article.produitId}>
                      <Link
                        className="casier-visuel"
                        to="/admin/stock"
                        aria-label={`Stock de ${article.designation}`}
                      >
                        <span className={part === 0 ? 'casier-part casier-part-vide' : 'casier-part'}>
                          {part === 0 ? 'Épuisé' : `${part} % restant`}
                        </span>
                        <Vignette key={fiche?.isbn} nu isbn={fiche?.isbn} type={fiche?.type} />
                      </Link>
                      <h3 className="casier-titre">{article.designation}</h3>
                      <p className="casier-meta">
                        {`${article.quantiteVendable} en vente sur ${article.quantiteAcheteeOrigine} achetés`}
                      </p>
                      <span className={part < 10 ? 'jauge jauge-alerte' : 'jauge'}>
                        <span style={{ width: `${Math.max(2, Math.min(100, part))}%` }} />
                      </span>
                      <div className="casier-pied">
                        {commande ? (
                          <span className="en-route">
                            {`${commande.quantiteCommandee - commande.quantiteRecue} en route, `}
                            <strong>{`arrivée le ${dateCourte(commande.dateArriveePrevue)}`}</strong>
                          </span>
                        ) : (
                          <>
                            <span className="en-route">Rien en commande</span>
                            <Link className="bouton bouton-petit" to="/admin/commandes">
                              Recommander
                            </Link>
                          </>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <div className="deux">
            <section className="feuille entree" style={entree(2)} aria-labelledby="titre-preparer">
              <div className="feuille-tete">
                <h2 className="feuille-titre" id="titre-preparer">
                  À préparer
                </h2>
                <Link className="lien-fleche" to="/admin/ventes">
                  Toutes les ventes
                </Link>
              </div>
              {donnees.aPreparer.length === 0 ? (
                <p className="vide-liste">Aucune commande à préparer.</p>
              ) : (
                <ul className="rangees">
                  {donnees.aPreparer.map((vente) => {
                    const articles = vente.lignes.reduce((somme, ligne) => somme + ligne.quantite, 0)
                    const visibles = vente.lignes.slice(0, vente.lignes.length > 3 ? 2 : 3)
                    return (
                      <li className="rangee rangee-pile" key={vente.id}>
                        <span className="pile">
                          {visibles.map((ligne) => {
                            const fiche = produitDe(ligne.produitId)
                            return <Vignette key={ligne.produitId} isbn={fiche?.isbn} type={fiche?.type} />
                          })}
                          {vente.lignes.length > visibles.length && (
                            <span className="pile-plus">{`+${vente.lignes.length - visibles.length}`}</span>
                          )}
                        </span>
                        <div>
                          <p className="rangee-titre">
                            <Link to="/admin/ventes">{vente.client.nom}</Link>
                          </p>
                          <p className="rangee-meta">
                            {`${majuscule(dateRelative(jourDe(vente.date), aujourdhui))}, ${heure(vente.date)}, ${pluriel(articles, 'article')}`}
                          </p>
                        </div>
                        <div className="rangee-fin">
                          {vente.emballageCadeau && (
                            <span className="etiquette">
                              <IconeAdmin nom="cadeau" epaisseur={1.7} />
                              Emballage
                            </span>
                          )}
                          <span className="fort">{formatXPF(vente.total)}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <div>
              <section className="feuille entree" style={entree(3)} aria-labelledby="titre-arrivages">
                <div className="feuille-tete">
                  <h2 className="feuille-titre" id="titre-arrivages">
                    Arrivages prévus
                  </h2>
                  <Link className="lien-fleche" to="/admin/commandes">
                    Commandes
                  </Link>
                </div>
                {donnees.arrivages.length === 0 ? (
                  <p className="vide-liste">Aucune commande fournisseur en cours.</p>
                ) : (
                  <ul className="rangees">
                    {donnees.arrivages.map((commande) => (
                      <li className="rangee" key={commande.id}>
                        <span className="date-tuile">
                          <strong>{numeroJour(commande.dateArriveePrevue)}</strong>
                          <span>{moisCourt(commande.dateArriveePrevue)}</span>
                        </span>
                        <div>
                          <p className="rangee-titre">{commande.designation}</p>
                          <p className="rangee-meta">
                            {`${commande.fournisseur.nom}, ${commande.quantiteCommandee - commande.quantiteRecue} attendus${
                              commande.quantiteRecue ? ` sur ${commande.quantiteCommandee}` : ''
                            }`}
                          </p>
                        </div>
                        <span
                          className={
                            commande.quantiteRecue ? 'statut statut-partielle' : 'statut statut-attente'
                          }
                        >
                          {dans(commande.dateArriveePrevue, aujourdhui)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="feuille entree" style={entree(4)} aria-labelledby="titre-mises">
                <div className="feuille-tete">
                  <h2 className="feuille-titre" id="titre-mises">
                    Mises de côté
                  </h2>
                  <Link className="lien-fleche" to="/admin/demandes">
                    Demandes
                  </Link>
                </div>
                {donnees.misesDeCote.length === 0 ? (
                  <p className="vide-liste">Aucune mise de côté en cours.</p>
                ) : (
                  <ul className="rangees">
                    {donnees.misesDeCote.map((demande) => {
                      const limite = demande.miseDeCote?.dateLimite ?? demande.date
                      const fiche = demande.produitId ? produitDe(demande.produitId) : undefined
                      const proche = ecartJours(aujourdhui, jourDe(limite)) <= 2
                      return (
                        <li className="rangee" key={demande.id}>
                          <Vignette key={fiche?.isbn} isbn={fiche?.isbn ?? demande.isbn} type={fiche?.type} />
                          <div>
                            <p className="rangee-titre">{demande.titre}</p>
                            <p className="rangee-meta">
                              {[demande.client?.nom, `gardé jusqu’au ${dateLongue(jourDe(limite))}`]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          </div>
                          <span className={proche ? 'statut statut-cote' : 'statut statut-attente'}>
                            {dans(jourDe(limite), aujourdhui)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </div>
          </div>

          {detail && (
            <section
              className="feuille entree detail-semaine"
              style={entree(5)}
              aria-labelledby="titre-detail"
              ref={detailSection}
            >
              <div className="feuille-tete">
                <h2 className="feuille-titre" id="titre-detail">
                  {jourChoisi ? `Détail du ${nomJour(jourChoisi)} ${dateLongue(jourChoisi)}` : 'Détail de la semaine'}
                </h2>
                {jourChoisi ? (
                  <button type="button" className="lien-fleche" onClick={() => setJourChoisi('')}>
                    Revenir à la semaine
                  </button>
                ) : (
                  <Link className="lien-fleche" to="/admin/rapports">
                    Voir le rapport complet
                  </Link>
                )}
                <p className="feuille-note">
                  Cliquez sur un jour du graphique pour voir ses ventes en détail.
                </p>
              </div>
              <div className="detail-semaine-corps">
                <dl className="tableau-bord-chiffres">
                  <div>
                    <dt>
                      <InfoBulle
                        libelle="Vente nette"
                        info="Montant des ventes moins celui des retours, sur la semaine ou le jour choisi. Les frais de livraison et d’emballage ne sont pas comptés."
                      />
                    </dt>
                    <dd>{formatXPF(detail.totaux.net)}</dd>
                  </div>
                  <div>
                    <dt>
                      <InfoBulle libelle="Articles vendus" info="Exemplaires vendus moins exemplaires rendus." />
                    </dt>
                    <dd>{detail.totaux.quantiteNette}</dd>
                  </div>
                  <div>
                    <dt>
                      <InfoBulle
                        libelle="Commandes"
                        info="Nombre de commandes passées en ligne par les clients."
                      />
                    </dt>
                    <dd>{detail.statistiques.nombreVentes}</dd>
                  </div>
                  <div>
                    <dt>
                      <InfoBulle
                        libelle="Panier moyen"
                        info="Montant moyen d’une commande : ventes brutes divisées par le nombre de commandes."
                      />
                    </dt>
                    <dd>{formatXPF(detail.statistiques.panierMoyen)}</dd>
                  </div>
                  <div>
                    <dt>
                      <InfoBulle
                        libelle="Retours"
                        info="Nombre de retours enregistrés, et en dessous le montant des articles rendus."
                      />
                    </dt>
                    <dd>
                      {detail.statistiques.nombreRetours}
                      <small>{`${formatXPF(detail.totaux.retours)} rendus`}</small>
                    </dd>
                  </div>
                </dl>
                <SuiviVentes
                  ref={suivi}
                  choix={courbe}
                  onChoix={choisirCourbe}
                  categories={donnees.categories.filter((categorie) =>
                    articlesVendus.some((produit) => produit.categorie === categorie.id),
                  )}
                  articles={articlesVendus}
                  ventes={ventesCourbe}
                  erreur={erreurCourbe}
                  jourMarque={jourChoisi}
                />
                <TableauVentesProduits
                  produits={detail.produits}
                  evolutions={evolutions}
                  selection={genreCourbe === 'produit' ? cibleCourbe : ''}
                  onSelection={choisirProduit}
                />
              </div>
            </section>
          )}
        </>
      )}
    </>
  )
}

export default TableauDeBordPage
