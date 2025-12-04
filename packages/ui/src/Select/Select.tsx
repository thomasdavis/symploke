import * as React from 'react'
import { Select as BaseSelect } from '@base-ui-components/react/select'
import '@symploke/design/components/select.css'

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
  return <BaseSelect.Trigger ref={ref} className={`select-trigger ${className || ''}`} {...props} />
})
Trigger.displayName = 'Select.Trigger'

const Value = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Value> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseSelect.Value ref={ref} className={`select-value ${className || ''}`} {...props} />
})
Value.displayName = 'Select.Value'

const Icon = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Icon> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseSelect.Icon ref={ref} className={`select-icon ${className || ''}`} {...props} />
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
      className={`select-positioner ${className || ''}`}
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
  return <BaseSelect.Popup ref={ref} className={`select-popup ${className || ''}`} {...props} />
})
Popup.displayName = 'Select.Popup'

const List = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.List> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseSelect.List ref={ref} className={`select-list ${className || ''}`} {...props} />
})
List.displayName = 'Select.List'

const Item = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Item> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseSelect.Item ref={ref} className={`select-item ${className || ''}`} {...props} />
})
Item.displayName = 'Select.Item'

const ItemText = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.ItemText> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseSelect.ItemText ref={ref} className={className} {...props} />
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
      className={`select-item-indicator ${className || ''}`}
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
  return <BaseSelect.Group ref={ref} className={`select-group ${className || ''}`} {...props} />
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
      className={`select-group-label ${className || ''}`}
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
      className={`select-scroll-arrow ${className || ''}`}
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
      className={`select-scroll-arrow ${className || ''}`}
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
    <BaseSelect.Separator ref={ref} className={`select-separator ${className || ''}`} {...props} />
  )
})
Separator.displayName = 'Select.Separator'

const Arrow = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Arrow> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseSelect.Arrow ref={ref} className={`select-arrow ${className || ''}`} {...props} />
})
Arrow.displayName = 'Select.Arrow'

const Backdrop = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Backdrop> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSelect.Backdrop ref={ref} className={`select-backdrop ${className || ''}`} {...props} />
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
