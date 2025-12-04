import * as React from 'react'
import { Separator as BaseSeparator } from '@base-ui-components/react/separator'

export const Separator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSeparator> & {
    className?: string
    orientation?: 'horizontal' | 'vertical'
  }
>(({ className, orientation = 'horizontal', ...props }, ref) => {
  return (
    <BaseSeparator
      ref={ref}
      orientation={orientation}
      className={`shrink-0 bg-gray-200 ${
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]'
      } ${className || ''}`}
      {...props}
    />
  )
})
Separator.displayName = 'Separator'
