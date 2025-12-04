import * as React from 'react'
import { Dialog as BaseDialog } from '@base-ui-components/react/dialog'

const Root = BaseDialog.Root

const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseDialog.Trigger ref={ref} className={className} {...props} />
})
Trigger.displayName = 'Dialog.Trigger'

const Portal = BaseDialog.Portal

const Backdrop = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Backdrop> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseDialog.Backdrop
      ref={ref}
      className={`fixed inset-0 z-50 bg-black/80 data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 ${className || ''}`}
      {...props}
    />
  )
})
Backdrop.displayName = 'Dialog.Backdrop'

const Viewport = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Viewport> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseDialog.Viewport
      ref={ref}
      className={`fixed inset-0 z-50 flex items-center justify-center ${className || ''}`}
      {...props}
    />
  )
})
Viewport.displayName = 'Dialog.Viewport'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseDialog.Popup
      ref={ref}
      className={`w-full max-w-lg gap-4 border bg-white p-6 shadow-lg rounded-lg data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 ${className || ''}`}
      {...props}
    />
  )
})
Popup.displayName = 'Dialog.Popup'

const Title = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Title> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseDialog.Title
      ref={ref}
      className={`text-lg font-semibold leading-none tracking-tight ${className || ''}`}
      {...props}
    />
  )
})
Title.displayName = 'Dialog.Title'

const Description = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Description> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseDialog.Description
      ref={ref}
      className={`text-sm text-gray-500 ${className || ''}`}
      {...props}
    />
  )
})
Description.displayName = 'Dialog.Description'

const Close = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Close> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseDialog.Close
      ref={ref}
      className={`absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none ${className || ''}`}
      {...props}
    />
  )
})
Close.displayName = 'Dialog.Close'

export const Dialog = {
  Root,
  Trigger,
  Portal,
  Backdrop,
  Viewport,
  Popup,
  Title,
  Description,
  Close,
  createHandle: BaseDialog.createHandle,
}
