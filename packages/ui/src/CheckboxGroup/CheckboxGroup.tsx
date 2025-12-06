import { CheckboxGroup as BaseCheckboxGroup } from '@base-ui-components/react/checkbox-group'
import * as React from 'react'
import '@symploke/design/src/components/checkbox-group.css'

export const CheckboxGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseCheckboxGroup> & {
    className?: string
  }
>(({ className, ...props }, ref) => {
  return <BaseCheckboxGroup ref={ref} className={`checkbox-group ${className || ''}`} {...props} />
})
CheckboxGroup.displayName = 'CheckboxGroup'
