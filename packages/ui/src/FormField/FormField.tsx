import type * as React from 'react'
import '@symploke/design/components/field.css'

export type FormFieldProps = {
  label: string
  htmlFor: string
  children: React.ReactNode
  className?: string
}

export function FormField({ label, htmlFor, children, className }: FormFieldProps) {
  return (
    <div className={`field ${className || ''}`}>
      <label htmlFor={htmlFor} className="field__label">
        {label}
      </label>
      {children}
    </div>
  )
}
