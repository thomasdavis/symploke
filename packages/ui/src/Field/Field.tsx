'use client'

import * as React from 'react'
import { Field as BaseField } from '@base-ui-components/react/field'
import '@symploke/design/components/field.css'

type RootProps = React.ComponentPropsWithoutRef<typeof BaseField.Root> & {
  className?: string
}

const Root: React.ForwardRefExoticComponent<RootProps & React.RefAttributes<HTMLDivElement>> =
  React.forwardRef<HTMLDivElement, RootProps>(({ className, ...props }, ref) => {
    return <BaseField.Root ref={ref} className={`field ${className || ''}`} {...props} />
  })
Root.displayName = 'Field.Root'

type LabelProps = React.ComponentPropsWithoutRef<typeof BaseField.Label> & {
  className?: string
}

const Label: React.ForwardRefExoticComponent<LabelProps & React.RefAttributes<HTMLLabelElement>> =
  React.forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => {
    return (
      <BaseField.Label
        ref={ref}
        className={`field__label ${className || ''}`}
        {...props}
      />
    )
  })
Label.displayName = 'Field.Label'

type ControlProps = React.ComponentPropsWithoutRef<typeof BaseField.Control> & {
  className?: string
}

const Control: React.ForwardRefExoticComponent<
  ControlProps & React.RefAttributes<HTMLInputElement>
> = React.forwardRef<HTMLInputElement, ControlProps>(({ className, ...props }, ref) => {
  return (
    <BaseField.Control
      ref={ref}
      className={`field__control ${className || ''}`}
      {...props}
    />
  )
})
Control.displayName = 'Field.Control'

type DescriptionProps = React.ComponentPropsWithoutRef<typeof BaseField.Description> & {
  className?: string
}

const Description: React.ForwardRefExoticComponent<
  DescriptionProps & React.RefAttributes<HTMLParagraphElement>
> = React.forwardRef<HTMLParagraphElement, DescriptionProps>(({ className, ...props }, ref) => {
  return (
    <BaseField.Description
      ref={ref}
      className={`field__description ${className || ''}`}
      {...props}
    />
  )
})
Description.displayName = 'Field.Description'

type ErrorProps = React.ComponentPropsWithoutRef<typeof BaseField.Error> & {
  className?: string
}

const Error: React.ForwardRefExoticComponent<ErrorProps & React.RefAttributes<HTMLDivElement>> =
  React.forwardRef<HTMLDivElement, ErrorProps>(({ className, ...props }, ref) => {
    return (
      <BaseField.Error
        ref={ref}
        className={`field__error ${className || ''}`}
        {...props}
      />
    )
  })
Error.displayName = 'Field.Error'

type ItemProps = React.ComponentPropsWithoutRef<typeof BaseField.Item> & {
  className?: string
}

const Item: React.ForwardRefExoticComponent<ItemProps & React.RefAttributes<HTMLDivElement>> =
  React.forwardRef<HTMLDivElement, ItemProps>(({ className, ...props }, ref) => {
    return (
      <BaseField.Item
        ref={ref}
        className={`field__item ${className || ''}`}
        {...props}
      />
    )
  })
Item.displayName = 'Field.Item'

const Validity = BaseField.Validity

export const Field: {
  Root: typeof Root
  Label: typeof Label
  Control: typeof Control
  Description: typeof Description
  Error: typeof Error
  Item: typeof Item
  Validity: typeof Validity
} = {
  Root,
  Label,
  Control,
  Description,
  Error,
  Item,
  Validity,
}
