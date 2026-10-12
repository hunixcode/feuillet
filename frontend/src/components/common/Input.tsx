import { useId, type InputHTMLAttributes } from 'react'
import './common.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export default function Input({
  label,
  error,
  id,
  className,
  'aria-describedby': describedBy,
  ...props
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const descriptionIds = [describedBy, error ? errorId : undefined]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <div className="common-input">
      <label className="common-input__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        className={['common-input__field', className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={descriptionIds}
      />
      {error && (
        <span className="common-input__error" id={errorId}>
          {error}
        </span>
      )}
    </div>
  )
}
