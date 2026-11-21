import { formatXPF } from '../../utils/format'

export default function Prix({ montant }: { montant: number }) {
  return (
    <>
      {formatXPF(montant).replace(/ XPF$/, '')} <span className="devise">XPF</span>
    </>
  )
}
