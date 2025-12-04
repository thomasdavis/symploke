import * as React from 'react'
import { Popover as BasePopover } from '@base-ui-components/react/popover'

const Root: typeof BasePopover.Root = BasePopover.Root

const Trigger: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof BasePopover.Trigger> & {
    className?: string
  } & React.RefAttributes<HTMLButtonElement>
> = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BasePopover.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BasePopover.Trigger
      ref={ref}
      className={className}
      {...props}
    />
  )
})
Trigger.displayName = 'Popover.Trigger'

const Portal: typeof BasePopover.Portal = BasePopover.Portal

const Backdrop = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BasePopover.Backdrop> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BasePopover.Backdrop
      ref={ref}
      className={`fixed inset-0 z-50 ${className || ''}`}
      {...props}
    />
  )
})
Backdrop.displayName = 'Popover.Backdrop'

const Positioner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BasePopover.Positioner> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BasePopover.Positioner
      ref={ref}
      className={`z-50 ${className || ''}`}
      {...props}
    />
  )
})
Positioner.displayName = 'Popover.Positioner'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BasePopover.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BasePopover.Popup
      ref={ref}
      className={`z-50 w-72 rounded-md border border-gray-200 bg-white p-4 text-gray-950 shadow-md outline-none data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 ${className || ''}`}
      {...props}
    />
  )
})
Popup.displayName = 'Popover.Popup'

const Arrow = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BasePopover.Arrow> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BasePopover.Arrow
      ref={ref}
      className={`fill-white ${className || ''}`}
      {...props}
    />
  )
})
Arrow.displayName = 'Popover.Arrow'

const Viewport = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BasePopover.Viewport> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BasePopover.Viewport
      ref={ref}
      className={className}
      {...props}
    />
  )
})
Viewport.displayName = 'Popover.Viewport'

const Title = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof BasePopover.Title> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BasePopover.Title
      ref={ref}
      className={`mb-2 font-semibold text-gray-950 ${className || ''}`}
      {...props}
    />
  )
})
Title.displayName = 'Popover.Title'

const Description = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof BasePopover.Description> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BasePopover.Description
      ref={ref}
      className={`text-sm text-gray-500 ${className || ''}`}
      {...props}
    />
  )
})
Description.displayName = 'Popover.Description'

const Close = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BasePopover.Close> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BasePopover.Close
      ref={ref}
      className={`absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none ${className || ''}`}
      {...props}
    />
  )
})
Close.displayName = 'Popover.Close'

export const Popover: {
  Root: typeof Root
  Trigger: typeof Trigger
  Portal: typeof Portal
  Backdrop: typeof Backdrop
  Positioner: typeof Positioner
  Popup: typeof Popup
  Arrow: typeof Arrow
  Viewport: typeof Viewport
  Title: typeof Title
  Description: typeof Description
  Close: typeof Close
  createHandle: typeof BasePopover.createHandle
} = {
  Root,
  Trigger,
  Portal,
  Backdrop,
  Positioner,
  Popup,
  Arrow,
  Viewport,
  Title,
  Description,
  Close,
  createHandle: BasePopover.createHandle,
}
