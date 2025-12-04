import * as React from 'react'
import { ContextMenu as BaseContextMenu } from '@base-ui-components/react/context-menu'
import '@symploke/design/components/context-menu.css'

const Root = BaseContextMenu.Root

const Trigger = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseContextMenu.Trigger ref={ref} className={className} {...props} />
})
Trigger.displayName = 'ContextMenu.Trigger'

const Portal = BaseContextMenu.Portal

const Backdrop = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.Backdrop> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['context-menu-backdrop', className].filter(Boolean).join(' ')
  return <BaseContextMenu.Backdrop ref={ref} className={classes} {...props} />
})
Backdrop.displayName = 'ContextMenu.Backdrop'

const Positioner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.Positioner> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['context-menu-positioner', className].filter(Boolean).join(' ')
  return <BaseContextMenu.Positioner ref={ref} className={classes} {...props} />
})
Positioner.displayName = 'ContextMenu.Positioner'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['context-menu-popup', className].filter(Boolean).join(' ')
  return <BaseContextMenu.Popup ref={ref} className={classes} {...props} />
})
Popup.displayName = 'ContextMenu.Popup'

const Arrow = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.Arrow> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['context-menu-arrow', className].filter(Boolean).join(' ')
  return <BaseContextMenu.Arrow ref={ref} className={classes} {...props} />
})
Arrow.displayName = 'ContextMenu.Arrow'

const Item = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.Item> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['context-menu-item', className].filter(Boolean).join(' ')
  return <BaseContextMenu.Item ref={ref} className={classes} {...props} />
})
Item.displayName = 'ContextMenu.Item'

const Separator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.Separator> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['context-menu-separator', className].filter(Boolean).join(' ')
  return <BaseContextMenu.Separator ref={ref} className={classes} {...props} />
})
Separator.displayName = 'ContextMenu.Separator'

const Group = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.Group> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseContextMenu.Group ref={ref} className={className} {...props} />
})
Group.displayName = 'ContextMenu.Group'

const GroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.GroupLabel> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['context-menu-group-label', className].filter(Boolean).join(' ')
  return <BaseContextMenu.GroupLabel ref={ref} className={classes} {...props} />
})
GroupLabel.displayName = 'ContextMenu.GroupLabel'

const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.RadioGroup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseContextMenu.RadioGroup ref={ref} className={className} {...props} />
})
RadioGroup.displayName = 'ContextMenu.RadioGroup'

const RadioItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.RadioItem> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['context-menu-radio-item', className].filter(Boolean).join(' ')
  return <BaseContextMenu.RadioItem ref={ref} className={classes} {...props} />
})
RadioItem.displayName = 'ContextMenu.RadioItem'

const CheckboxItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.CheckboxItem> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['context-menu-checkbox-item', className].filter(Boolean).join(' ')
  return <BaseContextMenu.CheckboxItem ref={ref} className={classes} {...props} />
})
CheckboxItem.displayName = 'ContextMenu.CheckboxItem'

const SubmenuRoot = BaseContextMenu.SubmenuRoot

const SubmenuTrigger = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.SubmenuTrigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['context-menu-submenu-trigger', className].filter(Boolean).join(' ')
  return <BaseContextMenu.SubmenuTrigger ref={ref} className={classes} {...props} />
})
SubmenuTrigger.displayName = 'ContextMenu.SubmenuTrigger'

export const ContextMenu = {
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
}
