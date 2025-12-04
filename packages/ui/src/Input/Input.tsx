import * as React from 'react'
import { Input as BaseInput } from '@base-ui-components/react/input'
import '@symploke/design/components/input.css'

export const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<typeof BaseInput> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  const classes = [
    'input',
    className,
  ].filter(Boolean).join(' ')

  return (
    <BaseInput
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
Input.displayName = 'Input'
