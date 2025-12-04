import * as React from 'react'
import { Progress as BaseProgress } from '@base-ui-components/react/progress'
import '@symploke/design/components/progress.css'

const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseProgress.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['progress', className].filter(Boolean).join(' ')
  return <BaseProgress.Root ref={ref} className={classes} {...props} />
})
Root.displayName = 'Progress.Root'

const Label = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseProgress.Label> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['progress__label', className].filter(Boolean).join(' ')
  return <BaseProgress.Label ref={ref} className={classes} {...props} />
})
Label.displayName = 'Progress.Label'

const Track = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseProgress.Track> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['progress__track', className].filter(Boolean).join(' ')
  return <BaseProgress.Track ref={ref} className={classes} {...props} />
})
Track.displayName = 'Progress.Track'

const Indicator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseProgress.Indicator> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['progress__indicator', className].filter(Boolean).join(' ')
  return <BaseProgress.Indicator ref={ref} className={classes} {...props} />
})
Indicator.displayName = 'Progress.Indicator'

const Value = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseProgress.Value> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['progress__value', className].filter(Boolean).join(' ')
  return <BaseProgress.Value ref={ref} className={classes} {...props} />
})
Value.displayName = 'Progress.Value'

export const Progress = {
  Root,
  Label,
  Track,
  Indicator,
  Value,
}
