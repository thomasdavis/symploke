import type * as React from 'react'
import '@symploke/design/components/card.css'

export type CardProps = React.HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  const classes = ['card', className].filter(Boolean).join(' ')

  return <div className={classes} {...props} />
}

export function CardHeader({ className, ...props }: CardProps) {
  const classes = ['card__header', className].filter(Boolean).join(' ')

  return <div className={classes} {...props} />
}

export function CardTitle({ className, ...props }: CardProps) {
  const classes = ['card__title', className].filter(Boolean).join(' ')

  return <h3 className={classes} {...props} />
}

export function CardContent({ className, ...props }: CardProps) {
  const classes = ['card__body', className].filter(Boolean).join(' ')

  return <div className={classes} {...props} />
}
