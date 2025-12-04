import * as React from 'react'
import { Progress as BaseProgress } from '@base-ui-components/react/progress'

const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseProgress.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseProgress.Root
      ref={ref}
      className={`space-y-2 ${className || ''}`}
      {...props}
    />
  )
})
Root.displayName = 'Progress.Root'

const Label = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseProgress.Label> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseProgress.Label
      ref={ref}
      className={`text-sm font-medium ${className || ''}`}
      {...props}
    />
  )
})
Label.displayName = 'Progress.Label'

const Track = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseProgress.Track> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseProgress.Track
      ref={ref}
      className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className || ''}`}
      {...props}
    />
  )
})
Track.displayName = 'Progress.Track'

const Indicator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseProgress.Indicator> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseProgress.Indicator
      ref={ref}
      className={`h-full w-full flex-1 bg-gray-900 transition-all data-[indeterminate]:animate-pulse ${className || ''}`}
      {...props}
    />
  )
})
Indicator.displayName = 'Progress.Indicator'

const Value = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseProgress.Value> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseProgress.Value
      ref={ref}
      className={`text-sm text-gray-600 ${className || ''}`}
      {...props}
    />
  )
})
Value.displayName = 'Progress.Value'

export const Progress = {
  Root,
  Label,
  Track,
  Indicator,
  Value,
}
