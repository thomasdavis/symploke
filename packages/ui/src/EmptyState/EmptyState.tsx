import * as React from 'react'
import { Button } from '../Button/Button'
import '@symploke/design/components/empty-state.css'

export type EmptyStateProps = {
  title: string
  description: string
  actionLabel: string
  actionHref: string
  className?: string
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div className={['empty-state', className].filter(Boolean).join(' ')}>
      <div className="empty-state__content">
        <h2 className="empty-state__title">{title}</h2>
        <p className="empty-state__description">{description}</p>
        <a href={actionHref} className="empty-state__action">
          <Button variant="primary" size="lg">
            {actionLabel}
          </Button>
        </a>
      </div>
    </div>
  )
}
