import * as React from 'react'
import { Radio as BaseRadio } from '@base-ui-components/react/radio'

const Root = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseRadio.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseRadio.Root
      ref={ref}
      className={`aspect-square h-4 w-4 rounded-full border border-gray-300 text-gray-900 ring-offset-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
Root.displayName = 'Radio.Root'

const Indicator = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseRadio.Indicator> & {
    className?: string
  }
>(({ className, children, ...props }, ref) => {
  return (
    <BaseRadio.Indicator
      ref={ref}
      className={`flex items-center justify-center ${className || ''}`}
      {...props}
    >
      {children || (
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="4" cy="4" r="4" fill="currentColor" />
        </svg>
      )}
    </BaseRadio.Indicator>
  )
})
Indicator.displayName = 'Radio.Indicator'

export const Radio = {
  Root,
  Indicator,
}
