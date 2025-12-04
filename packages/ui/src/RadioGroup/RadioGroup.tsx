import * as React from 'react'
import { RadioGroup as BaseRadioGroup } from '@base-ui-components/react/radio-group'

export const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseRadioGroup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseRadioGroup
      ref={ref}
      className={`flex flex-col gap-2 ${className || ''}`}
      {...props}
    />
  )
})
RadioGroup.displayName = 'RadioGroup'
