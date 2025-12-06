import { NumberField as BaseNumberField } from '@base-ui-components/react/number-field'
import * as React from 'react'
import '@symploke/design/src/components/number-field.css'

const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNumberField.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseNumberField.Root ref={ref} className={`number-field ${className || ''}`} {...props} />
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
      className={`number-field__scrub-area ${className || ''}`}
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
  return <BaseNumberField.ScrubAreaCursor ref={ref} className={className} {...props} />
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
      className={`number-field__group ${className || ''}`}
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
      className={`number-field__button number-field__decrement ${className || ''}`}
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
      className={`number-field__input ${className || ''}`}
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
      className={`number-field__button number-field__increment ${className || ''}`}
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
