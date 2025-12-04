import * as React from 'react'
import { Meter as BaseMeter } from '@base-ui-components/react/meter'

const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMeter.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMeter.Root
      ref={ref}
      className={`space-y-2 ${className || ''}`}
      {...props}
    />
  )
})
Root.displayName = 'Meter.Root'

const Label = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseMeter.Label> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMeter.Label
      ref={ref}
      className={`text-sm font-medium ${className || ''}`}
      {...props}
    />
  )
})
Label.displayName = 'Meter.Label'

const Track = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMeter.Track> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMeter.Track
      ref={ref}
      className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className || ''}`}
      {...props}
    />
  )
})
Track.displayName = 'Meter.Track'

const Indicator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMeter.Indicator> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMeter.Indicator
      ref={ref}
      className={`h-full w-full flex-1 bg-gray-900 transition-all ${className || ''}`}
      {...props}
    />
  )
})
Indicator.displayName = 'Meter.Indicator'

const Value = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseMeter.Value> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseMeter.Value
      ref={ref}
      className={`text-sm text-gray-600 ${className || ''}`}
      {...props}
    />
  )
})
Value.displayName = 'Meter.Value'

export const Meter = {
  Root,
  Label,
  Track,
  Indicator,
  Value,
}
