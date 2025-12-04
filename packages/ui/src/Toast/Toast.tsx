import * as React from 'react'
import { Toast as BaseToast } from '@base-ui-components/react/toast'

const Provider: typeof BaseToast.Provider = BaseToast.Provider

const Portal: typeof BaseToast.Portal = BaseToast.Portal

const Viewport = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseToast.Viewport> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseToast.Viewport
      ref={ref}
      className={`fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] ${className || ''}`}
      {...props}
    />
  )
})
Viewport.displayName = 'Toast.Viewport'

const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseToast.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseToast.Root
      ref={ref}
      className={`group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border border-gray-200 p-6 pr-8 shadow-lg transition-all data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-80 data-[open]:slide-in-from-top-full data-[open]:sm:slide-in-from-bottom-full ${className || ''}`}
      {...props}
    />
  )
})
Root.displayName = 'Toast.Root'

const Content = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseToast.Content> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseToast.Content
      ref={ref}
      className={`flex-1 ${className || ''}`}
      {...props}
    />
  )
})
Content.displayName = 'Toast.Content'

const Title = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseToast.Title> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseToast.Title
      ref={ref}
      className={`text-sm font-semibold ${className || ''}`}
      {...props}
    />
  )
})
Title.displayName = 'Toast.Title'

const Description = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseToast.Description> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseToast.Description
      ref={ref}
      className={`text-sm opacity-90 ${className || ''}`}
      {...props}
    />
  )
})
Description.displayName = 'Toast.Description'

const Action = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseToast.Action> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseToast.Action
      ref={ref}
      className={`inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-transparent px-3 text-sm font-medium ring-offset-white transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
Action.displayName = 'Toast.Action'

const Close = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseToast.Close> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseToast.Close
      ref={ref}
      className={`absolute right-2 top-2 rounded-md p-1 text-gray-950/50 opacity-0 transition-opacity hover:text-gray-950 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 ${className || ''}`}
      {...props}
    />
  )
})
Close.displayName = 'Toast.Close'

const Positioner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseToast.Positioner> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseToast.Positioner
      ref={ref}
      className={className}
      {...props}
    />
  )
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
