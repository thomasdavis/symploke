import * as React from 'react'
import { Combobox as BaseCombobox } from '@base-ui-components/react/combobox'

const Root = (props: React.ComponentPropsWithoutRef<typeof BaseCombobox.Root>) => {
  return <BaseCombobox.Root {...props} />
}
Root.displayName = 'Combobox.Root'

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<typeof BaseCombobox.Input> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseCombobox.Input
      ref={ref}
      className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
Input.displayName = 'Combobox.Input'

const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseCombobox.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseCombobox.Trigger
      ref={ref}
      className={`absolute right-0 top-0 h-full px-3 text-gray-500 hover:text-gray-900 ${className || ''}`}
      {...props}
    />
  )
})
Trigger.displayName = 'Combobox.Trigger'

const Portal = BaseCombobox.Portal

const Positioner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseCombobox.Positioner> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseCombobox.Positioner
      ref={ref}
      className={`z-50 ${className || ''}`}
      {...props}
    />
  )
})
Positioner.displayName = 'Combobox.Positioner'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseCombobox.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseCombobox.Popup
      ref={ref}
      className={`mt-1 w-full rounded-md border border-gray-200 bg-white p-1 shadow-md data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 ${className || ''}`}
      {...props}
    />
  )
})
Popup.displayName = 'Combobox.Popup'

const List = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseCombobox.List> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseCombobox.List
      ref={ref}
      className={`max-h-60 overflow-auto ${className || ''}`}
      {...props}
    />
  )
})
List.displayName = 'Combobox.List'

const Item = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseCombobox.Item> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseCombobox.Item
      ref={ref}
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
Item.displayName = 'Combobox.Item'

const ItemIndicator = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseCombobox.ItemIndicator> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseCombobox.ItemIndicator
      ref={ref}
      className={`ml-auto flex h-4 w-4 items-center justify-center ${className || ''}`}
      {...props}
    />
  )
})
ItemIndicator.displayName = 'Combobox.ItemIndicator'

const Group = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseCombobox.Group> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseCombobox.Group
      ref={ref}
      className={`overflow-hidden p-1 ${className || ''}`}
      {...props}
    />
  )
})
Group.displayName = 'Combobox.Group'

const GroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseCombobox.GroupLabel> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseCombobox.GroupLabel
      ref={ref}
      className={`px-2 py-1.5 text-xs font-semibold text-gray-900 ${className || ''}`}
      {...props}
    />
  )
})
GroupLabel.displayName = 'Combobox.GroupLabel'

const Chips = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseCombobox.Chips> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseCombobox.Chips
      ref={ref}
      className={`flex flex-wrap gap-1 ${className || ''}`}
      {...props}
    />
  )
})
Chips.displayName = 'Combobox.Chips'

const Chip = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseCombobox.Chip> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseCombobox.Chip
      ref={ref}
      className={`inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs ${className || ''}`}
      {...props}
    />
  )
})
Chip.displayName = 'Combobox.Chip'

const ChipRemove = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseCombobox.ChipRemove> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseCombobox.ChipRemove
      ref={ref}
      className={`rounded-full hover:bg-gray-200 ${className || ''}`}
      {...props}
    />
  )
})
ChipRemove.displayName = 'Combobox.ChipRemove'

export const Combobox = {
  Root,
  Input,
  Trigger,
  Portal,
  Positioner,
  Popup,
  List,
  Item,
  ItemIndicator,
  Group,
  GroupLabel,
  Chips,
  Chip,
  ChipRemove,
}
