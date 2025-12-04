import * as React from 'react'
import { Accordion as BaseAccordion } from '@base-ui-components/react/accordion'

// Re-export all subcomponents with styling
const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAccordion.Root>
>((props, ref) => {
  return <BaseAccordion.Root ref={ref} {...props} />
})
Root.displayName = 'Accordion.Root'

const Item = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAccordion.Item> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAccordion.Item
      ref={ref}
      className={`border-b border-gray-200 ${className || ''}`}
      {...props}
    />
  )
})
Item.displayName = 'Accordion.Item'

const Header = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof BaseAccordion.Header> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAccordion.Header
      ref={ref}
      className={`flex ${className || ''}`}
      {...props}
    />
  )
})
Header.displayName = 'Accordion.Header'

const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseAccordion.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAccordion.Trigger
      ref={ref}
      className={`flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline text-left [&[data-panel-open]>svg]:rotate-180 ${className || ''}`}
      {...props}
    />
  )
})
Trigger.displayName = 'Accordion.Trigger'

const Panel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAccordion.Panel> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAccordion.Panel
      ref={ref}
      className={`overflow-hidden text-sm data-[open]:animate-accordion-down data-[closed]:animate-accordion-up ${className || ''}`}
      {...props}
    />
  )
})
Panel.displayName = 'Accordion.Panel'

export const Accordion = {
  Root,
  Item,
  Header,
  Trigger,
  Panel,
}
