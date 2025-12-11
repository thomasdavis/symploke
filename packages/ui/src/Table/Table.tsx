import type { ReactNode } from 'react'
import Link from 'next/link'
import '@symploke/design/components/table.css'

export type ColumnWidth = 'auto' | 'shrink' | 'grow' | `${number}px` | `${number}%`

export type TableColumn<T> = {
  header: string
  accessor: keyof T | ((row: T) => ReactNode)
  className?: string
  /** Column width: 'auto' (default), 'shrink' (min content), 'grow' (flex), or explicit width */
  width?: ColumnWidth
  /** Text alignment for the column */
  align?: 'left' | 'center' | 'right'
}

export type TableProps<T> = {
  columns: TableColumn<T>[]
  data: T[]
  emptyMessage?: string
  className?: string
  getRowKey: (row: T) => string
  onRowClick?: (row: T) => void
  /** Generate href for each row - enables right-click > open in new tab */
  getRowHref?: (row: T) => string
  /** Whether to use striped rows */
  striped?: boolean
  /** Whether the table has a sticky header */
  stickyHeader?: boolean
  /** Compact mode with less padding */
  compact?: boolean
}

function getColumnStyle(column: TableColumn<unknown>): React.CSSProperties {
  const style: React.CSSProperties = {}

  if (column.width) {
    if (column.width === 'shrink') {
      style.width = '1%'
      style.whiteSpace = 'nowrap'
    } else if (column.width === 'grow') {
      style.width = '100%'
    } else if (column.width !== 'auto') {
      style.width = column.width
    }
  }

  if (column.align) {
    style.textAlign = column.align
  }

  return style
}

export function Table<T>({
  columns,
  data,
  emptyMessage = 'No data available',
  className,
  getRowKey,
  onRowClick,
  getRowHref,
  striped = false,
  stickyHeader = false,
  compact = false,
}: TableProps<T>) {
  const isInteractive = onRowClick || getRowHref

  const tableClasses = [
    'table',
    striped && 'table--striped',
    stickyHeader && 'table--sticky-header',
    compact && 'table--compact',
    isInteractive && 'table--interactive',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={`table-container ${className || ''}`}>
      <table className={tableClasses}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header} style={getColumnStyle(column as TableColumn<unknown>)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr className="table__empty-row">
              <td colSpan={columns.length} className="table__empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => {
              const rowKey = getRowKey(row)
              const href = getRowHref?.(row)

              return (
                <tr
                  key={rowKey}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={isInteractive ? 'table__row--interactive' : ''}
                >
                  {columns.map((column, colIndex) => {
                    const value =
                      typeof column.accessor === 'function'
                        ? column.accessor(row)
                        : (row[column.accessor] as ReactNode)

                    const cellStyle = getColumnStyle(column as TableColumn<unknown>)
                    const cellClass = column.className || ''

                    // For linkable rows, wrap cell content in <a> tags
                    // The first cell gets a full-row pseudo-element for click area
                    if (href) {
                      return (
                        <td
                          key={column.header}
                          className={`table__cell--linkable ${cellClass}`}
                          style={cellStyle}
                        >
                          <Link
                            href={href}
                            className={`table__cell-link ${colIndex === 0 ? 'table__cell-link--primary' : ''}`}
                          >
                            {value}
                          </Link>
                        </td>
                      )
                    }

                    return (
                      <td key={column.header} className={cellClass} style={cellStyle}>
                        {value}
                      </td>
                    )
                  })}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
