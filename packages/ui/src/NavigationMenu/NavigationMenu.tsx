import { NavigationMenu as BaseNavigationMenu } from '@base-ui-components/react/navigation-menu'
import * as React from 'react'
import '@symploke/design/components/navigation-menu.css'

const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['navigation-menu', className].filter(Boolean).join(' ')
  return <BaseNavigationMenu.Root ref={ref} className={classes} {...props} />
})
Root.displayName = 'NavigationMenu.Root'

const List = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.List> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['navigation-menu__list', className].filter(Boolean).join(' ')
  return <BaseNavigationMenu.List ref={ref} className={classes} {...props} />
})
List.displayName = 'NavigationMenu.List'

const Item = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Item> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['navigation-menu__item', className].filter(Boolean).join(' ')
  return <BaseNavigationMenu.Item ref={ref} className={classes} {...props} />
})
Item.displayName = 'NavigationMenu.Item'

const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Trigger> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['navigation-menu__trigger', className].filter(Boolean).join(' ')
  return <BaseNavigationMenu.Trigger ref={ref} className={classes} {...props} />
})
Trigger.displayName = 'NavigationMenu.Trigger'

const Icon = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Icon> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['navigation-menu__icon', className].filter(Boolean).join(' ')
  return <BaseNavigationMenu.Icon ref={ref} className={classes} {...props} />
})
Icon.displayName = 'NavigationMenu.Icon'

const Content = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Content> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['navigation-menu__content', className].filter(Boolean).join(' ')
  return <BaseNavigationMenu.Content ref={ref} className={classes} {...props} />
})
Content.displayName = 'NavigationMenu.Content'

const Link = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Link> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['navigation-menu__link', className].filter(Boolean).join(' ')
  return <BaseNavigationMenu.Link ref={ref} className={classes} {...props} />
})
Link.displayName = 'NavigationMenu.Link'

const Portal = BaseNavigationMenu.Portal

const Positioner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Positioner> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['navigation-menu__positioner', className].filter(Boolean).join(' ')
  return <BaseNavigationMenu.Positioner ref={ref} className={classes} {...props} />
})
Positioner.displayName = 'NavigationMenu.Positioner'

const Popup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Popup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['navigation-menu__popup', className].filter(Boolean).join(' ')
  return <BaseNavigationMenu.Popup ref={ref} className={classes} {...props} />
})
Popup.displayName = 'NavigationMenu.Popup'

const Viewport = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Viewport> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['navigation-menu__viewport', className].filter(Boolean).join(' ')
  return <BaseNavigationMenu.Viewport ref={ref} className={classes} {...props} />
})
Viewport.displayName = 'NavigationMenu.Viewport'

const Arrow = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Arrow> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['navigation-menu__arrow', className].filter(Boolean).join(' ')
  return <BaseNavigationMenu.Arrow ref={ref} className={classes} {...props} />
})
Arrow.displayName = 'NavigationMenu.Arrow'

const Backdrop = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Backdrop> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['navigation-menu__backdrop', className].filter(Boolean).join(' ')
  return <BaseNavigationMenu.Backdrop ref={ref} className={classes} {...props} />
})
Backdrop.displayName = 'NavigationMenu.Backdrop'

export const NavigationMenu = {
  Root,
  List,
  Item,
  Trigger,
  Icon,
  Content,
  Link,
  Portal,
  Positioner,
  Popup,
  Viewport,
  Arrow,
  Backdrop,
}
