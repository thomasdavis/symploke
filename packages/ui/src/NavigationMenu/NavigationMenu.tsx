import * as React from 'react'
import { NavigationMenu as BaseNavigationMenu } from '@base-ui-components/react/navigation-menu'

const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseNavigationMenu.Root
      ref={ref}
      className={`relative z-10 ${className || ''}`}
      {...props}
    />
  )
})
Root.displayName = 'NavigationMenu.Root'

const List = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.List> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseNavigationMenu.List
      ref={ref}
      className={`flex flex-row list-none space-x-1 ${className || ''}`}
      {...props}
    />
  )
})
List.displayName = 'NavigationMenu.List'

const Item = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Item> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseNavigationMenu.Item
      ref={ref}
      className={`relative ${className || ''}`}
      {...props}
    />
  )
})
Item.displayName = 'NavigationMenu.Item'

const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseNavigationMenu.Trigger
      ref={ref}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 focus:bg-gray-100 focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-gray-100/50 data-[state=open]:bg-gray-100/50 ${className || ''}`}
      {...props}
    />
  )
})
Trigger.displayName = 'NavigationMenu.Trigger'

const Icon = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Icon> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseNavigationMenu.Icon
      ref={ref}
      className={`ml-1 h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180 ${className || ''}`}
      {...props}
    />
  )
})
Icon.displayName = 'NavigationMenu.Icon'

const Content = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Content> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseNavigationMenu.Content
      ref={ref}
      className={`w-full ${className || ''}`}
      {...props}
    />
  )
})
Content.displayName = 'NavigationMenu.Content'

const Link = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Link> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseNavigationMenu.Link
      ref={ref}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 focus:bg-gray-100 focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-gray-100/50 ${className || ''}`}
      {...props}
    />
  )
})
Link.displayName = 'NavigationMenu.Link'

const Portal = BaseNavigationMenu.Portal

const Positioner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Positioner> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseNavigationMenu.Positioner
      ref={ref}
      className={`absolute left-0 top-full ${className || ''}`}
      {...props}
    />
  )
})
Positioner.displayName = 'NavigationMenu.Positioner'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseNavigationMenu.Popup
      ref={ref}
      className={`mt-2 overflow-hidden rounded-md border border-gray-200 bg-white text-gray-950 shadow-lg data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 ${className || ''}`}
      {...props}
    />
  )
})
Popup.displayName = 'NavigationMenu.Popup'

const Viewport = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Viewport> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseNavigationMenu.Viewport
      ref={ref}
      className={`origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border border-gray-200 bg-white text-gray-950 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 ${className || ''}`}
      {...props}
    />
  )
})
Viewport.displayName = 'NavigationMenu.Viewport'

const Arrow = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Arrow> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseNavigationMenu.Arrow
      ref={ref}
      className={`fill-white ${className || ''}`}
      {...props}
    />
  )
})
Arrow.displayName = 'NavigationMenu.Arrow'

const Backdrop = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Backdrop> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseNavigationMenu.Backdrop
      ref={ref}
      className={`fixed inset-0 z-50 ${className || ''}`}
      {...props}
    />
  )
})
Backdrop.displayName = 'NavigationMenu.Backdrop'

export const NavigationMenu = {
  Root,
  List,
  Item,
  Trigger,
  Icon,
  Content,
  Link,
  Portal,
  Positioner,
  Popup,
  Viewport,
  Arrow,
  Backdrop,
}
