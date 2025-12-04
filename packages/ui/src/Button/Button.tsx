import * as React from 'react'
import { Button as BaseButton } from '@base-ui-components/react/button'

export type ButtonProps = React.ComponentPropsWithoutRef<typeof BaseButton> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-muted text-foreground hover:bg-muted/80',
    ghost: 'hover:bg-muted',
  }

  return (
    <BaseButton
      className={`inline-flex items-center justify-center px-4 py-2 rounded-md font-medium ${variantClasses[variant]} ${className || ''}`}
      {...props}
    />
  )
}
