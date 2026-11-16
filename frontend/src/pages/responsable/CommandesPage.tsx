import { useCallback, useEffect, useRef, useState } from 'react'
import Button from '../../components/common/Button.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Loader from '../../components/common/Loader.tsx'
import Select from '../../components/common/Select.tsx'
import FormulaireCommandeFournisseur from '../../components/responsable/FormulaireCommandeFournisseur.tsx'
import GestionFournisseurs from '../../components/responsable/GestionFournisseurs.tsx'
import PanneauCommandeFournisseur from '../../components/responsable/PanneauCommandeFournisseur.tsx'
import TableauCommandesFournisseur from '../../components/responsable/TableauCommandesFournisseur.tsx'
import { listerProduits } from '../../services/produitService'
import { listerCommandesFournisseur, listerFournisseurs } from '../../services/reapproService'
import type { Produit } from '../../types/produit'
import type { CommandeFournisseur, Fournisseur, StatutCommandeFournisseur } from '../../types/reappro'
import { messageErreur } from '../../utils/erreurs'
import { jourIso } from '../../utils/format'
import './CommandesPage.css'

type FiltreStatut = 'a-recevoir' | 'toutes' | StatutCommandeFournisseur

type Panneau = { mode: 'nouvelle' } | { mode: 'commande'; commande: CommandeFournisseur }

function CommandesPage() {
  const [aujourdhui] = useState(() => jourIso(new Date()))
  const [filtre, setFiltre] = useState<FiltreStatut>('a-recevoir')
  const [fournisseurFiltre, setFournisseurFiltre] = useState('')
  const [commandes, setCommandes] = useState<CommandeFournisseur[] | null>(null)
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [produits, setProduits] = useState<Produit[]>([])
  const [erreur, setErreur] = useState('')
  const [panneau, setPanneau] = useState<Panneau | null>(null)
  const [message, setMessage] = useState('')
  const [version, setVersion] = useState(0)
  const [versionFournisseurs, setVersionFournisseurs] = useState(0)
  const refFermer = useRef<HTMLButtonElement>(null)

  const rafraichir = useCallback(() => setVersion((precedente) => precedente + 1), [])

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
    listerFournisseurs()
      .then((liste) => {
        if (actif) {
          setFournisseurs(liste)
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
  }, [versionFournisseurs])

  useEffect(() => {
    let actif = true
    const statut = filtre === 'a-recevoir' || filtre === 'toutes' ? '' : filtre
    listerCommandesFournisseur({ statut, fournisseurId: fournisseurFiltre })
      .then((liste) => {
        if (actif) {
          setCommandes(liste)
          setErreur('')
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
  }, [filtre, fournisseurFiltre, version, versionFournisseurs])

  const ouvert = panneau !== null

  useEffect(() => {
    if (!ouvert) {
      return
    }
    refFermer.current?.focus()
    function echap(evenement: KeyboardEvent) {
      if (evenement.key === 'Escape') {
        setPanneau(null)
        setMessage('')
      }
    }
    document.addEventListener('keydown', echap)
    return () => document.removeEventListener('keydown', echap)
  }, [ouvert])

  function fermer() {
    setPanneau(null)
    setMessage('')
  }

  const affichees =
    filtre === 'a-recevoir'
      ? (commandes ?? [])
          .filter((commande) => commande.statut !== 'recue')
          .sort((a, b) => a.dateArriveePrevue.localeCompare(b.dateArriveePrevue))
      : (commandes ?? [])

  const commandeChoisie =
    panneau?.mode === 'commande'
      ? (commandes?.find((commande) => commande.id === panneau.commande.id) ?? panneau.commande)
      : undefined

  function creee(commande: CommandeFournisseur) {
    setMessage(
      `Commande passée : ${commande.quantiteCommandee} × ${commande.designation} chez ${commande.fournisseur.nom}.`,
    )
    setPanneau({ mode: 'commande', commande })
    rafraichir()
  }

  return (
    <div className="commandes-page">
      <title>Fournisseurs, commandes et réceptions · Feuillet</title>
      <header className="commandes-entete">
        <div>
          <h1>Fournisseurs, commandes et réceptions</h1>
          <p>
            Suivez les articles commandés jusqu’à leur arrivée. Le stock n’augmente qu’à la
            validation d’une réception.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setMessage('')
            setPanneau({ mode: 'nouvelle' })
          }}
        >
          Nouvelle commande
        </Button>
      </header>

      {erreur && <ErrorMessage>{erreur}</ErrorMessage>}

      <section className="commandes-surface" aria-labelledby="titre-commandes">
        <div className="commandes-titre-ligne">
          <h2 id="titre-commandes">
            {filtre === 'a-recevoir' ? 'Encore attendues' : 'Commandes fournisseur'}
            {commandes && <span className="commandes-compte">{affichees.length}</span>}
          </h2>
        </div>
        <div className="commandes-filtres">
          <Select
            label="Statut"
            value={filtre}
            onChange={(evenement) => setFiltre(evenement.target.value as FiltreStatut)}
          >
            <option value="a-recevoir">À recevoir (en cours ou partielles)</option>
            <option value="en_cours">En cours</option>
            <option value="partiellement_recue">Partiellement reçues</option>
            <option value="recue">Reçues</option>
            <option value="toutes">Toutes</option>
          </Select>
          <Select
            label="Fournisseur"
            value={fournisseurFiltre}
            onChange={(evenement) => setFournisseurFiltre(evenement.target.value)}
          >
            <option value="">Tous les fournisseurs</option>
            {fournisseurs.map((fournisseur) => (
              <option key={fournisseur.id} value={fournisseur.id}>
                {fournisseur.nom}
              </option>
            ))}
          </Select>
        </div>
        {filtre === 'a-recevoir' && (
          <p className="commandes-aide">Classées par date d’arrivée prévue, la plus proche en premier.</p>
        )}
        {!commandes && !erreur && <Loader />}
        {commandes && affichees.length === 0 && (
          <p className="commandes-aide">
            {filtre === 'a-recevoir'
              ? 'Rien n’est attendu : toutes les commandes sont reçues.'
              : 'Aucune commande ne correspond.'}
          </p>
        )}
        {affichees.length > 0 && (
          <TableauCommandesFournisseur
            commandes={affichees}
            aujourdhui={aujourdhui}
            selection={commandeChoisie?.id}
            onSelection={(commande) => {
              setMessage('')
              setPanneau({ mode: 'commande', commande })
            }}
          />
        )}
      </section>

      {panneau && (
        <>
          <div className="commandes-voile" aria-hidden="true" onClick={fermer} />
          <aside
            className="commandes-panneau"
            aria-label={panneau.mode === 'nouvelle' ? 'Nouvelle commande' : 'Commande choisie'}
          >
            <button
              ref={refFermer}
              type="button"
              className="commandes-fermer"
              aria-label="Fermer le panneau"
              onClick={fermer}
            >
              ×
            </button>
            {message && (
              <p className="commandes-succes" role="status">
                {message}
              </p>
            )}
            {panneau.mode === 'nouvelle' && (
              <FormulaireCommandeFournisseur
                fournisseurs={fournisseurs}
                produits={produits}
                aujourdhui={aujourdhui}
                onCreee={creee}
                onAnnuler={fermer}
              />
            )}
            {commandeChoisie && (
              <PanneauCommandeFournisseur
                key={commandeChoisie.id}
                commande={commandeChoisie}
                aujourdhui={aujourdhui}
                onChangement={(commande) => {
                  if (commande) {
                    setPanneau({ mode: 'commande', commande })
                  }
                  rafraichir()
                }}
              />
            )}
          </aside>
        </>
      )}

      <section className="commandes-surface" aria-labelledby="titre-fournisseurs">
        <h2 id="titre-fournisseurs">Fournisseurs</h2>
        <GestionFournisseurs
          fournisseurs={fournisseurs}
          onEnregistre={() => setVersionFournisseurs((precedente) => precedente + 1)}
        />
      </section>
    </div>
  )
}

export default CommandesPage
