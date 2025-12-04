import * as React from 'react'
import { ScrollArea as BaseScrollArea } from '@base-ui-components/react/scroll-area'
import '@symploke/design/components/scroll-area.css'

const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseScrollArea.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['scroll-area', className].filter(Boolean).join(' ')
  return (
    <BaseScrollArea.Root
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
Root.displayName = 'ScrollArea.Root'

const Viewport = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseScrollArea.Viewport> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['scroll-area__viewport', className].filter(Boolean).join(' ')
  return (
    <BaseScrollArea.Viewport
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
Viewport.displayName = 'ScrollArea.Viewport'

const Content = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseScrollArea.Content> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['scroll-area__content', className].filter(Boolean).join(' ')
  return (
    <BaseScrollArea.Content
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
Content.displayName = 'ScrollArea.Content'

const Scrollbar = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseScrollArea.Scrollbar> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['scroll-area__scrollbar', className].filter(Boolean).join(' ')
  return (
    <BaseScrollArea.Scrollbar
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
Scrollbar.displayName = 'ScrollArea.Scrollbar'

const Thumb = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseScrollArea.Thumb> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['scroll-area__thumb', className].filter(Boolean).join(' ')
  return (
    <BaseScrollArea.Thumb
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
Thumb.displayName = 'ScrollArea.Thumb'

const Corner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseScrollArea.Corner> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['scroll-area__corner', className].filter(Boolean).join(' ')
  return (
    <BaseScrollArea.Corner
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
Corner.displayName = 'ScrollArea.Corner'

export const ScrollArea = {
  Root,
  Viewport,
  Content,
  Scrollbar,
  Thumb,
  Corner,
}
