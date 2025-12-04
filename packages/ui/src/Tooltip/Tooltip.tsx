import * as React from 'react'
import { Tooltip as BaseTooltip } from '@base-ui-components/react/tooltip'

const Root = BaseTooltip.Root

const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseTooltip.Trigger
      ref={ref}
      className={className}
      {...props}
    />
  )
})
Trigger.displayName = 'Tooltip.Trigger'

const Portal = BaseTooltip.Portal

const Positioner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Positioner> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseTooltip.Positioner
      ref={ref}
      className={`z-50 ${className || ''}`}
      {...props}
    />
  )
})
Positioner.displayName = 'Tooltip.Positioner'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseTooltip.Popup
      ref={ref}
      className={`z-50 overflow-hidden rounded-md border border-gray-200 bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 ${className || ''}`}
      {...props}
    />
  )
})
Popup.displayName = 'Tooltip.Popup'

const Arrow = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Arrow> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseTooltip.Arrow
      ref={ref}
      className={`fill-gray-900 ${className || ''}`}
      {...props}
    />
  )
})
Arrow.displayName = 'Tooltip.Arrow'

const Viewport = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Viewport> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseTooltip.Viewport
      ref={ref}
      className={className}
      {...props}
    />
  )
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
