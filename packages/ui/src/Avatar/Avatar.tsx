import { Avatar as BaseAvatar } from '@base-ui-components/react/avatar'
import * as React from 'react'
import '@symploke/design/components/avatar.css'

const Root = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseAvatar.Root> & {
    className?: string
    size?: 'sm' | 'md' | 'lg'
  }
>(({ className, size = 'md', ...props }, ref) => {
  const classes = ['avatar', `avatar--${size}`, className].filter(Boolean).join(' ')
  return <BaseAvatar.Root ref={ref} className={classes} {...props} />
})
Root.displayName = 'Avatar.Root'

const Image = React.forwardRef<
  HTMLImageElement,
  React.ComponentPropsWithoutRef<typeof BaseAvatar.Image> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['avatar__image', className].filter(Boolean).join(' ')
  return <BaseAvatar.Image ref={ref} className={classes} {...props} />
})
Image.displayName = 'Avatar.Image'

const Fallback = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseAvatar.Fallback> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['avatar__fallback', className].filter(Boolean).join(' ')
  return <BaseAvatar.Fallback ref={ref} className={classes} {...props} />
})
Fallback.displayName = 'Avatar.Fallback'

export const Avatar = {
  Root,
  Image,
  Fallback,
}
