import * as React from 'react'
import { Button as BaseButton } from '@base-ui-components/react/button'
import '@symploke/design/components/button.css'

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
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    className,
  ].filter(Boolean).join(' ')

  return <BaseButton className={classes} {...props} />
}
