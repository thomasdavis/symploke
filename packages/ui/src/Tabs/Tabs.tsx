import * as React from 'react'
import { Tabs as BaseTabs } from '@base-ui-components/react/tabs'

const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseTabs.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseTabs.Root
      ref={ref}
      className={`w-full ${className || ''}`}
      {...props}
    />
  )
})
Root.displayName = 'Tabs.Root'

const List = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseTabs.List> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseTabs.List
      ref={ref}
      className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 ${className || ''}`}
      {...props}
    />
  )
})
List.displayName = 'Tabs.List'

const Tab = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseTabs.Tab> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseTabs.Tab
      ref={ref}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-white data-[active]:text-gray-950 data-[active]:shadow-sm ${className || ''}`}
      {...props}
    />
  )
})
Tab.displayName = 'Tabs.Tab'

const Indicator = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseTabs.Indicator> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseTabs.Indicator
      ref={ref}
      className={`absolute bg-gray-900 ${className || ''}`}
      {...props}
    />
  )
})
Indicator.displayName = 'Tabs.Indicator'

const Panel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseTabs.Panel> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseTabs.Panel
      ref={ref}
      className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 ${className || ''}`}
      {...props}
    />
  )
})
Panel.displayName = 'Tabs.Panel'

export const Tabs = {
  Root,
  List,
  Tab,
  Indicator,
  Panel,
}
