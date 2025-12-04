import * as React from 'react'
import { Autocomplete as BaseAutocomplete } from '@base-ui-components/react/autocomplete'

const Root = (props: React.ComponentPropsWithoutRef<typeof BaseAutocomplete.Root>) => {
  return <BaseAutocomplete.Root {...props} />
}
Root.displayName = 'Autocomplete.Root'

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<typeof BaseAutocomplete.Input> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAutocomplete.Input
      ref={ref}
      className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
Input.displayName = 'Autocomplete.Input'

const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseAutocomplete.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAutocomplete.Trigger
      ref={ref}
      className={`absolute right-0 top-0 h-full px-3 text-gray-500 hover:text-gray-900 ${className || ''}`}
      {...props}
    />
  )
})
Trigger.displayName = 'Autocomplete.Trigger'

const Portal = BaseAutocomplete.Portal

const Positioner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAutocomplete.Positioner> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAutocomplete.Positioner
      ref={ref}
      className={`z-50 ${className || ''}`}
      {...props}
    />
  )
})
Positioner.displayName = 'Autocomplete.Positioner'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAutocomplete.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAutocomplete.Popup
      ref={ref}
      className={`mt-1 w-full rounded-md border border-gray-200 bg-white p-1 shadow-md data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 ${className || ''}`}
      {...props}
    />
  )
})
Popup.displayName = 'Autocomplete.Popup'

const List = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAutocomplete.List> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAutocomplete.List
      ref={ref}
      className={`max-h-60 overflow-auto ${className || ''}`}
      {...props}
    />
  )
})
List.displayName = 'Autocomplete.List'

const Item = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAutocomplete.Item> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAutocomplete.Item
      ref={ref}
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
Item.displayName = 'Autocomplete.Item'

const Empty = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAutocomplete.Empty> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAutocomplete.Empty
      ref={ref}
      className={`px-2 py-1.5 text-sm text-gray-500 ${className || ''}`}
      {...props}
    />
  )
})
Empty.displayName = 'Autocomplete.Empty'

const Status = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAutocomplete.Status> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAutocomplete.Status
      ref={ref}
      className={`sr-only ${className || ''}`}
      {...props}
    />
  )
})
Status.displayName = 'Autocomplete.Status'

const Icon = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAutocomplete.Icon> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAutocomplete.Icon
      ref={ref}
      className={`text-gray-500 ${className || ''}`}
      {...props}
    />
  )
})
Icon.displayName = 'Autocomplete.Icon'

export const Autocomplete = {
  Root,
  Input,
  Trigger,
  Portal,
  Positioner,
  Popup,
  List,
  Item,
  Empty,
  Status,
  Icon,
}
