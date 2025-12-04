import * as React from 'react'
import { PreviewCard as BasePreviewCard } from '@base-ui-components/react/preview-card'
import '@symploke/design/components/preview-card.css'

const Root = BasePreviewCard.Root

const Trigger = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<typeof BasePreviewCard.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BasePreviewCard.Trigger ref={ref} className={className} {...props} />
})
Trigger.displayName = 'PreviewCard.Trigger'

const Portal = BasePreviewCard.Portal

const Backdrop = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BasePreviewCard.Backdrop> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['preview-card__backdrop', className].filter(Boolean).join(' ')
  return <BasePreviewCard.Backdrop ref={ref} className={classes} {...props} />
})
Backdrop.displayName = 'PreviewCard.Backdrop'

const Positioner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BasePreviewCard.Positioner> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['preview-card__positioner', className].filter(Boolean).join(' ')
  return <BasePreviewCard.Positioner ref={ref} className={classes} {...props} />
})
Positioner.displayName = 'PreviewCard.Positioner'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BasePreviewCard.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['preview-card__popup', className].filter(Boolean).join(' ')
  return <BasePreviewCard.Popup ref={ref} className={classes} {...props} />
})
Popup.displayName = 'PreviewCard.Popup'

const Arrow = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BasePreviewCard.Arrow> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['preview-card__arrow', className].filter(Boolean).join(' ')
  return <BasePreviewCard.Arrow ref={ref} className={classes} {...props} />
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
