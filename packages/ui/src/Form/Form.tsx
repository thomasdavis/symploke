import * as React from 'react'
import { Form as BaseForm } from '@base-ui-components/react/form'

export const Form = React.forwardRef<
  HTMLFormElement,
  React.ComponentPropsWithoutRef<typeof BaseForm> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseForm
      ref={ref}
      className={`space-y-6 ${className || ''}`}
      {...props}
    />
  )
})
Form.displayName = 'Form'
