import * as React from 'react'
import { PreviewCard as BasePreviewCard } from '@base-ui-components/react/preview-card'

const Root = BasePreviewCard.Root

const Trigger = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<typeof BasePreviewCard.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BasePreviewCard.Trigger
      ref={ref}
      className={className}
      {...props}
    />
  )
})
Trigger.displayName = 'PreviewCard.Trigger'

const Portal = BasePreviewCard.Portal

const Backdrop = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BasePreviewCard.Backdrop> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BasePreviewCard.Backdrop
      ref={ref}
      className={`fixed inset-0 z-50 ${className || ''}`}
      {...props}
    />
  )
})
Backdrop.displayName = 'PreviewCard.Backdrop'

const Positioner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BasePreviewCard.Positioner> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BasePreviewCard.Positioner
      ref={ref}
      className={`z-50 ${className || ''}`}
      {...props}
    />
  )
})
Positioner.displayName = 'PreviewCard.Positioner'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BasePreviewCard.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BasePreviewCard.Popup
      ref={ref}
      className={`z-50 w-64 rounded-md border border-gray-200 bg-white p-4 text-gray-950 shadow-md outline-none data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 ${className || ''}`}
      {...props}
    />
  )
})
Popup.displayName = 'PreviewCard.Popup'

const Arrow = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BasePreviewCard.Arrow> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BasePreviewCard.Arrow
      ref={ref}
      className={`fill-white ${className || ''}`}
      {...props}
    />
  )
})
Arrow.displayName = 'PreviewCard.Arrow'

export const PreviewCard = {
  Root,
  Trigger,
  Portal,
  Backdrop,
  Positioner,
  Popup,
  Arrow,
}
