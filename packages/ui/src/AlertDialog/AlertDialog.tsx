import * as React from 'react'
import { AlertDialog as BaseAlertDialog } from '@base-ui-components/react/alert-dialog'
import '@symploke/design/components/alert-dialog.css'

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
  const classes = ['alert-dialog__backdrop', className].filter(Boolean).join(' ')
  return <BaseAlertDialog.Backdrop ref={ref} className={classes} {...props} />
})
Backdrop.displayName = 'AlertDialog.Backdrop'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['alert-dialog__popup', className].filter(Boolean).join(' ')
  return <BaseAlertDialog.Popup ref={ref} className={classes} {...props} />
})
Popup.displayName = 'AlertDialog.Popup'

const Title = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Title> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['alert-dialog__title', className].filter(Boolean).join(' ')
  return <BaseAlertDialog.Title ref={ref} className={classes} {...props} />
})
Title.displayName = 'AlertDialog.Title'

const Description = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Description> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['alert-dialog__description', className].filter(Boolean).join(' ')
  return <BaseAlertDialog.Description ref={ref} className={classes} {...props} />
})
Description.displayName = 'AlertDialog.Description'

const Close = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Close> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['alert-dialog__close', className].filter(Boolean).join(' ')
  return <BaseAlertDialog.Close ref={ref} className={classes} {...props} />
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
