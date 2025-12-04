import * as React from 'react'
import { Fieldset as BaseFieldset } from '@base-ui-components/react/fieldset'

const Root = React.forwardRef<
  HTMLFieldSetElement,
  React.ComponentPropsWithoutRef<typeof BaseFieldset.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseFieldset.Root
      ref={ref}
      className={`space-y-4 border border-gray-200 p-4 rounded-md ${className || ''}`}
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
      className={`text-sm font-semibold ${className || ''}`}
      {...props}
    />
  )
})
Legend.displayName = 'Fieldset.Legend'

export const Fieldset = {
  Root,
  Legend,
}
