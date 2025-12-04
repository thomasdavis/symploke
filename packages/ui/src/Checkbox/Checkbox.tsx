import * as React from 'react'
import { Checkbox as BaseCheckbox } from '@base-ui-components/react/checkbox'

const Root = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseCheckbox.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseCheckbox.Root
      ref={ref}
      className={`peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-gray-900 data-[checked]:text-white ${className || ''}`}
      {...props}
    />
  )
})
Root.displayName = 'Checkbox.Root'

const Indicator = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseCheckbox.Indicator> & {
    className?: string
  }
>(({ className, children, ...props }, ref) => {
  return (
    <BaseCheckbox.Indicator
      ref={ref}
      className={`flex items-center justify-center text-current ${className || ''}`}
      {...props}
    >
      {children || (
        <svg
          width="10"
          height="8"
          viewBox="0 0 10 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 4L3.5 6.5L9 1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </BaseCheckbox.Indicator>
  )
})
Indicator.displayName = 'Checkbox.Indicator'

export const Checkbox = {
  Root,
  Indicator,
}
