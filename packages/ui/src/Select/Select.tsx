import * as React from 'react'
import { Select as BaseSelect } from '@base-ui-components/react/select'

const Root = (props: React.ComponentPropsWithoutRef<typeof BaseSelect.Root>) => {
  return <BaseSelect.Root {...props} />
}
Root.displayName = 'Select.Root'

const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSelect.Trigger
      ref={ref}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
Trigger.displayName = 'Select.Trigger'

const Value = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Value> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSelect.Value
      ref={ref}
      className={`flex-1 text-left ${className || ''}`}
      {...props}
    />
  )
})
Value.displayName = 'Select.Value'

const Icon = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Icon> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSelect.Icon
      ref={ref}
      className={`ml-2 h-4 w-4 opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
Icon.displayName = 'Select.Icon'

const Portal = BaseSelect.Portal

const Positioner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Positioner> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSelect.Positioner
      ref={ref}
      className={`z-50 ${className || ''}`}
      {...props}
    />
  )
})
Positioner.displayName = 'Select.Positioner'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSelect.Popup
      ref={ref}
      className={`relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white text-gray-950 shadow-md data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 ${className || ''}`}
      {...props}
    />
  )
})
Popup.displayName = 'Select.Popup'

const List = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.List> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSelect.List
      ref={ref}
      className={`p-1 ${className || ''}`}
      {...props}
    />
  )
})
List.displayName = 'Select.List'

const Item = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Item> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSelect.Item
      ref={ref}
      className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
Item.displayName = 'Select.Item'

const ItemText = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.ItemText> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSelect.ItemText
      ref={ref}
      className={className}
      {...props}
    />
  )
})
ItemText.displayName = 'Select.ItemText'

const ItemIndicator = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.ItemIndicator> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSelect.ItemIndicator
      ref={ref}
      className={`absolute left-2 flex h-3.5 w-3.5 items-center justify-center ${className || ''}`}
      {...props}
    />
  )
})
ItemIndicator.displayName = 'Select.ItemIndicator'

const Group = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Group> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSelect.Group
      ref={ref}
      className={`overflow-hidden p-1 ${className || ''}`}
      {...props}
    />
  )
})
Group.displayName = 'Select.Group'

const GroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.GroupLabel> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSelect.GroupLabel
      ref={ref}
      className={`py-1.5 pl-8 pr-2 text-xs font-semibold text-gray-900 ${className || ''}`}
      {...props}
    />
  )
})
GroupLabel.displayName = 'Select.GroupLabel'

const ScrollUpArrow = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.ScrollUpArrow> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSelect.ScrollUpArrow
      ref={ref}
      className={`flex cursor-default items-center justify-center py-1 ${className || ''}`}
      {...props}
    />
  )
})
ScrollUpArrow.displayName = 'Select.ScrollUpArrow'

const ScrollDownArrow = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.ScrollDownArrow> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSelect.ScrollDownArrow
      ref={ref}
      className={`flex cursor-default items-center justify-center py-1 ${className || ''}`}
      {...props}
    />
  )
})
ScrollDownArrow.displayName = 'Select.ScrollDownArrow'

const Separator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Separator> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSelect.Separator
      ref={ref}
      className={`-mx-1 my-1 h-px bg-gray-200 ${className || ''}`}
      {...props}
    />
  )
})
Separator.displayName = 'Select.Separator'

const Arrow = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Arrow> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSelect.Arrow
      ref={ref}
      className={`fill-white ${className || ''}`}
      {...props}
    />
  )
})
Arrow.displayName = 'Select.Arrow'

const Backdrop = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Backdrop> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSelect.Backdrop
      ref={ref}
      className={`fixed inset-0 z-50 ${className || ''}`}
      {...props}
    />
  )
})
Backdrop.displayName = 'Select.Backdrop'

export const Select = {
  Root,
  Trigger,
  Value,
  Icon,
  Portal,
  Positioner,
  Popup,
  List,
  Item,
  ItemText,
  ItemIndicator,
  Group,
  GroupLabel,
  ScrollUpArrow,
  ScrollDownArrow,
  Separator,
  Arrow,
  Backdrop,
}
