'use client'

import { useRef, useCallback, useEffect, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import '@symploke/design/components/virtual-table.css'

export type ColumnWidth = 'auto' | 'shrink' | 'grow' | `${number}px` | `${number}%`

export type VirtualTableColumn<T> = {
  header: string
  accessor: keyof T | ((row: T) => ReactNode)
  width?: ColumnWidth
  align?: 'left' | 'center' | 'right'
}

export type VirtualTableToolbarProps = {
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  isSearching?: boolean
}

export type VirtualTableProps<T> = {
  columns: VirtualTableColumn<T>[]
  data: T[]
  getRowKey: (row: T) => string
  estimatedRowHeight?: number
  overscan?: number
  onLoadMore?: () => void
  hasMore?: boolean
  isLoadingMore?: boolean
  totalCount?: number
  emptyMessage?: string
  className?: string
  compact?: boolean
  toolbar?: VirtualTableToolbarProps
}

function getGridTemplateColumns<T>(columns: VirtualTableColumn<T>[]): string {
  return columns
    .map((col) => {
      if (!col.width || col.width === 'auto') return 'auto'
      if (col.width === 'shrink') return 'max-content'
      if (col.width === 'grow') return '1fr'
      return col.width
    })
    .join(' ')
}

export function VirtualTable<T>({
  columns,
  data,
  getRowKey,
  estimatedRowHeight = 52,
  overscan = 10,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  totalCount,
  emptyMessage = 'No data available',
  className,
  compact = false,
  toolbar,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan,
  })

  const virtualItems = virtualizer.getVirtualItems()

  // Infinite scroll trigger
  const handleScroll = useCallback(() => {
    if (!parentRef.current || !onLoadMore || !hasMore || isLoadingMore) return

    const { scrollTop, scrollHeight, clientHeight } = parentRef.current
    const scrollThreshold = scrollHeight - clientHeight - 200 // 200px before bottom

    if (scrollTop >= scrollThreshold) {
      onLoadMore()
    }
  }, [onLoadMore, hasMore, isLoadingMore])

  useEffect(() => {
    const scrollElement = parentRef.current
    if (!scrollElement) return

    scrollElement.addEventListener('scroll', handleScroll)
    return () => scrollElement.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const gridTemplateColumns = getGridTemplateColumns(columns)

  const containerClasses = ['virtual-table', compact && 'virtual-table--compact', className]
    .filter(Boolean)
    .join(' ')

  const renderToolbar = () => {
    if (!toolbar) return null
    return (
      <div className="virtual-table__toolbar">
        <div className="virtual-table__search">
          <svg
            className="virtual-table__search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            className="virtual-table__search-input"
            placeholder={toolbar.searchPlaceholder ?? 'Filter...'}
            value={toolbar.search ?? ''}
            onChange={(e) => toolbar.onSearchChange?.(e.target.value)}
          />
          {toolbar.isSearching && <div className="virtual-table__search-spinner" />}
          {!toolbar.isSearching && toolbar.search && (
            <button
              type="button"
              className="virtual-table__search-clear"
              onClick={() => toolbar.onSearchChange?.('')}
              aria-label="Clear filter"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    )
  }

  if (data.length === 0 && !isLoadingMore) {
    return (
      <div className={containerClasses}>
        {renderToolbar()}
        <div className="virtual-table__header" style={{ gridTemplateColumns }}>
          {columns.map((col) => (
            <div
              key={col.header}
              className={`virtual-table__header-cell ${col.align === 'right' ? 'virtual-table__header-cell--right' : ''} ${col.align === 'center' ? 'virtual-table__header-cell--center' : ''}`}
            >
              {col.header}
            </div>
          ))}
        </div>
        <div className="virtual-table__empty">
          {toolbar?.search ? `No results for "${toolbar.search}"` : emptyMessage}
        </div>
      </div>
    )
  }

  return (
    <div className={containerClasses}>
      {renderToolbar()}
      {/* Header */}
      <div className="virtual-table__header" style={{ gridTemplateColumns }}>
        {columns.map((col) => (
          <div
            key={col.header}
            className={`virtual-table__header-cell ${col.align === 'right' ? 'virtual-table__header-cell--right' : ''} ${col.align === 'center' ? 'virtual-table__header-cell--center' : ''}`}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Scrollable body */}
      <div className="virtual-table__scroll" ref={parentRef}>
        <div className="virtual-table__body" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualItems.map((virtualRow) => {
            const row = data[virtualRow.index]
            if (!row) return null
            const rowKey = getRowKey(row)

            return (
              <div
                key={rowKey}
                className="virtual-table__row"
                style={{
                  gridTemplateColumns,
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {columns.map((col) => {
                  const value =
                    typeof col.accessor === 'function'
                      ? col.accessor(row)
                      : (row[col.accessor] as ReactNode)

                  return (
                    <div
                      key={col.header}
                      className={`virtual-table__cell ${col.align === 'right' ? 'virtual-table__cell--right' : ''} ${col.align === 'center' ? 'virtual-table__cell--center' : ''}`}
                    >
                      {value}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="virtual-table__footer">
        <span className="virtual-table__count">
          {totalCount !== undefined
            ? `${data.length.toLocaleString()} of ${totalCount.toLocaleString()} items`
            : `${data.length.toLocaleString()} items`}
        </span>
        {isLoadingMore && (
          <div className="virtual-table__loading">
            <div className="virtual-table__loading-spinner" />
            <span>Loading more...</span>
          </div>
        )}
        {!isLoadingMore && hasMore && (
          <span style={{ color: 'var(--color-fg-subtle)' }}>Scroll for more</span>
        )}
      </div>
    </div>
  )
}
