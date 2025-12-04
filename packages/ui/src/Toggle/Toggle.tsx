import * as React from 'react'
import { Toggle as BaseToggle } from '@base-ui-components/react/toggle'

export const Toggle = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseToggle> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseToggle
      ref={ref}
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors hover:bg-gray-100 hover:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[pressed]:bg-gray-100 data-[pressed]:text-gray-900 h-10 px-3 ${className || ''}`}
      {...props}
    />
  )
})
Toggle.displayName = 'Toggle'
