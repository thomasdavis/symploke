import { Checkbox as BaseCheckbox } from '@base-ui-components/react/checkbox'
import * as React from 'react'
import '@symploke/design/src/components/checkbox.css'

const Root = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseCheckbox.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseCheckbox.Root ref={ref} className={`checkbox-root ${className || ''}`} {...props} />
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
      className={`checkbox-indicator ${className || ''}`}
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
          <title>Checkmark</title>
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
