import * as React from 'react'
import { Toolbar as BaseToolbar } from '@base-ui-components/react/toolbar'

const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseToolbar.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseToolbar.Root
      ref={ref}
      className={`flex items-center gap-1 rounded-md border border-gray-200 bg-white p-1 ${className || ''}`}
      {...props}
    />
  )
})
Root.displayName = 'Toolbar.Root'

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseToolbar.Button> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseToolbar.Button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-sm px-3 py-2 text-sm font-medium ring-offset-white transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[pressed]:bg-gray-100 ${className || ''}`}
      {...props}
    />
  )
})
Button.displayName = 'Toolbar.Button'

const Link = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<typeof BaseToolbar.Link> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseToolbar.Link
      ref={ref}
      className={`inline-flex items-center justify-center rounded-sm px-3 py-2 text-sm font-medium ring-offset-white transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
Link.displayName = 'Toolbar.Link'

const Separator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseToolbar.Separator> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseToolbar.Separator
      ref={ref}
      className={`mx-2 h-6 w-px bg-gray-200 ${className || ''}`}
      {...props}
    />
  )
})
Separator.displayName = 'Toolbar.Separator'

const Group = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseToolbar.Group> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseToolbar.Group
      ref={ref}
      className={`flex items-center gap-1 ${className || ''}`}
      {...props}
    />
  )
})
Group.displayName = 'Toolbar.Group'

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<typeof BaseToolbar.Input> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseToolbar.Input
      ref={ref}
      className={`flex h-8 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
      {...props}
    />
  )
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
