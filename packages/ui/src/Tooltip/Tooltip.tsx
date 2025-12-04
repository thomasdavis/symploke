import * as React from 'react'
import { Tooltip as BaseTooltip } from '@base-ui-components/react/tooltip'
import '@symploke/design/components/tooltip.css'

const Root = BaseTooltip.Root

const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseTooltip.Trigger ref={ref} className={className} {...props} />
})
Trigger.displayName = 'Tooltip.Trigger'

const Portal = BaseTooltip.Portal

const Positioner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Positioner> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['tooltip__positioner', className].filter(Boolean).join(' ')
  return <BaseTooltip.Positioner ref={ref} className={classes} {...props} />
})
Positioner.displayName = 'Tooltip.Positioner'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['tooltip__popup', className].filter(Boolean).join(' ')
  return <BaseTooltip.Popup ref={ref} className={classes} {...props} />
})
Popup.displayName = 'Tooltip.Popup'

const Arrow = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Arrow> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['tooltip__arrow', className].filter(Boolean).join(' ')
  return <BaseTooltip.Arrow ref={ref} className={classes} {...props} />
})
Arrow.displayName = 'Tooltip.Arrow'

const Viewport = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Viewport> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseTooltip.Viewport ref={ref} className={className} {...props} />
})
Viewport.displayName = 'Tooltip.Viewport'

const Provider = BaseTooltip.Provider

export const Tooltip = {
  Root,
  Trigger,
  Portal,
  Positioner,
  Popup,
  Arrow,
  Viewport,
  Provider,
  createHandle: BaseTooltip.createHandle,
}
