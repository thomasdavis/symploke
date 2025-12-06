import { Collapsible as BaseCollapsible } from '@base-ui-components/react/collapsible'
import * as React from 'react'
import '@symploke/design/components/collapsible.css'

const Root = BaseCollapsible.Root

const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseCollapsible.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['collapsible__trigger', className].filter(Boolean).join(' ')
  return <BaseCollapsible.Trigger ref={ref} className={classes} {...props} />
})
Trigger.displayName = 'Collapsible.Trigger'

const Panel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseCollapsible.Panel> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['collapsible__panel', className].filter(Boolean).join(' ')
  return <BaseCollapsible.Panel ref={ref} className={classes} {...props} />
})
Panel.displayName = 'Collapsible.Panel'

export const Collapsible = {
  Root,
  Trigger,
  Panel,
}
