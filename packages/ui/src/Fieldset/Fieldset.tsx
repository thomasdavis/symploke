import * as React from 'react'
import { Fieldset as BaseFieldset } from '@base-ui-components/react/fieldset'
import '@symploke/design/src/components/fieldset.css'

const Root = React.forwardRef<
  HTMLFieldSetElement,
  React.ComponentPropsWithoutRef<typeof BaseFieldset.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseFieldset.Root
      ref={ref}
      className={`fieldset ${className || ''}`}
      {...props}
    />
  )
})
Root.displayName = 'Fieldset.Root'

const Legend = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseFieldset.Legend> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseFieldset.Legend
      ref={ref}
      className={`fieldset__legend ${className || ''}`}
      {...props}
    />
  )
})
Legend.displayName = 'Fieldset.Legend'

export const Fieldset = {
  Root,
  Legend,
}
