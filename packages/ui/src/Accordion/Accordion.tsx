import { Accordion as BaseAccordion } from '@base-ui-components/react/accordion'
import * as React from 'react'
import '@symploke/design/components/accordion.css'

// Re-export all subcomponents with styling
const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAccordion.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['accordion', className].filter(Boolean).join(' ')
  return <BaseAccordion.Root ref={ref} className={classes} {...props} />
})
Root.displayName = 'Accordion.Root'

const Item = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAccordion.Item> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['accordion__item', className].filter(Boolean).join(' ')
  return <BaseAccordion.Item ref={ref} className={classes} {...props} />
})
Item.displayName = 'Accordion.Item'

const Header = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof BaseAccordion.Header> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['accordion__header', className].filter(Boolean).join(' ')
  return <BaseAccordion.Header ref={ref} className={classes} {...props} />
})
Header.displayName = 'Accordion.Header'

const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseAccordion.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['accordion__trigger', className].filter(Boolean).join(' ')
  return <BaseAccordion.Trigger ref={ref} className={classes} {...props} />
})
Trigger.displayName = 'Accordion.Trigger'

const Panel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAccordion.Panel> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['accordion__panel', className].filter(Boolean).join(' ')
  return <BaseAccordion.Panel ref={ref} className={classes} {...props} />
})
Panel.displayName = 'Accordion.Panel'

export const Accordion = {
  Root,
  Item,
  Header,
  Trigger,
  Panel,
}
