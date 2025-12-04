import * as React from 'react'
import { Menu as BaseMenu } from '@base-ui-components/react/menu'

const Root = BaseMenu.Root

const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMenu.Trigger
      ref={ref}
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
Trigger.displayName = 'Menu.Trigger'

const Portal = BaseMenu.Portal

const Backdrop = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Backdrop> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMenu.Backdrop
      ref={ref}
      className={`fixed inset-0 z-50 ${className || ''}`}
      {...props}
    />
  )
})
Backdrop.displayName = 'Menu.Backdrop'

const Positioner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Positioner> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMenu.Positioner
      ref={ref}
      className={`z-50 ${className || ''}`}
      {...props}
    />
  )
})
Positioner.displayName = 'Menu.Positioner'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMenu.Popup
      ref={ref}
      className={`z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white p-1 text-gray-950 shadow-md data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 ${className || ''}`}
      {...props}
    />
  )
})
Popup.displayName = 'Menu.Popup'

const Arrow = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Arrow> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMenu.Arrow
      ref={ref}
      className={`fill-white ${className || ''}`}
      {...props}
    />
  )
})
Arrow.displayName = 'Menu.Arrow'

const Item = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Item> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMenu.Item
      ref={ref}
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
Item.displayName = 'Menu.Item'

const Separator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Separator> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMenu.Separator
      ref={ref}
      className={`-mx-1 my-1 h-px bg-gray-200 ${className || ''}`}
      {...props}
    />
  )
})
Separator.displayName = 'Menu.Separator'

const Group = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Group> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMenu.Group
      ref={ref}
      className={className}
      {...props}
    />
  )
})
Group.displayName = 'Menu.Group'

const GroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.GroupLabel> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMenu.GroupLabel
      ref={ref}
      className={`px-2 py-1.5 text-xs font-semibold text-gray-900 ${className || ''}`}
      {...props}
    />
  )
})
GroupLabel.displayName = 'Menu.GroupLabel'

const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.RadioGroup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMenu.RadioGroup
      ref={ref}
      className={className}
      {...props}
    />
  )
})
RadioGroup.displayName = 'Menu.RadioGroup'

const RadioItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.RadioItem> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMenu.RadioItem
      ref={ref}
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
RadioItem.displayName = 'Menu.RadioItem'

const CheckboxItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.CheckboxItem> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMenu.CheckboxItem
      ref={ref}
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
CheckboxItem.displayName = 'Menu.CheckboxItem'

const SubmenuRoot = BaseMenu.SubmenuRoot

const SubmenuTrigger = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.SubmenuTrigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMenu.SubmenuTrigger
      ref={ref}
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
SubmenuTrigger.displayName = 'Menu.SubmenuTrigger'

export const Menu = {
  Root,
  Trigger,
  Portal,
  Backdrop,
  Positioner,
  Popup,
  Arrow,
  Item,
  Separator,
  Group,
  GroupLabel,
  RadioGroup,
  RadioItem,
  CheckboxItem,
  SubmenuRoot,
  SubmenuTrigger,
  createHandle: BaseMenu.createHandle,
}
