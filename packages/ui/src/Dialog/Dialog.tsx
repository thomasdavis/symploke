import { Dialog as BaseDialog } from '@base-ui-components/react/dialog'
import * as React from 'react'
import '@symploke/design/components/dialog.css'

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
  const classes = ['dialog-backdrop', className].filter(Boolean).join(' ')
  return <BaseDialog.Backdrop ref={ref} className={classes} {...props} />
})
Backdrop.displayName = 'Dialog.Backdrop'

const Viewport = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Viewport> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['dialog-viewport', className].filter(Boolean).join(' ')
  return <BaseDialog.Viewport ref={ref} className={classes} {...props} />
})
Viewport.displayName = 'Dialog.Viewport'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['dialog-popup', className].filter(Boolean).join(' ')
  return <BaseDialog.Popup ref={ref} className={classes} {...props} />
})
Popup.displayName = 'Dialog.Popup'

const Title = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Title> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['dialog-title', className].filter(Boolean).join(' ')
  return <BaseDialog.Title ref={ref} className={classes} {...props} />
})
Title.displayName = 'Dialog.Title'

const Description = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Description> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['dialog-description', className].filter(Boolean).join(' ')
  return <BaseDialog.Description ref={ref} className={classes} {...props} />
})
Description.displayName = 'Dialog.Description'

const Close = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Close> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['dialog-close', className].filter(Boolean).join(' ')
  return <BaseDialog.Close ref={ref} className={classes} {...props} />
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
