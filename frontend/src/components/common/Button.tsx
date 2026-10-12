import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './common.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  loading?: boolean
  children: ReactNode
}

export default function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = ['common-button', `common-button--${variant}`, className]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      {...props}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <span className="common-button__spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}
