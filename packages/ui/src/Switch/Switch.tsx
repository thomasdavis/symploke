import * as React from 'react'
import { Switch as BaseSwitch } from '@base-ui-components/react/switch'
import '@symploke/design/components/switch.css'

const Root = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseSwitch.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSwitch.Root
      ref={ref}
      className={`switch-root ${className || ''}`}
      {...props}
    />
  )
})
Root.displayName = 'Switch.Root'

const Thumb = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseSwitch.Thumb> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSwitch.Thumb
      ref={ref}
      className={`switch-thumb ${className || ''}`}
      {...props}
    />
  )
})
Thumb.displayName = 'Switch.Thumb'

export const Switch = {
  Root,
  Thumb,
}
