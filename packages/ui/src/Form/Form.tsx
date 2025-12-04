import * as React from 'react'
import { Form as BaseForm } from '@base-ui-components/react/form'
import '@symploke/design/src/components/form.css'

export const Form = React.forwardRef<
  HTMLFormElement,
  React.ComponentPropsWithoutRef<typeof BaseForm> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseForm
      ref={ref}
      className={`form ${className || ''}`}
      {...props}
    />
  )
})
Form.displayName = 'Form'
