import * as React from 'react'
import { Radio as BaseRadio } from '@base-ui-components/react/radio'
import '@symploke/design/src/components/radio.css'

const Root = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseRadio.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseRadio.Root ref={ref} className={`radio ${className || ''}`} {...props} />
})
Root.displayName = 'Radio.Root'

const Indicator = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseRadio.Indicator> & {
    className?: string
  }
>(({ className, children, ...props }, ref) => {
  return (
    <BaseRadio.Indicator ref={ref} className={`radio__indicator ${className || ''}`} {...props}>
      {children || (
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <title>Radio indicator</title>
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
