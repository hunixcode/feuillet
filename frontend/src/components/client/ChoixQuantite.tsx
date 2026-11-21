interface ChoixQuantiteProps {
  valeur: number
  onChange: (quantite: number) => void
  libelle: string
  petit?: boolean
}

export default function ChoixQuantite({
  valeur,
  onChange,
  libelle,
  petit = false,
}: ChoixQuantiteProps) {
  function saisir(texte: string) {
    const quantite = Number(texte)
    if (Number.isSafeInteger(quantite) && quantite >= 1) {
      onChange(quantite)
    }
  }

  return (
    <div className={petit ? 'compteur compteur-petit' : 'compteur'}>
      <button
        type="button"
        aria-label="Retirer un exemplaire"
        disabled={valeur <= 1}
        onClick={() => onChange(valeur - 1)}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={libelle}
        value={valeur}
        onChange={(evenement) => saisir(evenement.target.value)}
      />
      <button type="button" aria-label="Ajouter un exemplaire" onClick={() => onChange(valeur + 1)}>
        +
      </button>
    </div>
  )
}
