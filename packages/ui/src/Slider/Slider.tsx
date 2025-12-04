import * as React from 'react'
import { Slider as BaseSlider } from '@base-ui-components/react/slider'

const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSlider.Root> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSlider.Root
      ref={ref}
      className={`relative flex w-full touch-none select-none items-center ${className || ''}`}
      {...props}
    />
  )
})
Root.displayName = 'Slider.Root'

const Control = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSlider.Control> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSlider.Control
      ref={ref}
      className={`relative flex w-full touch-none select-none items-center ${className || ''}`}
      {...props}
    />
  )
})
Control.displayName = 'Slider.Control'

const Track = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSlider.Track> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSlider.Track
      ref={ref}
      className={`relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200 ${className || ''}`}
      {...props}
    />
  )
})
Track.displayName = 'Slider.Track'

const Indicator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSlider.Indicator> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSlider.Indicator
      ref={ref}
      className={`absolute h-full bg-gray-900 ${className || ''}`}
      {...props}
    />
  )
})
Indicator.displayName = 'Slider.Indicator'

const Thumb = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSlider.Thumb> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSlider.Thumb
      ref={ref}
      className={`block h-5 w-5 rounded-full border-2 border-gray-900 bg-white ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${className || ''}`}
      {...props}
    />
  )
})
Thumb.displayName = 'Slider.Thumb'

const Value = React.forwardRef<
  HTMLOutputElement,
  React.ComponentPropsWithoutRef<typeof BaseSlider.Value> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <BaseSlider.Value ref={ref} className={`text-sm text-gray-600 ${className || ''}`} {...props} />
  )
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
