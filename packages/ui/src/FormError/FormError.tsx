import { humanizeError } from '@symploke/api/errors'
import '@symploke/design/components/form-error.css'

export type FormErrorProps = {
  message: string
  className?: string
  /** If true, message will be displayed as-is without humanization */
  raw?: boolean
}

export function FormError({ message, className, raw = false }: FormErrorProps) {
  const displayMessage = raw ? message : humanizeError(message)

  return (
    <div className={`form-error ${className || ''}`}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="form-error__icon"
      >
        <title>Error</title>
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 4v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11" r="0.75" fill="currentColor" />
      </svg>
      <p className="form-error__message">{displayMessage}</p>
    </div>
  )
}
