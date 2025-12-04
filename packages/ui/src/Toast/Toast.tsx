import * as React from 'react'
import { Toast as BaseToast } from '@base-ui-components/react/toast'
import '@symploke/design/components/toast.css'

const Provider: typeof BaseToast.Provider = BaseToast.Provider

const Portal: typeof BaseToast.Portal = BaseToast.Portal

const Viewport = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseToast.Viewport> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['toast__viewport', className].filter(Boolean).join(' ')
  return <BaseToast.Viewport ref={ref} className={classes} {...props} />
})
Viewport.displayName = 'Toast.Viewport'

const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseToast.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['toast', className].filter(Boolean).join(' ')
  return <BaseToast.Root ref={ref} className={classes} {...props} />
})
Root.displayName = 'Toast.Root'

const Content = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseToast.Content> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['toast__content', className].filter(Boolean).join(' ')
  return <BaseToast.Content ref={ref} className={classes} {...props} />
})
Content.displayName = 'Toast.Content'

const Title = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseToast.Title> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['toast__title', className].filter(Boolean).join(' ')
  return <BaseToast.Title ref={ref} className={classes} {...props} />
})
Title.displayName = 'Toast.Title'

const Description = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseToast.Description> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['toast__description', className].filter(Boolean).join(' ')
  return <BaseToast.Description ref={ref} className={classes} {...props} />
})
Description.displayName = 'Toast.Description'

const Action = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseToast.Action> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['toast__action', className].filter(Boolean).join(' ')
  return <BaseToast.Action ref={ref} className={classes} {...props} />
})
Action.displayName = 'Toast.Action'

const Close = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseToast.Close> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['toast__close', className].filter(Boolean).join(' ')
  return <BaseToast.Close ref={ref} className={classes} {...props} />
})
Close.displayName = 'Toast.Close'

const Positioner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseToast.Positioner> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseToast.Positioner ref={ref} className={className} {...props} />
})
Positioner.displayName = 'Toast.Positioner'

export const Toast: {
  Provider: typeof Provider
  Portal: typeof Portal
  Viewport: typeof Viewport
  Root: typeof Root
  Content: typeof Content
  Title: typeof Title
  Description: typeof Description
  Action: typeof Action
  Close: typeof Close
  Positioner: typeof Positioner
  useToastManager: typeof BaseToast.useToastManager
  createToastManager: typeof BaseToast.createToastManager
} = {
  Provider,
  Portal,
  Viewport,
  Root,
  Content,
  Title,
  Description,
  Action,
  Close,
  Positioner,
  useToastManager: BaseToast.useToastManager,
  createToastManager: BaseToast.createToastManager,
}
