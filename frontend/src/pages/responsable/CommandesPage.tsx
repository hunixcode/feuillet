import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Segment from '../../components/client/Segment.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Loader from '../../components/common/Loader.tsx'
import FicheFournisseur from '../../components/responsable/FicheFournisseur.tsx'
import FormulaireCommandeFournisseur from '../../components/responsable/FormulaireCommandeFournisseur.tsx'
import IconeAdmin from '../../components/responsable/IconeAdmin.tsx'
import PanneauCommandeFournisseur from '../../components/responsable/PanneauCommandeFournisseur.tsx'
import { StatutCommande } from '../../components/responsable/StatutCommande.tsx'
import Vignette from '../../components/responsable/Vignette.tsx'
import { enRetard, restantARecevoir } from '../../components/responsable/libelles'
import { listerDemandes } from '../../services/demandeAdminService'
import { listerProduits } from '../../services/produitService'
import { listerCommandesFournisseur, listerFournisseurs } from '../../services/reapproService'
import type { Demande } from '../../types/demande'
import type { Produit } from '../../types/produit'
import type { CommandeFournisseur, Fournisseur } from '../../types/reappro'
import { dans, dateCourte, dateLongue, jourDe } from '../../utils/datesAdmin'
import { messageErreur } from '../../utils/erreurs'
import { useOuverture } from '../../utils/ouvertureAdmin'
import { jourIso } from '../../utils/format'

type Vue = 'attendues' | 'recues' | 'toutes' | 'fournisseurs'

type Panneau =
  | { mode: 'nouvelle' }
  | { mode: 'commande'; commande: CommandeFournisseur }
  | { mode: 'fournisseur'; fournisseur?: Fournisseur }

function exemplaires(nombre: number): string {
  return `${nombre} exemplaire${nombre > 1 ? 's' : ''}`
}

function libellePanneau(panneau: Panneau): string {
  if (panneau.mode === 'nouvelle') return 'Nouvelle commande'
  if (panneau.mode === 'commande') return 'Commande choisie'
  return panneau.fournisseur ? 'Fournisseur choisi' : 'Nouveau fournisseur'
}

function CommandesPage() {
  const [aujourdhui] = useState(() => jourIso(new Date()))
  const [vue, setVue] = useState<Vue>('attendues')
  const [fournisseurFiltre, setFournisseurFiltre] = useState('')
  const [commandes, setCommandes] = useState<CommandeFournisseur[] | null>(null)
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [produits, setProduits] = useState<Produit[]>([])
  const [demandes, setDemandes] = useState<Demande[]>([])
  const [erreur, setErreur] = useState('')
  const [panneau, setPanneau] = useState<Panneau | null>(null)
  const [annonce, setAnnonce] = useState('')
  const [version, setVersion] = useState(0)
  const refFermer = useRef<HTMLButtonElement>(null)

  const [aOuvrir, setAOuvrir] = useState<string | null>(null)

  const rafraichir = useCallback(() => setVersion((precedente) => precedente + 1), [])

  useOuverture(['fournisseur', 'nouvelle-commande'], (ouverture) => {
    if (ouverture.cible === 'nouvelle-commande') {
      ouvrir({ mode: 'nouvelle' })
    } else {
      setAOuvrir(ouverture.id ?? null)
    }
  })

  if (aOuvrir && commandes) {
    const fournisseur = fournisseurs.find((element) => element.id === aOuvrir)
    setAOuvrir(null)
    if (fournisseur) {
      setVue('fournisseurs')
      setPanneau({ mode: 'fournisseur', fournisseur })
    }
  }

  useEffect(() => {
    let actif = true
    listerProduits()
      .then((liste) => {
        if (actif) {
          setProduits(liste)
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

  useEffect(() => {
    let actif = true
    Promise.all([listerFournisseurs(), listerCommandesFournisseur()])
      .then(([listeFournisseurs, listeCommandes]) => {
        if (actif) {
          setFournisseurs(listeFournisseurs)
          setCommandes(listeCommandes)
          setErreur('')
        }
      })
      .catch((probleme: unknown) => {
        if (actif) {
          setErreur(messageErreur(probleme))
        }
      })
    listerDemandes('en_attente')
      .then((liste) => {
        if (actif) {
          setDemandes(liste)
        }
      })
      .catch(() => {
        if (actif) {
          setDemandes([])
        }
      })
    return () => {
      actif = false
    }
  }, [version])

  useEffect(() => {
    if (!annonce) {
      return
    }
    const minuteur = window.setTimeout(() => setAnnonce(''), 4000)
    return () => window.clearTimeout(minuteur)
  }, [annonce])

  const cle = panneau
    ? `${panneau.mode}-${panneau.mode === 'commande' ? panneau.commande.id : panneau.mode === 'fournisseur' ? (panneau.fournisseur?.id ?? '') : ''}`
    : ''

  useEffect(() => {
    if (!cle) {
      return
    }
    refFermer.current?.focus({ preventScroll: true })
    function echap(evenement: globalThis.KeyboardEvent) {
      if (evenement.key === 'Escape') {
        setPanneau(null)
      }
    }
    document.addEventListener('keydown', echap)
    return () => document.removeEventListener('keydown', echap)
  }, [cle])

  function ouvrir(nouveau: Panneau) {
    setAnnonce('')
    setPanneau(nouveau)
  }

  function clavier(evenement: KeyboardEvent<HTMLTableRowElement>, action: () => void) {
    if (evenement.target === evenement.currentTarget && (evenement.key === 'Enter' || evenement.key === ' ')) {
      evenement.preventDefault()
      action()
    }
  }

  function creee(commande: CommandeFournisseur) {
    setAnnonce(`Commande passée : ${commande.quantiteCommandee} × ${commande.designation} chez ${commande.fournisseur.nom}.`)
    setPanneau({ mode: 'commande', commande })
    rafraichir()
  }

  function fournisseurEnregistre(fournisseur: Fournisseur, message: string) {
    setAnnonce(message)
    setPanneau({ mode: 'fournisseur', fournisseur })
    rafraichir()
  }

  const toutes = (commandes ?? []).filter(
    (commande) => !fournisseurFiltre || commande.fournisseur.id === fournisseurFiltre,
  )
  const attendues = toutes
    .filter((commande) => commande.statut !== 'recue')
    .sort((a, b) => a.dateArriveePrevue.localeCompare(b.dateArriveePrevue))
  const recues = toutes.filter((commande) => commande.statut === 'recue')
  const affichees = vue === 'attendues' ? attendues : vue === 'recues' ? recues : toutes
  const produitDe = (id: string) => produits.find((produit) => produit.id === id)
  const commandeChoisie =
    panneau?.mode === 'commande'
      ? (commandes?.find((commande) => commande.id === panneau.commande.id) ?? panneau.commande)
      : undefined

  return (
    <>
      <title>Fournisseurs, commandes et réceptions · Feuillet</title>
      <header className="tete">
        <div>
          <h1>Fournisseurs, commandes et réceptions</h1>
          <p>Ce qui a été commandé, ce qui est arrivé, ce qui reste attendu.</p>
        </div>
        <div className="tete-actions">
          <button
            className="bouton bouton-petit bouton-contour"
            type="button"
            onClick={() => ouvrir({ mode: 'fournisseur' })}
          >
            Nouveau fournisseur
          </button>
          <button className="bouton bouton-petit" type="button" onClick={() => ouvrir({ mode: 'nouvelle' })}>
            <IconeAdmin nom="plus" epaisseur={2} />
            Nouvelle commande
          </button>
        </div>
      </header>

      {erreur && <ErrorMessage>{erreur}</ErrorMessage>}

      <section className="feuille" aria-label="Commandes fournisseur">
        <div className="outils">
          <Segment
            libelle="Commandes affichées"
            valeur={vue}
            onChange={(valeur) => setVue(valeur as Vue)}
            options={[
              { valeur: 'attendues', libelle: 'Attendues', compte: attendues.length },
              { valeur: 'recues', libelle: 'Reçues', compte: recues.length },
              { valeur: 'toutes', libelle: 'Toutes', compte: toutes.length },
              { valeur: 'fournisseurs', libelle: 'Fournisseurs', compte: fournisseurs.length },
            ]}
          />
          {vue !== 'fournisseurs' && (
            <select
              className="choix-liste"
              aria-label="Fournisseur"
              value={fournisseurFiltre}
              onChange={(evenement) => setFournisseurFiltre(evenement.target.value)}
            >
              <option value="">Tous les fournisseurs</option>
              {fournisseurs.map((fournisseur) => (
                <option key={fournisseur.id} value={fournisseur.id}>
                  {fournisseur.nom}
                </option>
              ))}
            </select>
          )}
          <p className="outils-droite">
            {`${exemplaires(attendues.reduce((total, commande) => total + restantARecevoir(commande), 0))} attendus`}
          </p>
        </div>

        {!commandes && !erreur && <Loader />}

        {commandes && vue !== 'fournisseurs' && affichees.length > 0 && (
          <table className="liste">
            <thead>
              <tr>
                <th scope="col">Article</th>
                <th scope="col" className="optionnel">
                  Fournisseur
                </th>
                <th scope="col" className="optionnel-large">
                  Commandée
                </th>
                <th scope="col">Arrivée prévue</th>
                <th
                  scope="col"
                  className="optionnel"
                  data-bulle-titre="Reçu"
                  data-bulle-texte="Exemplaires reçus en bon état et validés, sur la quantité commandée."
                >
                  Reçu
                </th>
                <th scope="col">Statut</th>
                <th scope="col" className="chevron">
                  <span hidden>Ouvrir</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {affichees.map((commande) => {
                const produit = produitDe(commande.produitId)
                const restant = restantARecevoir(commande)
                const retard = enRetard(commande, aujourdhui)
                const part = Math.round((commande.quantiteRecue / Math.max(1, commande.quantiteCommandee)) * 100)
                return (
                  <tr
                    key={commande.id}
                    tabIndex={0}
                    className={commandeChoisie?.id === commande.id ? 'selectionnee' : undefined}
                    onClick={() => ouvrir({ mode: 'commande', commande })}
                    onKeyDown={(evenement) => clavier(evenement, () => ouvrir({ mode: 'commande', commande }))}
                  >
                    <td>
                      <span className="article">
                        <Vignette key={produit?.isbn} isbn={produit?.isbn} type={produit?.type} />
                        <span>
                          <span className="article-titre">{commande.designation}</span>
                          <span className="article-meta">{exemplaires(commande.quantiteCommandee)}</span>
                        </span>
                      </span>
                    </td>
                    <td className="optionnel">{commande.fournisseur.nom}</td>
                    <td className="optionnel-large gris">{dateCourte(jourDe(commande.date))}</td>
                    <td>
                      <span className="article-titre" style={{ fontWeight: 500 }}>
                        {dateCourte(commande.dateArriveePrevue)}
                      </span>
                      <span className="article-meta">
                        {restant ? (retard ? 'En retard' : dans(commande.dateArriveePrevue, aujourdhui)) : 'Arrivée'}
                      </span>
                    </td>
                    <td className="optionnel">
                      <span className="progression">
                        <span>{`${commande.quantiteRecue} sur ${commande.quantiteCommandee}`}</span>
                        <span className="jauge">
                          <span style={{ width: `${Math.max(2, Math.min(100, part))}%` }} />
                        </span>
                      </span>
                    </td>
                    <td>
                      <StatutCommande commande={commande} />
                    </td>
                    <td className="chevron">
                      <IconeAdmin nom="chevron" epaisseur={2} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {commandes && vue !== 'fournisseurs' && affichees.length === 0 && (
          <p className="vide-liste">
            {vue === 'attendues' ? 'Rien n’est attendu : toutes les commandes sont reçues.' : 'Aucune commande ici.'}
          </p>
        )}

        {commandes && vue === 'fournisseurs' && fournisseurs.length > 0 && (
          <table className="liste">
            <thead>
              <tr>
                <th scope="col">Fournisseur</th>
                <th scope="col" className="optionnel">
                  Contact
                </th>
                <th scope="col" className="num">
                  En cours
                </th>
                <th scope="col" className="optionnel">
                  Dernière commande
                </th>
                <th scope="col" className="chevron">
                  <span hidden>Ouvrir</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {fournisseurs.map((fournisseur) => {
                const siennes = (commandes ?? []).filter((commande) => commande.fournisseur.id === fournisseur.id)
                const derniere = siennes.map((commande) => jourDe(commande.date)).sort().pop()
                return (
                  <tr
                    key={fournisseur.id}
                    tabIndex={0}
                    onClick={() => ouvrir({ mode: 'fournisseur', fournisseur })}
                    onKeyDown={(evenement) => clavier(evenement, () => ouvrir({ mode: 'fournisseur', fournisseur }))}
                  >
                    <td>
                      <span className="article-titre">{fournisseur.nom}</span>
                    </td>
                    <td className="optionnel gris">{fournisseur.contact || 'Non renseigné'}</td>
                    <td className="num">{siennes.filter((commande) => commande.statut !== 'recue').length}</td>
                    <td className="optionnel gris">{derniere ? dateLongue(derniere) : 'Aucune'}</td>
                    <td className="chevron">
                      <IconeAdmin nom="chevron" epaisseur={2} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {commandes && vue === 'fournisseurs' && fournisseurs.length === 0 && (
          <p className="vide-liste">Aucun fournisseur enregistré pour l’instant.</p>
        )}
      </section>

      <div className={annonce ? 'message-admin visible' : 'message-admin'} role="status" aria-live="polite">
        <IconeAdmin nom="coche" epaisseur={3} />
        <span>{annonce}</span>
      </div>

      {panneau && (
        <>
          <div className="tiroir-fond ouvert" aria-hidden="true" onClick={() => setPanneau(null)} />
          <aside className="tiroir ouvert" aria-label={libellePanneau(panneau)}>
            <div className="tiroir-barre">
              <span>
                {commandeChoisie
                  ? `Commande du ${dateLongue(jourDe(commandeChoisie.date))}, ${commandeChoisie.fournisseur.nom}`
                  : panneau.mode === 'fournisseur'
                    ? 'Fournisseur'
                    : 'Nouvelle commande'}
              </span>
              <button
                ref={refFermer}
                className="bouton-fermer"
                type="button"
                aria-label="Fermer le volet"
                onClick={() => setPanneau(null)}
              >
                Fermer
              </button>
            </div>
            {panneau.mode === 'nouvelle' && (
              <FormulaireCommandeFournisseur
                fournisseurs={fournisseurs}
                produits={produits}
                aujourdhui={aujourdhui}
                onCreee={creee}
                onAnnuler={() => setPanneau(null)}
              />
            )}
            {commandeChoisie && (
              <PanneauCommandeFournisseur
                key={commandeChoisie.id}
                commande={commandeChoisie}
                aujourdhui={aujourdhui}
                produit={produitDe(commandeChoisie.produitId)}
                demandes={demandes.filter((demande) => demande.produitId === commandeChoisie.produitId)}
                onChangement={(commande) => {
                  if (commande) {
                    setPanneau({ mode: 'commande', commande })
                  }
                  rafraichir()
                }}
              />
            )}
            {panneau.mode === 'fournisseur' && (
              <FicheFournisseur
                key={panneau.fournisseur?.id ?? 'nouveau'}
                fournisseur={panneau.fournisseur}
                commandes={commandes ?? []}
                produits={new Map(produits.map((produit) => [produit.id, produit]))}
                onEnregistre={fournisseurEnregistre}
              />
            )}
          </aside>
        </>
      )}
    </>
  )
}

export default CommandesPage
