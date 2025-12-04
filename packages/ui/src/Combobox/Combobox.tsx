import * as React from 'react'
import { Combobox as BaseCombobox } from '@base-ui-components/react/combobox'
import '@symploke/design/components/combobox.css'

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
  const classes = ['combobox-input', className].filter(Boolean).join(' ')
  return (
    <BaseCombobox.Input
      ref={ref}
      className={classes}
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
  const classes = ['combobox-trigger', className].filter(Boolean).join(' ')
  return (
    <BaseCombobox.Trigger
      ref={ref}
      className={classes}
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
  const classes = ['combobox-positioner', className].filter(Boolean).join(' ')
  return (
    <BaseCombobox.Positioner
      ref={ref}
      className={classes}
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
  const classes = ['combobox-popup', className].filter(Boolean).join(' ')
  return (
    <BaseCombobox.Popup
      ref={ref}
      className={classes}
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
  const classes = ['combobox-list', className].filter(Boolean).join(' ')
  return (
    <BaseCombobox.List
      ref={ref}
      className={classes}
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
  const classes = ['combobox-item', className].filter(Boolean).join(' ')
  return (
    <BaseCombobox.Item
      ref={ref}
      className={classes}
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
  const classes = ['combobox-item-indicator', className].filter(Boolean).join(' ')
  return (
    <BaseCombobox.ItemIndicator
      ref={ref}
      className={classes}
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
  const classes = ['combobox-group', className].filter(Boolean).join(' ')
  return (
    <BaseCombobox.Group
      ref={ref}
      className={classes}
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
  const classes = ['combobox-group-label', className].filter(Boolean).join(' ')
  return (
    <BaseCombobox.GroupLabel
      ref={ref}
      className={classes}
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
  const classes = ['combobox-chips', className].filter(Boolean).join(' ')
  return (
    <BaseCombobox.Chips
      ref={ref}
      className={classes}
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
  const classes = ['combobox-chip', className].filter(Boolean).join(' ')
  return (
    <BaseCombobox.Chip
      ref={ref}
      className={classes}
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
  const classes = ['combobox-chip-remove', className].filter(Boolean).join(' ')
  return (
    <BaseCombobox.ChipRemove
      ref={ref}
      className={classes}
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
