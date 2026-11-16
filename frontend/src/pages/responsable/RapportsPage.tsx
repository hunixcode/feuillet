import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/common/Button.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Input from '../../components/common/Input.tsx'
import Loader from '../../components/common/Loader.tsx'
import Select from '../../components/common/Select.tsx'
import InfoBulle from '../../components/responsable/InfoBulle.tsx'
import TableauRapport from '../../components/responsable/TableauRapport.tsx'
import TableauReapprovisionnement from '../../components/responsable/TableauReapprovisionnement.tsx'
import { listerCategories } from '../../services/categorieService'
import { exporterRapport, lireRapport, type FiltresRapport } from '../../services/rapportService'
import { listerProduitsAReapprovisionner } from '../../services/reapproService'
import type { Categorie } from '../../types/categorie'
import type { Rapport } from '../../types/rapport'
import type { ProduitAReapprovisionner } from '../../types/reappro'
import { messageErreur } from '../../utils/erreurs'
import { formatDate, formatXPF, jourIso } from '../../utils/format'
import './RapportsPage.css'

type Mode = 'semaine' | 'periode'

interface ErreursFiltres {
  jour?: string
  debut?: string
  fin?: string
}

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

function RapportsPage() {
  const [aujourdhui] = useState(() => jourIso(new Date()))
  const [categories, setCategories] = useState<Categorie[]>([])
  const [aRecommander, setARecommander] = useState<ProduitAReapprovisionner[] | null>(null)
  const [erreurRecommander, setErreurRecommander] = useState('')

  const [mode, setMode] = useState<Mode>('semaine')
  const [jour, setJour] = useState(aujourdhui)
  const [debut, setDebut] = useState('')
  const [fin, setFin] = useState('')
  const [categorie, setCategorie] = useState('')
  const [erreursFiltres, setErreursFiltres] = useState<ErreursFiltres>({})
  const [filtres, setFiltres] = useState<FiltresRapport>({ semaine: aujourdhui })

  const [rapport, setRapport] = useState<Rapport | null>(null)
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
        if (actif) {
          setRapport(resultat)
        }
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
  }, [filtres])

  function appliquer(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    const erreurs: ErreursFiltres = {}
    if (mode === 'semaine' && !jour) {
      erreurs.jour = 'Choisissez un jour de la semaine voulue.'
    }
    if (mode === 'periode') {
      if (!debut) {
        erreurs.debut = 'Choisissez la date de début.'
      }
      if (!fin) {
        erreurs.fin = 'Choisissez la date de fin.'
      } else if (debut && fin < debut) {
        erreurs.fin = 'La date de fin doit être après la date de début.'
      }
    }
    setErreursFiltres(erreurs)
    if (Object.keys(erreurs).length > 0) {
      return
    }
    setChargement(true)
    setErreurRapport('')
    setFiltres(
      mode === 'semaine' ? { semaine: jour, categorie } : { debut, fin, categorie },
    )
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

  const categorieAffichee = categories.find((element) => element.id === filtres.categorie)
  const produits =
    rapport?.produits.filter(
      (produit) => toutAfficher || produit.quantiteVendue > 0 || produit.quantiteRetournee > 0,
    ) ?? []

  return (
    <div className="rapports-page">
      <title>Réapprovisionnement et rapports · Feuillet</title>
      <header className="rapports-entete">
        <h1>Réapprovisionnement et rapports</h1>
        <p>
          Les articles à recommander et l’activité de la librairie sur la semaine ou la période de
          votre choix.
        </p>
      </header>

      <section className="rapports-surface" aria-labelledby="titre-recommander">
        <div className="rapports-titre-ligne">
          <h2 id="titre-recommander">
            À recommander
            {aRecommander && <span className="rapports-compte">{aRecommander.length}</span>}
          </h2>
          <Link className="rapports-lien" to="/admin/commandes">
            Passer une commande fournisseur
          </Link>
        </div>
        <p className="rapports-aide">
          Articles dont le stock vendable est passé sous leur seuil d’alerte. « Déjà vendu » est la
          part de la quantité achetée à l’origine qui n’est plus vendable.
        </p>
        {erreurRecommander && <ErrorMessage>{erreurRecommander}</ErrorMessage>}
        {!erreurRecommander && !aRecommander && <Loader />}
        {aRecommander && <TableauReapprovisionnement produits={aRecommander} />}
      </section>

      <section className="rapports-surface" aria-labelledby="titre-rapport">
        <div className="rapports-titre-ligne">
          <h2 id="titre-rapport">Rapport d’activité</h2>
          <Button
            type="button"
            variant="secondary"
            loading={exportEnCours}
            disabled={!rapport}
            onClick={exporter}
          >
            Exporter en CSV
          </Button>
        </div>
        {erreurExport && <ErrorMessage>{erreurExport}</ErrorMessage>}

        <form className="rapports-filtres" onSubmit={appliquer} noValidate>
          <fieldset className="rapports-mode">
            <legend>Période</legend>
            <label>
              <input
                type="radio"
                name="mode"
                checked={mode === 'semaine'}
                onChange={() => setMode('semaine')}
              />
              Une semaine
            </label>
            <label>
              <input
                type="radio"
                name="mode"
                checked={mode === 'periode'}
                onChange={() => setMode('periode')}
              />
              Période libre
            </label>
          </fieldset>
          {mode === 'semaine' ? (
            <Input
              label="Un jour de la semaine"
              type="date"
              value={jour}
              error={erreursFiltres.jour}
              onChange={(evenement) => setJour(evenement.target.value)}
            />
          ) : (
            <>
              <Input
                label="Du"
                type="date"
                value={debut}
                error={erreursFiltres.debut}
                onChange={(evenement) => setDebut(evenement.target.value)}
              />
              <Input
                label="Au"
                type="date"
                value={fin}
                error={erreursFiltres.fin}
                onChange={(evenement) => setFin(evenement.target.value)}
              />
            </>
          )}
          <Select
            label="Catégorie"
            value={categorie}
            onChange={(evenement) => setCategorie(evenement.target.value)}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((element) => (
              <option key={element.id} value={element.id}>
                {element.libelle}
              </option>
            ))}
          </Select>
          <Button type="submit" className="rapports-valider">
            Afficher
          </Button>
        </form>

        {erreurRapport && <ErrorMessage>{erreurRapport}</ErrorMessage>}
        {chargement && <Loader />}

        {rapport && !chargement && (
          <>
            <p className="rapports-periode">
              Du {formatDate(rapport.periode.debut)} au {formatDate(rapport.periode.fin)}
              {categorieAffichee ? `, catégorie ${categorieAffichee.libelle}` : ', toutes catégories'}
            </p>

            <div className="rapports-stats">
              <section aria-labelledby="titre-ventes">
                <h3 id="titre-ventes">Ventes</h3>
                <dl>
                  <div>
                    <dt>
                      <InfoBulle
                        libelle="Ventes brutes"
                        info="Montant TTC des articles vendus sur la période, sans les frais d’emballage cadeau ni de livraison."
                      />
                    </dt>
                    <dd>{formatXPF(rapport.totaux.ventesBrutes)}</dd>
                  </div>
                  <div>
                    <dt>
                      <InfoBulle
                        libelle="Articles vendus"
                        info="Exemplaires vendus sur la période, avant les retours."
                      />
                    </dt>
                    <dd>{rapport.totaux.quantiteVendue}</dd>
                  </div>
                  <div>
                    <dt>
                      <InfoBulle
                        libelle="Commandes"
                        info="Nombre de commandes passées en ligne sur la période."
                      />
                    </dt>
                    <dd>{rapport.statistiques.nombreVentes}</dd>
                  </div>
                  <div>
                    <dt>
                      <InfoBulle
                        libelle="Panier moyen"
                        info="Montant moyen d’une commande : montant des articles divisé par le nombre de commandes."
                      />
                    </dt>
                    <dd>{formatXPF(rapport.statistiques.panierMoyen)}</dd>
                  </div>
                </dl>
              </section>
              <section aria-labelledby="titre-retours">
                <h3 id="titre-retours">Retours</h3>
                <dl>
                  <div>
                    <dt>
                      <InfoBulle
                        libelle="Montant des retours"
                        info="Valeur des articles remboursés ou échangés sur la période. Les remplacements de défectueux n’en font pas partie."
                      />
                    </dt>
                    <dd>{formatXPF(rapport.totaux.retours)}</dd>
                  </div>
                  <div>
                    <dt>
                      <InfoBulle
                        libelle="Articles retournés"
                        info="Exemplaires rapportés par les clients sur la période."
                      />
                    </dt>
                    <dd>{rapport.totaux.quantiteRetournee}</dd>
                  </div>
                  <div>
                    <dt>
                      <InfoBulle
                        libelle="Retours enregistrés"
                        info="Nombre de retours traités sur la période. Un retour peut concerner plusieurs exemplaires."
                      />
                    </dt>
                    <dd>{rapport.statistiques.nombreRetours}</dd>
                  </div>
                </dl>
              </section>
              <section className="rapports-stats-net" aria-labelledby="titre-net">
                <h3 id="titre-net">Net</h3>
                <dl>
                  <div>
                    <dt>
                      <InfoBulle
                        libelle="Vente nette"
                        info="Ventes brutes moins montant des retours : ce que la librairie a vraiment encaissé sur les articles."
                      />
                    </dt>
                    <dd>{formatXPF(rapport.totaux.net)}</dd>
                  </div>
                  <div>
                    <dt>
                      <InfoBulle
                        libelle="Articles nets"
                        info="Articles vendus moins articles retournés."
                      />
                    </dt>
                    <dd>{rapport.totaux.quantiteNette}</dd>
                  </div>
                </dl>
              </section>
            </div>

            <div className="rapports-titre-ligne">
              <h3>Détail par article</h3>
              <label className="rapports-case">
                <input
                  type="checkbox"
                  checked={toutAfficher}
                  onChange={(evenement) => setToutAfficher(evenement.target.checked)}
                />
                Afficher aussi les articles sans vente ni retour
              </label>
            </div>
            <TableauRapport produits={produits} categories={categories} />
          </>
        )}
      </section>
    </div>
  )
}

export default RapportsPage
