import { ToggleGroup as BaseToggleGroup } from '@base-ui-components/react/toggle-group'
import * as React from 'react'
import '@symploke/design/components/toggle-group.css'

export interface ToggleGroupProps extends React.ComponentPropsWithoutRef<typeof BaseToggleGroup> {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ size = 'md', className, ...props }, ref) => {
    const classes = ['toggle-group', `toggle-group--${size}`, className].filter(Boolean).join(' ')
    return <BaseToggleGroup ref={ref} className={classes} {...props} />
  },
)
ToggleGroup.displayName = 'ToggleGroup'
