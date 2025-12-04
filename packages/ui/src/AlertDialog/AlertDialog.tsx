import * as React from 'react'
import { AlertDialog as BaseAlertDialog } from '@base-ui-components/react/alert-dialog'

const Root = BaseAlertDialog.Root
const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseAlertDialog.Trigger ref={ref} className={className} {...props} />
})
Trigger.displayName = 'AlertDialog.Trigger'

const Portal = BaseAlertDialog.Portal

const Backdrop = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Backdrop> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAlertDialog.Backdrop
      ref={ref}
      className={`fixed inset-0 z-50 bg-black/80 data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 ${className || ''}`}
      {...props}
    />
  )
})
Backdrop.displayName = 'AlertDialog.Backdrop'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAlertDialog.Popup
      ref={ref}
      className={`fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg rounded-lg ${className || ''}`}
      {...props}
    />
  )
})
Popup.displayName = 'AlertDialog.Popup'

const Title = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Title> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAlertDialog.Title
      ref={ref}
      className={`text-lg font-semibold ${className || ''}`}
      {...props}
    />
  )
})
Title.displayName = 'AlertDialog.Title'

const Description = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Description> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAlertDialog.Description
      ref={ref}
      className={`text-sm text-gray-500 ${className || ''}`}
      {...props}
    />
  )
})
Description.displayName = 'AlertDialog.Description'

const Close = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Close> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAlertDialog.Close
      ref={ref}
      className={`inline-flex items-center justify-center px-4 py-2 rounded-md font-medium ${className || ''}`}
      {...props}
    />
  )
})
Close.displayName = 'AlertDialog.Close'

export const AlertDialog = {
  Root,
  Trigger,
  Portal,
  Backdrop,
  Popup,
  Title,
  Description,
  Close,
  createHandle: BaseAlertDialog.createHandle,
}
