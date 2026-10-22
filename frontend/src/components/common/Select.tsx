import { useId, type ReactNode, type SelectHTMLAttributes } from 'react'
import './common.css'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  children: ReactNode
}

export default function Select({
  label,
  error,
  id,
  className,
  children,
  'aria-describedby': describedBy,
  ...props
}: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = `${selectId}-error`
  const descriptionIds = [describedBy, error ? errorId : undefined]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <div className="common-input">
      <label className="common-input__label" htmlFor={selectId}>
        {label}
      </label>
      <select
        {...props}
        id={selectId}
        className={['common-input__field', className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={descriptionIds}
      >
        {children}
      </select>
      {error && (
        <span className="common-input__error" id={errorId}>
          {error}
        </span>
      )}
    </div>
  )
}
