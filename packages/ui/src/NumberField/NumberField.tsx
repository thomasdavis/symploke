import * as React from 'react'
import { NumberField as BaseNumberField } from '@base-ui-components/react/number-field'

const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNumberField.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseNumberField.Root
      ref={ref}
      className={`relative ${className || ''}`}
      {...props}
    />
  )
})
Root.displayName = 'NumberField.Root'

const ScrubArea = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseNumberField.ScrubArea> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseNumberField.ScrubArea
      ref={ref}
      className={`cursor-ew-resize ${className || ''}`}
      {...props}
    />
  )
})
ScrubArea.displayName = 'NumberField.ScrubArea'

const ScrubAreaCursor = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseNumberField.ScrubAreaCursor> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseNumberField.ScrubAreaCursor
      ref={ref}
      className={className}
      {...props}
    />
  )
})
ScrubAreaCursor.displayName = 'NumberField.ScrubAreaCursor'

const Group = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNumberField.Group> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseNumberField.Group
      ref={ref}
      className={`relative flex items-center ${className || ''}`}
      {...props}
    />
  )
})
Group.displayName = 'NumberField.Group'

const Decrement = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseNumberField.Decrement> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseNumberField.Decrement
      ref={ref}
      className={`h-10 w-10 rounded-l-md border border-r-0 border-gray-300 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
Decrement.displayName = 'NumberField.Decrement'

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<typeof BaseNumberField.Input> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseNumberField.Input
      ref={ref}
      className={`flex h-10 w-full border-y border-gray-300 bg-white px-3 py-2 text-sm text-center ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
Input.displayName = 'NumberField.Input'

const Increment = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseNumberField.Increment> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseNumberField.Increment
      ref={ref}
      className={`h-10 w-10 rounded-r-md border border-l-0 border-gray-300 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
Increment.displayName = 'NumberField.Increment'

export const NumberField = {
  Root,
  ScrubArea,
  ScrubAreaCursor,
  Group,
  Decrement,
  Input,
  Increment,
}
