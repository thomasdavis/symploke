import { Separator as BaseSeparator } from '@base-ui-components/react/separator'
import * as React from 'react'
import '@symploke/design/components/separator.css'

export const Separator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSeparator> & {
    className?: string
    orientation?: 'horizontal' | 'vertical'
  }
>(({ className, orientation = 'horizontal', ...props }, ref) => {
  const classes = ['separator', `separator--${orientation}`, className].filter(Boolean).join(' ')

  return <BaseSeparator ref={ref} orientation={orientation} className={classes} {...props} />
})
Separator.displayName = 'Separator'
