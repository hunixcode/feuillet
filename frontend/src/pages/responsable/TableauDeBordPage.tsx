import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Loader from '../../components/common/Loader.tsx'
import type { PointVentes } from '../../components/responsable/CourbeVentes.tsx'
import GraphiqueVentes from '../../components/responsable/GraphiqueVentes.tsx'
import InfoBulle from '../../components/responsable/InfoBulle.tsx'
import SuiviVentes from '../../components/responsable/SuiviVentes.tsx'
import TableauVentesProduits from '../../components/responsable/TableauVentesProduits.tsx'
import { listerCategories } from '../../services/categorieService'
import { listerDemandes } from '../../services/demandeAdminService'
import { lireRapport } from '../../services/rapportService'
import {
  listerCommandesFournisseur,
  listerProduitsAReapprovisionner,
} from '../../services/reapproService'
import type { Categorie } from '../../types/categorie'
import type { Demande } from '../../types/demande'
import type { Rapport } from '../../types/rapport'
import type { CommandeFournisseur, ProduitAReapprovisionner } from '../../types/reappro'
import { messageErreur } from '../../utils/erreurs'
import { formatDate, formatJour, formatJourCourt, formatXPF, jourIso } from '../../utils/format'
import './TableauDeBordPage.css'

const UN_JOUR = 24 * 60 * 60 * 1000
const SEPT_JOURS = 7 * UN_JOUR

interface Donnees {
  aRecommander: ProduitAReapprovisionner[]
  arrivages: CommandeFournisseur[]
  misesDeCote: Demande[]
  rapport: Rapport
  jours: RapportDuJour[]
  categories: Categorie[]
}

interface RapportDuJour {
  jour: string
  rapport: Rapport
}

function pluriel(nombre: number, singulier: string, plurielTexte: string): string {
  return `${nombre} ${nombre > 1 ? plurielTexte : singulier}`
}

function exemplaires(nombre: number): string {
  return pluriel(nombre, 'exemplaire', 'exemplaires')
}

function joursDeLaSemaine(debut: string): string[] {
  const lundi = new Date(`${debut}T00:00:00.000Z`).getTime()
  return Array.from({ length: 7 }, (_, index) =>
    new Date(lundi + index * UN_JOUR).toISOString().slice(0, 10),
  )
}

async function rapportsParJour(debut: string, categorie = ''): Promise<RapportDuJour[]> {
  const jours = joursDeLaSemaine(debut)
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

function jourLong(jour: string): string {
  return formatJour(new Date(`${jour}T12:00:00.000Z`))
}

function TableauDeBordPage() {
  const [jour] = useState(() => formatJour(new Date()))
  const [donnees, setDonnees] = useState<Donnees | null>(null)
  const [erreur, setErreur] = useState('')
  const [jourChoisi, setJourChoisi] = useState('')
  const [courbe, setCourbe] = useState('')
  const [courbesCategorie, setCourbesCategorie] = useState<Record<string, PointVentes[]>>({})
  const [erreurCourbe, setErreurCourbe] = useState('')
  const suivi = useRef<HTMLElement>(null)

  useEffect(() => {
    let actif = true
    const semaineDerniere = jourIso(new Date(Date.now() - SEPT_JOURS))
    Promise.all([
      listerProduitsAReapprovisionner(),
      listerCommandesFournisseur(),
      listerDemandes('mise_de_cote'),
      listerCategories(),
      lireRapport({ semaine: semaineDerniere }).then(async (rapport) => ({
        rapport,
        jours: await rapportsParJour(rapport.periode.debut),
      })),
    ])
      .then(([aRecommander, commandes, demandes, categories, semaine]) => {
        if (actif) {
          setDonnees({
            aRecommander,
            arrivages: commandes
              .filter((commande) => commande.statut !== 'recue')
              .sort((a, b) => a.dateArriveePrevue.localeCompare(b.dateArriveePrevue)),
            misesDeCote: demandes.sort((a, b) =>
              (a.miseDeCote?.dateLimite ?? '').localeCompare(b.miseDeCote?.dateLimite ?? ''),
            ),
            categories,
            ...semaine,
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
  }, [])

  const detail =
    donnees?.jours.find((element) => element.jour === jourChoisi)?.rapport ?? donnees?.rapport

  function choisirCourbe(choix: string) {
    setCourbe(choix)
    setErreurCourbe('')
    const [genre, categorie] = choix.split(':')
    if (genre !== 'categorie' || !donnees || courbesCategorie[categorie]) {
      return
    }
    rapportsParJour(donnees.rapport.periode.debut, categorie)
      .then((jours) =>
        setCourbesCategorie((courbes) => ({ ...courbes, [categorie]: totauxParJour(jours) })),
      )
      .catch((probleme: unknown) => setErreurCourbe(messageErreur(probleme)))
  }

  function choisirProduit(produitId: string) {
    const choix = `produit:${produitId}`
    choisirCourbe(courbe === choix ? '' : choix)
    suivi.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
  }

  const evolutions: Record<string, PointVentes[]> = {}
  for (const produit of donnees?.rapport.produits ?? []) {
    evolutions[produit.produitId] =
      donnees?.jours.map(({ jour: date, rapport }) => {
        const ligne = rapport.produits.find((element) => element.produitId === produit.produitId)
        return { jour: date, quantite: ligne?.quantiteNette ?? 0, montant: ligne?.montantNet ?? 0 }
      }) ?? []
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
        : totauxParJour(donnees?.jours ?? [])

  return (
    <div className="tableau-bord">
      <title>Tableau de bord · Feuillet</title>
      <header className="tableau-bord-entete">
        <h1>Tableau de bord</h1>
        <p className="tableau-bord-jour">{jour}</p>
      </header>

      {erreur && <ErrorMessage>{erreur}</ErrorMessage>}
      {!erreur && !donnees && <Loader />}

      {donnees && (
        <>
          <div className="tableau-bord-colonnes">
            <section aria-labelledby="titre-recommander">
              <div className="tableau-bord-colonne-entete">
                <h2 id="titre-recommander">À recommander</h2>
                <span className="tableau-bord-compte">{donnees.aRecommander.length}</span>
              </div>
              {donnees.aRecommander.length === 0 ? (
                <p className="tableau-bord-vide">Aucun article sous son seuil d’alerte.</p>
              ) : (
                <>
                  <ul className="tableau-bord-liste">
                    {donnees.aRecommander.map((produit) => (
                      <li key={produit.produitId}>
                        <span>
                          {produit.designation}
                          <small>
                            {produit.quantiteVendable === 0
                              ? 'Épuisé'
                              : pluriel(produit.quantiteVendable, 'vendable', 'vendables')}
                            {produit.quantiteEnCommande > 0 &&
                              `, ${produit.quantiteEnCommande} en commande`}
                          </small>
                        </span>
                        <span
                          className={
                            produit.quantiteVendable === 0
                              ? 'tableau-bord-etat tableau-bord-etat--manque'
                              : 'tableau-bord-etat'
                          }
                        >
                          {produit.pourcentageVendu} % vendu
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="tableau-bord-note">Part vendue de la quantité achetée à l’origine</p>
                </>
              )}
              <div className="tableau-bord-liens">
                <Link className="tableau-bord-lien" to="/admin/stock">
                  Voir le stock
                </Link>
                <Link className="tableau-bord-lien" to="/admin/rapports">
                  Voir le réapprovisionnement
                </Link>
              </div>
            </section>

            <section aria-labelledby="titre-arrivages">
              <div className="tableau-bord-colonne-entete">
                <h2 id="titre-arrivages">Arrivages prévus</h2>
                <span className="tableau-bord-compte">{donnees.arrivages.length}</span>
              </div>
              {donnees.arrivages.length === 0 ? (
                <p className="tableau-bord-vide">Aucune commande fournisseur en cours.</p>
              ) : (
                <ul className="tableau-bord-liste">
                  {donnees.arrivages.map((commande) => (
                    <li key={commande.id}>
                      <span>
                        {commande.designation}
                        <small>
                          {commande.fournisseur.nom}, {commande.quantiteRecue} sur{' '}
                          {exemplaires(commande.quantiteCommandee)} reçus
                        </small>
                      </span>
                      <span className="tableau-bord-nombre">
                        {formatJourCourt(commande.dateArriveePrevue)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link className="tableau-bord-lien" to="/admin/commandes">
                Voir les commandes fournisseur
              </Link>
            </section>

            <section aria-labelledby="titre-mises">
              <div className="tableau-bord-colonne-entete">
                <h2 id="titre-mises">Mises de côté</h2>
                <span className="tableau-bord-compte">{donnees.misesDeCote.length}</span>
              </div>
              {donnees.misesDeCote.length === 0 ? (
                <p className="tableau-bord-vide">Aucune mise de côté en cours.</p>
              ) : (
                <ul className="tableau-bord-liste">
                  {donnees.misesDeCote.map((demande) => (
                    <li key={demande.id}>
                      <span>
                        {demande.titre}
                        <small>
                          {[
                            demande.client?.nom,
                            demande.miseDeCote && exemplaires(demande.miseDeCote.quantite),
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </small>
                      </span>
                      {demande.miseDeCote && (
                        <span className="tableau-bord-nombre">
                          {formatJourCourt(demande.miseDeCote.dateLimite)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <Link className="tableau-bord-lien" to="/admin/demandes">
                Voir les demandes
              </Link>
            </section>
          </div>

          <section className="tableau-bord-surface" aria-labelledby="titre-semaine">
            <div className="tableau-bord-titre-ligne">
              <h2 id="titre-semaine">Ventes de la semaine dernière</h2>
              <Link className="tableau-bord-lien" to="/admin/rapports">
                Voir le rapport complet
              </Link>
            </div>
            <p className="tableau-bord-aide">
              Du {formatDate(donnees.rapport.periode.debut)} au{' '}
              {formatDate(donnees.rapport.periode.fin)}
            </p>
            <GraphiqueVentes
              ventes={donnees.jours.map(({ jour: date, rapport }) => ({
                jour: date,
                net: rapport.totaux.net,
              }))}
              selection={jourChoisi}
              onSelection={setJourChoisi}
            />

            {detail && (
              <div className="tableau-bord-detail">
                <div className="tableau-bord-titre-ligne">
                  <h3>{jourChoisi ? `Détail du ${jourLong(jourChoisi)}` : 'Détail de la semaine'}</h3>
                  {jourChoisi && (
                    <button
                      type="button"
                      className="tableau-bord-lien"
                      onClick={() => setJourChoisi('')}
                    >
                      Revenir à la semaine
                    </button>
                  )}
                </div>
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
                      <InfoBulle
                        libelle="Articles vendus"
                        info="Exemplaires vendus moins exemplaires rendus."
                      />
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
                      <small>{formatXPF(detail.totaux.retours)} rendus</small>
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
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default TableauDeBordPage
