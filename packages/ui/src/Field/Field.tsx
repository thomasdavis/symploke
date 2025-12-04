import * as React from 'react'
import { Field as BaseField } from '@base-ui-components/react/field'

type RootProps = React.ComponentPropsWithoutRef<typeof BaseField.Root> & {
  className?: string
}

const Root: React.ForwardRefExoticComponent<RootProps & React.RefAttributes<HTMLDivElement>> =
  React.forwardRef<HTMLDivElement, RootProps>(({ className, ...props }, ref) => {
    return <BaseField.Root ref={ref} className={`space-y-2 ${className || ''}`} {...props} />
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
        className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className || ''}`}
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
      className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
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
      className={`text-sm text-gray-500 ${className || ''}`}
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
        className={`text-sm font-medium text-red-500 ${className || ''}`}
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
        className={`flex items-center space-x-2 ${className || ''}`}
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
