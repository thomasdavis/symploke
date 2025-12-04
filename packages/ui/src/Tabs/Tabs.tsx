import * as React from 'react'
import { Tabs as BaseTabs } from '@base-ui-components/react/tabs'
import '@symploke/design/components/tabs.css'

const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseTabs.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['tabs', className].filter(Boolean).join(' ')
  return <BaseTabs.Root ref={ref} className={classes} {...props} />
})
Root.displayName = 'Tabs.Root'

const List = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseTabs.List> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['tabs__list', className].filter(Boolean).join(' ')
  return <BaseTabs.List ref={ref} className={classes} {...props} />
})
List.displayName = 'Tabs.List'

const Tab = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseTabs.Tab> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['tabs__tab', className].filter(Boolean).join(' ')
  return <BaseTabs.Tab ref={ref} className={classes} {...props} />
})
Tab.displayName = 'Tabs.Tab'

const Indicator = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseTabs.Indicator> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['tabs__indicator', className].filter(Boolean).join(' ')
  return <BaseTabs.Indicator ref={ref} className={classes} {...props} />
})
Indicator.displayName = 'Tabs.Indicator'

const Panel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseTabs.Panel> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['tabs__panel', className].filter(Boolean).join(' ')
  return <BaseTabs.Panel ref={ref} className={classes} {...props} />
})
Panel.displayName = 'Tabs.Panel'

export const Tabs = {
  Root,
  List,
  Tab,
  Indicator,
  Panel,
}
