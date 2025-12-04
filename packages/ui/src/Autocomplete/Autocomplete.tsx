import * as React from 'react'
import { Autocomplete as BaseAutocomplete } from '@base-ui-components/react/autocomplete'
import '@symploke/design/components/autocomplete.css'

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
  const classes = ['autocomplete-input', className].filter(Boolean).join(' ')
  return <BaseAutocomplete.Input ref={ref} className={classes} {...props} />
})
Input.displayName = 'Autocomplete.Input'

const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseAutocomplete.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['autocomplete-trigger', className].filter(Boolean).join(' ')
  return <BaseAutocomplete.Trigger ref={ref} className={classes} {...props} />
})
Trigger.displayName = 'Autocomplete.Trigger'

const Portal = BaseAutocomplete.Portal

const Positioner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAutocomplete.Positioner> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['autocomplete-positioner', className].filter(Boolean).join(' ')
  return <BaseAutocomplete.Positioner ref={ref} className={classes} {...props} />
})
Positioner.displayName = 'Autocomplete.Positioner'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAutocomplete.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['autocomplete-popup', className].filter(Boolean).join(' ')
  return <BaseAutocomplete.Popup ref={ref} className={classes} {...props} />
})
Popup.displayName = 'Autocomplete.Popup'

const List = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAutocomplete.List> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['autocomplete-list', className].filter(Boolean).join(' ')
  return <BaseAutocomplete.List ref={ref} className={classes} {...props} />
})
List.displayName = 'Autocomplete.List'

const Item = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAutocomplete.Item> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['autocomplete-item', className].filter(Boolean).join(' ')
  return <BaseAutocomplete.Item ref={ref} className={classes} {...props} />
})
Item.displayName = 'Autocomplete.Item'

const Empty = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAutocomplete.Empty> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['autocomplete-empty', className].filter(Boolean).join(' ')
  return <BaseAutocomplete.Empty ref={ref} className={classes} {...props} />
})
Empty.displayName = 'Autocomplete.Empty'

const Status = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAutocomplete.Status> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['autocomplete-status', className].filter(Boolean).join(' ')
  return <BaseAutocomplete.Status ref={ref} className={classes} {...props} />
})
Status.displayName = 'Autocomplete.Status'

const Icon = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAutocomplete.Icon> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['autocomplete-icon', className].filter(Boolean).join(' ')
  return <BaseAutocomplete.Icon ref={ref} className={classes} {...props} />
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
