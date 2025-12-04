import * as React from 'react'
import { Menu as BaseMenu } from '@base-ui-components/react/menu'
import '@symploke/design/components/menu.css'

const Root = BaseMenu.Root

const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menu__trigger', className].filter(Boolean).join(' ')
  return (
    <BaseMenu.Trigger
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
Trigger.displayName = 'Menu.Trigger'

const Portal = BaseMenu.Portal

const Backdrop = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Backdrop> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menu__backdrop', className].filter(Boolean).join(' ')
  return (
    <BaseMenu.Backdrop
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
Backdrop.displayName = 'Menu.Backdrop'

const Positioner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Positioner> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menu__positioner', className].filter(Boolean).join(' ')
  return (
    <BaseMenu.Positioner
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
Positioner.displayName = 'Menu.Positioner'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menu__popup', className].filter(Boolean).join(' ')
  return (
    <BaseMenu.Popup
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
Popup.displayName = 'Menu.Popup'

const Arrow = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Arrow> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menu__arrow', className].filter(Boolean).join(' ')
  return (
    <BaseMenu.Arrow
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
Arrow.displayName = 'Menu.Arrow'

const Item = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Item> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menu__item', className].filter(Boolean).join(' ')
  return (
    <BaseMenu.Item
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
Item.displayName = 'Menu.Item'

const Separator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Separator> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menu__separator', className].filter(Boolean).join(' ')
  return (
    <BaseMenu.Separator
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
Separator.displayName = 'Menu.Separator'

const Group = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Group> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMenu.Group
      ref={ref}
      className={className}
      {...props}
    />
  )
})
Group.displayName = 'Menu.Group'

const GroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.GroupLabel> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menu__group-label', className].filter(Boolean).join(' ')
  return (
    <BaseMenu.GroupLabel
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
GroupLabel.displayName = 'Menu.GroupLabel'

const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.RadioGroup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMenu.RadioGroup
      ref={ref}
      className={className}
      {...props}
    />
  )
})
RadioGroup.displayName = 'Menu.RadioGroup'

const RadioItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.RadioItem> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menu__radio-item', className].filter(Boolean).join(' ')
  return (
    <BaseMenu.RadioItem
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
RadioItem.displayName = 'Menu.RadioItem'

const CheckboxItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.CheckboxItem> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menu__checkbox-item', className].filter(Boolean).join(' ')
  return (
    <BaseMenu.CheckboxItem
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
CheckboxItem.displayName = 'Menu.CheckboxItem'

const SubmenuRoot = BaseMenu.SubmenuRoot

const SubmenuTrigger = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.SubmenuTrigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menu__submenu-trigger', className].filter(Boolean).join(' ')
  return (
    <BaseMenu.SubmenuTrigger
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
SubmenuTrigger.displayName = 'Menu.SubmenuTrigger'

export const Menu = {
  Root,
  Trigger,
  Portal,
  Backdrop,
  Positioner,
  Popup,
  Arrow,
  Item,
  Separator,
  Group,
  GroupLabel,
  RadioGroup,
  RadioItem,
  CheckboxItem,
  SubmenuRoot,
  SubmenuTrigger,
  createHandle: BaseMenu.createHandle,
}
