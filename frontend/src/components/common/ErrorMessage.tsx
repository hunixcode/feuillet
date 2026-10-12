import './common.css'

interface ErrorMessageProps {
  children: string
  className?: string
}

export default function ErrorMessage({
  children,
  className,
}: ErrorMessageProps) {
  return (
    <p
      className={['common-error', className].filter(Boolean).join(' ')}
      role="alert"
    >
      {children}
    </p>
  )
}
