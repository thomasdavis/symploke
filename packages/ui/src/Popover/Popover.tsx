import * as React from 'react'
import { Popover as BasePopover } from '@base-ui-components/react/popover'
import '@symploke/design/components/popover.css'

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
  const classes = ['popover-backdrop', className].filter(Boolean).join(' ')
  return (
    <BasePopover.Backdrop
      ref={ref}
      className={classes}
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
  const classes = ['popover-positioner', className].filter(Boolean).join(' ')
  return (
    <BasePopover.Positioner
      ref={ref}
      className={classes}
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
  const classes = ['popover-popup', className].filter(Boolean).join(' ')
  return (
    <BasePopover.Popup
      ref={ref}
      className={classes}
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
  const classes = ['popover-arrow', className].filter(Boolean).join(' ')
  return (
    <BasePopover.Arrow
      ref={ref}
      className={classes}
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
  const classes = ['popover-title', className].filter(Boolean).join(' ')
  return (
    <BasePopover.Title
      ref={ref}
      className={classes}
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
  const classes = ['popover-description', className].filter(Boolean).join(' ')
  return (
    <BasePopover.Description
      ref={ref}
      className={classes}
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
  const classes = ['popover-close', className].filter(Boolean).join(' ')
  return (
    <BasePopover.Close
      ref={ref}
      className={classes}
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
