import type { ReactNode } from 'react'
import '@symploke/design/components/page-header.css'

export type PageHeaderProps = {
  title: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, actions, className }: PageHeaderProps) {
  return (
    <div className={`page-header ${className || ''}`}>
      <h1 className="page-header__title">{title}</h1>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  )
}
