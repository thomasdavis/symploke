import * as React from 'react'
import { ScrollArea as BaseScrollArea } from '@base-ui-components/react/scroll-area'

const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseScrollArea.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseScrollArea.Root
      ref={ref}
      className={`relative overflow-hidden ${className || ''}`}
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
  return (
    <BaseScrollArea.Viewport
      ref={ref}
      className={`h-full w-full rounded-[inherit] ${className || ''}`}
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
  return (
    <BaseScrollArea.Content
      ref={ref}
      className={className}
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
  return (
    <BaseScrollArea.Scrollbar
      ref={ref}
      className={`flex touch-none select-none transition-colors data-[orientation=vertical]:h-full data-[orientation=horizontal]:h-2.5 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col ${className || ''}`}
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
  return (
    <BaseScrollArea.Thumb
      ref={ref}
      className={`relative flex-1 rounded-full bg-gray-300 hover:bg-gray-400 ${className || ''}`}
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
  return (
    <BaseScrollArea.Corner
      ref={ref}
      className={`bg-gray-100 ${className || ''}`}
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
