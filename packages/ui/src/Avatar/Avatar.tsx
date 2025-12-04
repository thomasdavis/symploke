import * as React from 'react'
import { Avatar as BaseAvatar } from '@base-ui-components/react/avatar'

const Root = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseAvatar.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAvatar.Root
      ref={ref}
      className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className || ''}`}
      {...props}
    />
  )
})
Root.displayName = 'Avatar.Root'

const Image = React.forwardRef<
  HTMLImageElement,
  React.ComponentPropsWithoutRef<typeof BaseAvatar.Image> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAvatar.Image
      ref={ref}
      className={`aspect-square h-full w-full object-cover ${className || ''}`}
      {...props}
    />
  )
})
Image.displayName = 'Avatar.Image'

const Fallback = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseAvatar.Fallback> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseAvatar.Fallback
      ref={ref}
      className={`flex h-full w-full items-center justify-center rounded-full bg-gray-100 text-gray-600 ${className || ''}`}
      {...props}
    />
  )
})
Fallback.displayName = 'Avatar.Fallback'

export const Avatar = {
  Root,
  Image,
  Fallback,
}
