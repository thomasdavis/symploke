// @ts-nocheck - Base UI menubar package has incomplete type exports

import * as BaseMenubar from '@base-ui-components/react/menubar'
import * as React from 'react'
import '@symploke/design/components/menubar.css'

const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenubar.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menubar', className].filter(Boolean).join(' ')
  return <BaseMenubar.Root ref={ref} className={classes} {...props} />
})
Root.displayName = 'Menubar.Root'

const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseMenubar.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menubar__trigger', className].filter(Boolean).join(' ')
  return <BaseMenubar.Trigger ref={ref} className={classes} {...props} />
})
Trigger.displayName = 'Menubar.Trigger'

const Portal = BaseMenubar.Portal

const Backdrop = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenubar.Backdrop> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menubar__backdrop', className].filter(Boolean).join(' ')
  return <BaseMenubar.Backdrop ref={ref} className={classes} {...props} />
})
Backdrop.displayName = 'Menubar.Backdrop'

const Positioner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenubar.Positioner> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menubar__positioner', className].filter(Boolean).join(' ')
  return <BaseMenubar.Positioner ref={ref} className={classes} {...props} />
})
Positioner.displayName = 'Menubar.Positioner'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenubar.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menubar__popup', className].filter(Boolean).join(' ')
  return <BaseMenubar.Popup ref={ref} className={classes} {...props} />
})
Popup.displayName = 'Menubar.Popup'

const Arrow = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenubar.Arrow> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menubar__arrow', className].filter(Boolean).join(' ')
  return <BaseMenubar.Arrow ref={ref} className={classes} {...props} />
})
Arrow.displayName = 'Menubar.Arrow'

const Item = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenubar.Item> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menubar__item', className].filter(Boolean).join(' ')
  return <BaseMenubar.Item ref={ref} className={classes} {...props} />
})
Item.displayName = 'Menubar.Item'

const Separator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenubar.Separator> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menubar__separator', className].filter(Boolean).join(' ')
  return <BaseMenubar.Separator ref={ref} className={classes} {...props} />
})
Separator.displayName = 'Menubar.Separator'

const Group = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenubar.Group> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseMenubar.Group ref={ref} className={className} {...props} />
})
Group.displayName = 'Menubar.Group'

const GroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenubar.GroupLabel> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menubar__group-label', className].filter(Boolean).join(' ')
  return <BaseMenubar.GroupLabel ref={ref} className={classes} {...props} />
})
GroupLabel.displayName = 'Menubar.GroupLabel'

const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenubar.RadioGroup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseMenubar.RadioGroup ref={ref} className={className} {...props} />
})
RadioGroup.displayName = 'Menubar.RadioGroup'

const RadioItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenubar.RadioItem> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menubar__radio-item', className].filter(Boolean).join(' ')
  return <BaseMenubar.RadioItem ref={ref} className={classes} {...props} />
})
RadioItem.displayName = 'Menubar.RadioItem'

const CheckboxItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenubar.CheckboxItem> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menubar__checkbox-item', className].filter(Boolean).join(' ')
  return <BaseMenubar.CheckboxItem ref={ref} className={classes} {...props} />
})
CheckboxItem.displayName = 'Menubar.CheckboxItem'

const SubmenuRoot = BaseMenubar.SubmenuRoot

const SubmenuTrigger = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenubar.SubmenuTrigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['menubar__submenu-trigger', className].filter(Boolean).join(' ')
  return <BaseMenubar.SubmenuTrigger ref={ref} className={classes} {...props} />
})
SubmenuTrigger.displayName = 'Menubar.SubmenuTrigger'

export const Menubar = {
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
  createHandle: BaseMenubar.createHandle,
}
