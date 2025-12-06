import { Slider as BaseSlider } from '@base-ui-components/react/slider'
import * as React from 'react'
import '@symploke/design/components/slider.css'

const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSlider.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['slider', className].filter(Boolean).join(' ')
  return <BaseSlider.Root ref={ref} className={classes} {...props} />
})
Root.displayName = 'Slider.Root'

const Control = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSlider.Control> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['slider__control', className].filter(Boolean).join(' ')
  return <BaseSlider.Control ref={ref} className={classes} {...props} />
})
Control.displayName = 'Slider.Control'

const Track = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSlider.Track> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['slider__track', className].filter(Boolean).join(' ')
  return <BaseSlider.Track ref={ref} className={classes} {...props} />
})
Track.displayName = 'Slider.Track'

const Indicator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSlider.Indicator> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['slider__indicator', className].filter(Boolean).join(' ')
  return <BaseSlider.Indicator ref={ref} className={classes} {...props} />
})
Indicator.displayName = 'Slider.Indicator'

const Thumb = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSlider.Thumb> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['slider__thumb', className].filter(Boolean).join(' ')
  return <BaseSlider.Thumb ref={ref} className={classes} {...props} />
})
Thumb.displayName = 'Slider.Thumb'

const Value = React.forwardRef<
  HTMLOutputElement,
  React.ComponentPropsWithoutRef<typeof BaseSlider.Value> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = ['slider__value', className].filter(Boolean).join(' ')
  return <BaseSlider.Value ref={ref} className={classes} {...props} />
})
Value.displayName = 'Slider.Value'

export const Slider = {
  Root,
  Control,
  Track,
  Indicator,
  Thumb,
  Value,
}
