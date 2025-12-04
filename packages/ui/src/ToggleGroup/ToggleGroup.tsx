import * as React from 'react'
import { ToggleGroup as BaseToggleGroup } from '@base-ui-components/react/toggle-group'

export const ToggleGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseToggleGroup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseToggleGroup
      ref={ref}
      className={`inline-flex rounded-md shadow-sm ${className || ''}`}
      {...props}
    />
  )
})
ToggleGroup.displayName = 'ToggleGroup'
