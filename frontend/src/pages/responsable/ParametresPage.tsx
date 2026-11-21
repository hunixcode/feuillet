import { useEffect, useState, type FormEvent } from 'react'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Loader from '../../components/common/Loader.tsx'
import IconeAdmin from '../../components/responsable/IconeAdmin.tsx'
import { creerCategorie, listerProduits, supprimerCategorie } from '../../services/catalogueAdminService'
import { listerCategories } from '../../services/categorieService'
import { enregistrerParametres, lireParametres } from '../../services/parametreService'
import type { Categorie } from '../../types/categorie'
import type { CleParametre, Parametres } from '../../types/parametres'
import type { Produit } from '../../types/produit'
import { erreursDesChamps, messageErreur } from '../../utils/erreurs'

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

const CHAMPS: Champ[] = [
  {
    cle: 'dureeMiseDeCoteJours',
    libelle: 'Durée d’une mise de côté',
    unite: 'jours',
    aide: () =>
      'Quand un article demandé par un client arrive, il lui est réservé pendant cette durée. Ensuite, il redevient vendable à tous.',
  },
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
    aide: () => 'Remplace le délai normal pour une commande passée pour une occasion : Noël, anniversaire ou fête.',
  },
  {
    cle: 'fraisEmballage',
    libelle: 'Emballage cadeau',
    unite: 'XPF',
    aide: () => 'Ajouté au total quand le client choisit l’emballage cadeau. Il n’est pas remboursé lors d’un retour.',
  },
  {
    cle: 'fraisLivraison',
    libelle: 'Livraison',
    unite: 'XPF',
    aide: () => 'Ajoutée au total de chaque commande. Elle n’est pas remboursée lors d’un retour.',
  },
  {
    cle: 'seuilAlerteDefaut',
    libelle: 'Seuil d’alerte par défaut',
    unite: '%',
    aide: (valeur) =>
      `Un article passe « à recommander » quand il en reste ce pourcentage ou moins de la quantité achetée à la dernière commande. Exemple : sur 100 exemplaires achetés, l’alerte se déclenche à ${exempleSeuil(valeur)} restants. S’applique aux articles qui n’ont pas leur propre seuil.`,
  },
]

const CLES = CHAMPS.map((champ) => champ.cle)

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

function pluriel(valeur: number, mot: string): string {
  return `${valeur} ${mot}${valeur > 1 ? 's' : ''}`
}

function Categories({ onAnnonce }: { onAnnonce: (texte: string) => void }) {
  const [categories, setCategories] = useState<Categorie[] | null>(null)
  const [produits, setProduits] = useState<Produit[]>([])
  const [nouvelle, setNouvelle] = useState('')
  const [erreurChamp, setErreurChamp] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let actif = true
    listerCategories()
      .then((liste) => {
        if (actif) {
          setCategories(liste)
        }
      })
      .catch((probleme: unknown) => {
        if (actif) {
          setErreur(messageErreur(probleme))
        }
      })
    Promise.all([listerProduits(), listerProduits({ archive: true })])
      .then(([actifs, archives]) => {
        if (actif) {
          setProduits([...actifs, ...archives])
        }
      })
      .catch(() => {})
    return () => {
      actif = false
    }
  }, [version])

  async function ajouter(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    setErreurChamp('')
    setErreur('')
    if (!nouvelle.trim()) {
      setErreurChamp('Donnez un nom à la catégorie.')
      return
    }
    setEnvoi(true)
    try {
      const creee = await creerCategorie(nouvelle.trim())
      setNouvelle('')
      onAnnonce(`Catégorie « ${creee.libelle} » ajoutée.`)
      setVersion((precedente) => precedente + 1)
    } catch (probleme) {
      const champs = erreursDesChamps(probleme)
      if (champs.libelle) {
        setErreurChamp(champs.libelle)
      } else {
        setErreur(messageErreur(probleme))
      }
    } finally {
      setEnvoi(false)
    }
  }

  async function supprimer(categorie: Categorie) {
    setErreur('')
    try {
      await supprimerCategorie(categorie.id)
      onAnnonce(`Catégorie « ${categorie.libelle} » supprimée.`)
      setVersion((precedente) => precedente + 1)
    } catch (probleme) {
      setErreur(messageErreur(probleme))
    }
  }

  return (
    <section className="feuille" aria-labelledby="titre-categories">
      <div className="feuille-tete">
        <h2 className="feuille-titre" id="titre-categories">
          Catégories
        </h2>
        <p className="feuille-note">Elles rangent le catalogue et orientent les clients.</p>
      </div>
      <div className="feuille-corps">
        {erreur && <ErrorMessage>{erreur}</ErrorMessage>}
        {!categories && !erreur && <Loader />}
        {categories && (
          <ul className="categories">
            {categories.map((categorie) => {
              const nombre = produits.filter((produit) => produit.categorie === categorie.id).length
              return (
                <li key={categorie.id}>
                  <strong style={{ fontWeight: 600 }}>{categorie.libelle}</strong>
                  <span>{nombre ? pluriel(nombre, 'article') : 'Vide'}</span>
                  {nombre ? (
                    <span
                      data-bulle-titre="Utilisée"
                      data-bulle-texte="Une catégorie utilisée par un article ne peut pas être supprimée."
                    >
                      Utilisée
                    </span>
                  ) : (
                    <button
                      className="action-ligne"
                      type="button"
                      aria-label={`Supprimer ${categorie.libelle}`}
                      onClick={() => supprimer(categorie)}
                    >
                      Supprimer
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <form className="ajout-ligne" onSubmit={ajouter} noValidate>
          <input
            placeholder="Nouvelle catégorie"
            aria-label="Nouvelle catégorie"
            value={nouvelle}
            aria-invalid={erreurChamp ? true : undefined}
            aria-describedby={erreurChamp ? 'erreur-categorie' : undefined}
            onChange={(evenement) => setNouvelle(evenement.target.value)}
          />
          <button className="bouton bouton-petit" type="submit" disabled={envoi}>
            Ajouter
          </button>
        </form>
        {erreurChamp && (
          <p className="champ-erreur" id="erreur-categorie" style={{ marginTop: 8 }}>
            {erreurChamp}
          </p>
        )}
      </div>
    </section>
  )
}

function ParametresPage() {
  const [enregistres, setEnregistres] = useState<Parametres | null>(null)
  const [saisie, setSaisie] = useState<Saisie | null>(null)
  const [erreurChargement, setErreurChargement] = useState('')
  const [erreurs, setErreurs] = useState<Partial<Record<CleParametre, string>>>({})
  const [erreur, setErreur] = useState('')
  const [annonce, setAnnonce] = useState('')
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

  useEffect(() => {
    if (!annonce) {
      return
    }
    const minuteur = window.setTimeout(() => setAnnonce(''), 4000)
    return () => window.clearTimeout(minuteur)
  }, [annonce])

  const modifies = enregistres && saisie ? CLES.filter((cle) => saisie[cle].trim() !== String(enregistres[cle])) : []
  const modifie = modifies.length > 0
  const valide = saisie ? Object.keys(verifier(saisie)).length === 0 : false

  function changer(cle: CleParametre, valeur: string) {
    setSaisie((precedente) => (precedente ? { ...precedente, [cle]: valeur } : precedente))
    setAnnonce('')
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
    setAnnonce('')
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
      setAnnonce('Paramètres enregistrés.')
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
    <>
      <title>Paramètres · Feuillet</title>
      <header className="tete">
        <div>
          <h1>Paramètres</h1>
          <p>Les règles de la librairie. Une modification vaut pour les prochaines commandes et demandes.</p>
        </div>
      </header>

      {erreurChargement && <ErrorMessage>{erreurChargement}</ErrorMessage>}

      <div className="deux">
        <form className="feuille" id="reglages" onSubmit={enregistrer} noValidate aria-labelledby="titre-regles">
          <div className="feuille-tete">
            <h2 className="feuille-titre" id="titre-regles">
              Règles
            </h2>
          </div>
          <div className="feuille-corps">
            {erreur && <ErrorMessage>{erreur}</ErrorMessage>}
            {!saisie && !erreurChargement && <Loader />}
            {saisie &&
              CHAMPS.map((champ) => {
                const erreurChamp = erreurs[champ.cle]
                return (
                  <div key={champ.cle} className={erreurChamp ? 'reglage erreur' : 'reglage'}>
                    <div>
                      <label htmlFor={`r-${champ.cle}`}>{champ.libelle}</label>
                      <p id={`aide-${champ.cle}`}>{champ.aide(saisie[champ.cle])}</p>
                    </div>
                    <span className="unite">
                      <input
                        id={`r-${champ.cle}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={champ.cle === 'seuilAlerteDefaut' ? POURCENTAGE_MAX : VALEUR_MAX}
                        aria-label={`${champ.libelle} (${champ.unite})`}
                        aria-invalid={erreurChamp ? true : undefined}
                        aria-describedby={[`aide-${champ.cle}`, erreurChamp ? `erreur-${champ.cle}` : '']
                          .filter(Boolean)
                          .join(' ')}
                        value={saisie[champ.cle]}
                        onChange={(evenement) => changer(champ.cle, evenement.target.value)}
                      />
                      <span>{champ.unite}</span>
                    </span>
                    {erreurChamp && (
                      <p className="champ-erreur" id={`erreur-${champ.cle}`}>
                        {erreurChamp}
                      </p>
                    )}
                  </div>
                )
              })}
          </div>
        </form>

        <Categories onAnnonce={setAnnonce} />
      </div>

      {saisie && (
        <section className={modifie ? 'barre-enregistrer visible' : 'barre-enregistrer'} aria-label="Modifications">
          <span>
            {!modifie
              ? 'Aucune modification'
              : valide
                ? `${pluriel(modifies.length, 'réglage')} modifié${modifies.length > 1 ? 's' : ''}`
                : 'Corrigez les valeurs signalées'}
          </span>
          <span style={{ display: 'flex', gap: 8 }}>
            {modifie && (
              <button
                className="bouton bouton-petit"
                type="button"
                aria-label="Annuler les changements"
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.3)', color: 'inherit' }}
                disabled={envoi}
                onClick={annuler}
              >
                Annuler
              </button>
            )}
            <button
              className="bouton bouton-petit bouton-blanc"
              type="submit"
              form="reglages"
              disabled={!modifie || envoi}
              aria-busy={envoi || undefined}
            >
              Enregistrer
            </button>
          </span>
        </section>
      )}

      {annonce && (
        <div className="message-admin visible" role="status">
          <IconeAdmin nom="coche" epaisseur={3} />
          <span>{annonce}</span>
        </div>
      )}
    </>
  )
}

export default ParametresPage
