import * as React from 'react'
import { CheckboxGroup as BaseCheckboxGroup } from '@base-ui-components/react/checkbox-group'

export const CheckboxGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseCheckboxGroup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseCheckboxGroup
      ref={ref}
      className={`flex flex-col gap-2 ${className || ''}`}
      {...props}
    />
  )
})
CheckboxGroup.displayName = 'CheckboxGroup'
