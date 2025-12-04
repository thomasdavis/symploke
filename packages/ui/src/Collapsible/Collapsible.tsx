import * as React from 'react'
import { Collapsible as BaseCollapsible } from '@base-ui-components/react/collapsible'

const Root = BaseCollapsible.Root

const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseCollapsible.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseCollapsible.Trigger
      ref={ref}
      className={`flex w-full items-center justify-between py-2 font-medium transition-all hover:underline [&[data-panel-open]>svg]:rotate-180 ${className || ''}`}
      {...props}
    />
  )
})
Trigger.displayName = 'Collapsible.Trigger'

const Panel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseCollapsible.Panel> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseCollapsible.Panel
      ref={ref}
      className={`overflow-hidden text-sm data-[open]:animate-collapsible-down data-[closed]:animate-collapsible-up ${className || ''}`}
      {...props}
    />
  )
})
Panel.displayName = 'Collapsible.Panel'

export const Collapsible = {
  Root,
  Trigger,
  Panel,
}
