import type * as React from 'react'
import '@symploke/design/components/skeleton.css'

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  width?: string | number
  height?: string | number
}

export function Skeleton({ className, width, height, style, ...props }: SkeletonProps) {
  const classes = ['skeleton', className].filter(Boolean).join(' ')

  return (
    <div
      className={classes}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      {...props}
    />
  )
}

type SkeletonTextProps = React.HTMLAttributes<HTMLDivElement> & {
  lines?: number
}

export function SkeletonText({ lines = 1, className, ...props }: SkeletonTextProps) {
  return (
    <div className="skeleton-text-container" {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={`text-${i}`}
          className={['skeleton--text', className].filter(Boolean).join(' ')}
          style={{ width: i === lines - 1 && lines > 1 ? '70%' : '100%' }}
        />
      ))}
    </div>
  )
}

export function SkeletonCircle({
  size = 40,
  className,
  ...props
}: SkeletonProps & { size?: number }) {
  return (
    <Skeleton
      className={['skeleton--circle', className].filter(Boolean).join(' ')}
      width={size}
      height={size}
      {...props}
    />
  )
}

export function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const classes = ['skeleton skeleton--card', className].filter(Boolean).join(' ')
  return <div className={classes} {...props} />
}

type SkeletonTableProps = {
  rows?: number
  columns?: number
  columnWidths?: string[]
}

export function SkeletonTable({ rows = 5, columns = 4, columnWidths }: SkeletonTableProps) {
  const gridCols = columnWidths?.join(' ') || `repeat(${columns}, 1fr)`

  return (
    <div className="skeleton-table">
      <div className="skeleton-table__header" style={{ gridTemplateColumns: gridCols }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="skeleton-table__cell" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`row-${rowIdx}`}
          className="skeleton-table__row"
          style={{ gridTemplateColumns: gridCols }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={`cell-${rowIdx}-${colIdx}`} className="skeleton-table__cell" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonMetric({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['skeleton-metric', className].filter(Boolean).join(' ')} {...props}>
      <Skeleton className="skeleton-metric__value" />
      <Skeleton className="skeleton-metric__label" />
    </div>
  )
}

export function SkeletonTabs({ count = 2 }: { count?: number }) {
  return (
    <div className="skeleton-tabs">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={`tab-${i}`} className="skeleton-tabs__tab" />
      ))}
    </div>
  )
}

export function SkeletonSlider() {
  return (
    <div className="skeleton-slider">
      <Skeleton className="skeleton-slider__label" />
      <Skeleton className="skeleton-slider__track" />
    </div>
  )
}

export function SkeletonGraph({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={['skeleton-graph', className].filter(Boolean).join(' ')} {...props} />
}

export function SkeletonTypeRow() {
  return (
    <div className="skeleton-type-row">
      <Skeleton className="skeleton-type-row__badge" />
      <Skeleton className="skeleton-type-row__bar" />
      <Skeleton className="skeleton-type-row__score" />
    </div>
  )
}
