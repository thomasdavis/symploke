import { Toggle as BaseToggle } from '@base-ui-components/react/toggle'
import * as React from 'react'
import '@symploke/design/components/toggle.css'

export interface ToggleProps extends React.ComponentPropsWithoutRef<typeof BaseToggle> {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ size = 'md', className, ...props }, ref) => {
    const classes = ['toggle', `toggle--${size}`, className].filter(Boolean).join(' ')
    return <BaseToggle ref={ref} className={classes} {...props} />
  },
)
Toggle.displayName = 'Toggle'
