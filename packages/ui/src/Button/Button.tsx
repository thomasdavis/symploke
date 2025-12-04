import * as React from 'react'
import { Button as BaseButton } from '@base-ui-components/react/button'

export type ButtonProps = React.ComponentPropsWithoutRef<typeof BaseButton> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-muted text-foreground hover:bg-muted/80',
    ghost: 'hover:bg-muted',
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <BaseButton
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`}
      {...props}
    />
  )
}
