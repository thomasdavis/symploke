import * as React from 'react'
import { Switch as BaseSwitch } from '@base-ui-components/react/switch'

const Root = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseSwitch.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSwitch.Root
      ref={ref}
      className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-gray-900 data-[unchecked]:bg-gray-200 ${className || ''}`}
      {...props}
    />
  )
})
Root.displayName = 'Switch.Root'

const Thumb = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseSwitch.Thumb> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSwitch.Thumb
      ref={ref}
      className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform data-[checked]:translate-x-5 data-[unchecked]:translate-x-0 ${className || ''}`}
      {...props}
    />
  )
})
Thumb.displayName = 'Switch.Thumb'

export const Switch = {
  Root,
  Thumb,
}
