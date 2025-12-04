import * as React from 'react'
import { RadioGroup as BaseRadioGroup } from '@base-ui-components/react/radio-group'
import '@symploke/design/src/components/radio-group.css'

export const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseRadioGroup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseRadioGroup
      ref={ref}
      className={`radio-group ${className || ''}`}
      {...props}
    />
  )
})
RadioGroup.displayName = 'RadioGroup'
