import { useEffect, useState, type FormEvent } from 'react'
import Button from '../../components/common/Button.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Input from '../../components/common/Input.tsx'
import Loader from '../../components/common/Loader.tsx'
import { enregistrerParametres, lireParametres } from '../../services/parametreService'
import type { CleParametre, Parametres } from '../../types/parametres'
import { erreursDesChamps, messageErreur } from '../../utils/erreurs'
import './ParametresPage.css'

const VALEUR_MAX = 1_000_000
const POURCENTAGE_MAX = 100

type Saisie = Record<CleParametre, string>

interface Champ {
  cle: CleParametre
  libelle: string
  unite: string
  aide: (valeur: string) => string
}

function exempleSeuil(valeur: string): string {
  const nombre = Number(valeur)
  return valeur.trim() && Number.isInteger(nombre) && nombre >= 1 && nombre <= POURCENTAGE_MAX ? valeur.trim() : '…'
}

const GROUPES: { titre: string; champs: Champ[] }[] = [
  {
    titre: 'Mises de côté',
    champs: [
      {
        cle: 'dureeMiseDeCoteJours',
        libelle: 'Durée d’une mise de côté',
        unite: 'jours',
        aide: () =>
          'Quand un article demandé par un client arrive, il lui est réservé pendant cette durée. Ensuite, il redevient vendable à tous.',
      },
    ],
  },
  {
    titre: 'Retours',
    champs: [
      {
        cle: 'delaiRetourJours',
        libelle: 'Délai de retour',
        unite: 'jours',
        aide: () => 'Nombre de jours après l’achat pendant lesquels le client peut renvoyer un article.',
      },
      {
        cle: 'delaiRetourCadeauJours',
        libelle: 'Délai de retour d’un cadeau',
        unite: 'jours',
        aide: () =>
          'Remplace le délai normal pour une commande passée pour une occasion : Noël, anniversaire ou fête.',
      },
    ],
  },
  {
    titre: 'Frais',
    champs: [
      {
        cle: 'fraisEmballage',
        libelle: 'Emballage cadeau',
        unite: 'XPF',
        aide: () =>
          'Ajouté au total quand le client choisit l’emballage cadeau. Il n’est pas remboursé lors d’un retour.',
      },
      {
        cle: 'fraisLivraison',
        libelle: 'Livraison',
        unite: 'XPF',
        aide: () => 'Ajoutée au total de chaque commande. Elle n’est pas remboursée lors d’un retour.',
      },
    ],
  },
  {
    titre: 'Réapprovisionnement',
    champs: [
      {
        cle: 'seuilAlerteDefaut',
        libelle: 'Seuil d’alerte par défaut',
        unite: '%',
        aide: (valeur) =>
          `Un article passe « à recommander » quand il en reste ce pourcentage ou moins de la quantité achetée à la dernière commande. Exemple : sur 100 exemplaires achetés, l’alerte se déclenche à ${exempleSeuil(valeur)} restants. S’applique aux articles qui n’ont pas leur propre seuil.`,
      },
    ],
  },
]

const CLES = GROUPES.flatMap((groupe) => groupe.champs.map((champ) => champ.cle))

function enSaisie(parametres: Parametres): Saisie {
  return Object.fromEntries(CLES.map((cle) => [cle, String(parametres[cle])])) as Saisie
}

function verifier(saisie: Saisie): Partial<Record<CleParametre, string>> {
  const erreurs: Partial<Record<CleParametre, string>> = {}
  for (const cle of CLES) {
    const maximum = cle === 'seuilAlerteDefaut' ? POURCENTAGE_MAX : VALEUR_MAX
    const valeur = Number(saisie[cle])
    if (!saisie[cle].trim() || !Number.isInteger(valeur) || valeur < 1 || valeur > maximum) {
      erreurs[cle] = `La valeur doit être un nombre entier entre 1 et ${maximum.toLocaleString('fr-FR')}.`
    }
  }
  return erreurs
}

function ParametresPage() {
  const [enregistres, setEnregistres] = useState<Parametres | null>(null)
  const [saisie, setSaisie] = useState<Saisie | null>(null)
  const [erreurChargement, setErreurChargement] = useState('')
  const [erreurs, setErreurs] = useState<Partial<Record<CleParametre, string>>>({})
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState('')
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    let actif = true
    lireParametres()
      .then((parametres) => {
        if (actif) {
          setEnregistres(parametres)
          setSaisie(enSaisie(parametres))
        }
      })
      .catch((probleme: unknown) => {
        if (actif) {
          setErreurChargement(messageErreur(probleme))
        }
      })
    return () => {
      actif = false
    }
  }, [])

  const modifie = Boolean(
    enregistres && saisie && CLES.some((cle) => saisie[cle].trim() !== String(enregistres[cle])),
  )

  function changer(cle: CleParametre, valeur: string) {
    setSaisie((precedente) => (precedente ? { ...precedente, [cle]: valeur } : precedente))
    setSucces('')
  }

  function annuler() {
    if (enregistres) {
      setSaisie(enSaisie(enregistres))
    }
    setErreurs({})
    setErreur('')
  }

  async function enregistrer(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    if (!saisie) {
      return
    }
    const verification = verifier(saisie)
    setErreurs(verification)
    setErreur('')
    setSucces('')
    if (Object.keys(verification).length > 0) {
      return
    }
    setEnvoi(true)
    try {
      const parametres = await enregistrerParametres(
        Object.fromEntries(CLES.map((cle) => [cle, Number(saisie[cle])])) as unknown as Parametres,
      )
      setEnregistres(parametres)
      setSaisie(enSaisie(parametres))
      setSucces('Paramètres enregistrés.')
    } catch (probleme) {
      const champs = erreursDesChamps(probleme)
      if (Object.keys(champs).length > 0) {
        setErreurs(champs)
      } else {
        setErreur(messageErreur(probleme))
      }
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="parametres-page">
      <title>Paramètres · Feuillet</title>
      <header className="parametres-entete">
        <h1>Paramètres</h1>
        <p>Les règles de la librairie : durées, délais, frais et seuil d’alerte.</p>
      </header>

      {erreurChargement && <ErrorMessage>{erreurChargement}</ErrorMessage>}
      {!saisie && !erreurChargement && <Loader />}

      {saisie && (
        <form className="parametres-formulaire" onSubmit={enregistrer} noValidate>
          {GROUPES.map((groupe, rang) => (
            <section key={groupe.titre} className="parametres-surface" aria-labelledby={`groupe-${rang}`}>
              <h2 id={`groupe-${rang}`}>{groupe.titre}</h2>
              {groupe.champs.map((champ) => (
                <div key={champ.cle} className="parametres-champ">
                  <div className="parametres-saisie">
                    <Input
                      label={`${champ.libelle} (${champ.unite})`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={champ.cle === 'seuilAlerteDefaut' ? POURCENTAGE_MAX : VALEUR_MAX}
                      value={saisie[champ.cle]}
                      error={erreurs[champ.cle]}
                      aria-describedby={`aide-${champ.cle}`}
                      onChange={(evenement) => changer(champ.cle, evenement.target.value)}
                    />
                  </div>
                  <p className="parametres-aide" id={`aide-${champ.cle}`}>
                    {champ.aide(saisie[champ.cle])}
                  </p>
                </div>
              ))}
            </section>
          ))}

          <div className="parametres-barre">
            {erreur && <ErrorMessage>{erreur}</ErrorMessage>}
            {succes && (
              <p className="parametres-succes" role="status">
                {succes}
              </p>
            )}
            <div className="parametres-actions">
              <Button type="submit" loading={envoi} disabled={!modifie}>
                Enregistrer
              </Button>
              {modifie && (
                <Button type="button" variant="secondary" onClick={annuler} disabled={envoi}>
                  Annuler les changements
                </Button>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

export default ParametresPage
