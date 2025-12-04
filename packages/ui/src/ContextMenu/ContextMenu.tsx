import * as React from 'react'
import { ContextMenu as BaseContextMenu } from '@base-ui-components/react/context-menu'

const Root = BaseContextMenu.Root

const Trigger = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseContextMenu.Trigger
      ref={ref}
      className={className}
      {...props}
    />
  )
})
Trigger.displayName = 'ContextMenu.Trigger'

const Portal = BaseContextMenu.Portal

const Backdrop = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.Backdrop> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseContextMenu.Backdrop
      ref={ref}
      className={`fixed inset-0 z-50 ${className || ''}`}
      {...props}
    />
  )
})
Backdrop.displayName = 'ContextMenu.Backdrop'

const Positioner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.Positioner> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseContextMenu.Positioner
      ref={ref}
      className={`z-50 ${className || ''}`}
      {...props}
    />
  )
})
Positioner.displayName = 'ContextMenu.Positioner'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseContextMenu.Popup
      ref={ref}
      className={`z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white p-1 text-gray-950 shadow-md data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 ${className || ''}`}
      {...props}
    />
  )
})
Popup.displayName = 'ContextMenu.Popup'

const Arrow = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.Arrow> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseContextMenu.Arrow
      ref={ref}
      className={`fill-white ${className || ''}`}
      {...props}
    />
  )
})
Arrow.displayName = 'ContextMenu.Arrow'

const Item = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.Item> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseContextMenu.Item
      ref={ref}
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
Item.displayName = 'ContextMenu.Item'

const Separator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.Separator> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseContextMenu.Separator
      ref={ref}
      className={`-mx-1 my-1 h-px bg-gray-200 ${className || ''}`}
      {...props}
    />
  )
})
Separator.displayName = 'ContextMenu.Separator'

const Group = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.Group> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseContextMenu.Group
      ref={ref}
      className={className}
      {...props}
    />
  )
})
Group.displayName = 'ContextMenu.Group'

const GroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.GroupLabel> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseContextMenu.GroupLabel
      ref={ref}
      className={`px-2 py-1.5 text-xs font-semibold text-gray-900 ${className || ''}`}
      {...props}
    />
  )
})
GroupLabel.displayName = 'ContextMenu.GroupLabel'

const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.RadioGroup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseContextMenu.RadioGroup
      ref={ref}
      className={className}
      {...props}
    />
  )
})
RadioGroup.displayName = 'ContextMenu.RadioGroup'

const RadioItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.RadioItem> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseContextMenu.RadioItem
      ref={ref}
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
RadioItem.displayName = 'ContextMenu.RadioItem'

const CheckboxItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.CheckboxItem> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseContextMenu.CheckboxItem
      ref={ref}
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
CheckboxItem.displayName = 'ContextMenu.CheckboxItem'

const SubmenuRoot = BaseContextMenu.SubmenuRoot

const SubmenuTrigger = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.SubmenuTrigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseContextMenu.SubmenuTrigger
      ref={ref}
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
SubmenuTrigger.displayName = 'ContextMenu.SubmenuTrigger'

export const ContextMenu = {
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
}
