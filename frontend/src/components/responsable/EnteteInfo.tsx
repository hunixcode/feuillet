import InfoBulle from './InfoBulle.tsx'

interface EnteteInfoProps {
  libelle: string
  info: string
  className?: string
  aDroite?: boolean
}

function EnteteInfo({ libelle, info, className, aDroite }: EnteteInfoProps) {
  return (
    <th scope="col" className={className}>
      <InfoBulle libelle={libelle} info={info} aDroite={aDroite} />
    </th>
  )
}

export default EnteteInfo
