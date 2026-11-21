import { useId, type InputHTMLAttributes } from 'react'

interface ChampProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  aide?: string
  large?: boolean
}

export default function Champ({ label, error, aide, large = false, id, ...props }: ChampProps) {
  const genere = useId()
  const champId = id ?? genere
  const aideId = aide ? `${champId}-aide` : undefined
  const erreurId = error ? `${champId}-erreur` : undefined
  const decrit = [aideId, erreurId].filter(Boolean).join(' ') || undefined

  return (
    <div className={large ? 'champ large' : 'champ'}>
      <label htmlFor={champId}>{label}</label>
      <input
        {...props}
        id={champId}
        aria-invalid={error ? true : undefined}
        aria-describedby={decrit}
      />
      {aide && <small id={aideId}>{aide}</small>}
      {error && (
        <span className="champ-erreur" id={erreurId}>
          {error}
        </span>
      )}
    </div>
  )
}
