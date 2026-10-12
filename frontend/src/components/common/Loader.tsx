import './common.css'

interface LoaderProps {
  children?: string
}

export default function Loader({ children = 'Chargement…' }: LoaderProps) {
  return (
    <div className="common-loader" role="status">
      <span className="common-loader__spinner" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
