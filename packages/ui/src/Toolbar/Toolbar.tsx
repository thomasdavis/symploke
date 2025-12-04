import * as React from 'react'
import { Toolbar as BaseToolbar } from '@base-ui-components/react/toolbar'
import '@symploke/design/components/toolbar.css'

export interface ToolbarRootProps extends React.ComponentPropsWithoutRef<typeof BaseToolbar.Root> {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const Root = React.forwardRef<HTMLDivElement, ToolbarRootProps>(
  ({ size = 'md', className, ...props }, ref) => {
    const classes = ['toolbar', `toolbar--${size}`, className].filter(Boolean).join(' ')
    return <BaseToolbar.Root ref={ref} className={classes} {...props} />
  },
)
Root.displayName = 'Toolbar.Root'

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseToolbar.Button> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['toolbar__button', className].filter(Boolean).join(' ')
  return <BaseToolbar.Button ref={ref} className={classes} {...props} />
})
Button.displayName = 'Toolbar.Button'

const Link = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<typeof BaseToolbar.Link> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['toolbar__link', className].filter(Boolean).join(' ')
  return <BaseToolbar.Link ref={ref} className={classes} {...props} />
})
Link.displayName = 'Toolbar.Link'

const Separator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseToolbar.Separator> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['toolbar__separator', className].filter(Boolean).join(' ')
  return <BaseToolbar.Separator ref={ref} className={classes} {...props} />
})
Separator.displayName = 'Toolbar.Separator'

const Group = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseToolbar.Group> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['toolbar__group', className].filter(Boolean).join(' ')
  return <BaseToolbar.Group ref={ref} className={classes} {...props} />
})
Group.displayName = 'Toolbar.Group'

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<typeof BaseToolbar.Input> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['toolbar__input', className].filter(Boolean).join(' ')
  return <BaseToolbar.Input ref={ref} className={classes} {...props} />
})
Input.displayName = 'Toolbar.Input'

export const Toolbar = {
  Root,
  Button,
  Link,
  Separator,
  Group,
  Input,
}
