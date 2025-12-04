import * as React from 'react'
import { Meter as BaseMeter } from '@base-ui-components/react/meter'
import '@symploke/design/components/meter.css'

const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMeter.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['meter', className].filter(Boolean).join(' ')
  return (
    <BaseMeter.Root
      ref={ref}
      className={classes}
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
  const classes = ['meter__label', className].filter(Boolean).join(' ')
  return (
    <BaseMeter.Label
      ref={ref}
      className={classes}
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
  const classes = ['meter__track', className].filter(Boolean).join(' ')
  return (
    <BaseMeter.Track
      ref={ref}
      className={classes}
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
  const classes = ['meter__indicator', className].filter(Boolean).join(' ')
  return (
    <BaseMeter.Indicator
      ref={ref}
      className={classes}
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
  const classes = ['meter__value', className].filter(Boolean).join(' ')
  return (
    <BaseMeter.Value
      ref={ref}
      className={classes}
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
