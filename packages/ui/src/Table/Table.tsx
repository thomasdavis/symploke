import type { ReactNode } from 'react'
import '@symploke/design/components/table.css'

export type TableColumn<T> = {
  header: string
  accessor: keyof T | ((row: T) => ReactNode)
  className?: string
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
}

export function Table<T>({
  columns,
  data,
  emptyMessage = 'No data available',
  className,
  getRowKey,
  onRowClick,
  getRowHref,
}: TableProps<T>) {
  const isClickable = onRowClick || getRowHref

  return (
    <div className={`table-container ${className || ''}`}>
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table__empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => {
              const rowKey = getRowKey(row)
              const href = getRowHref?.(row)
              const cells = columns.map((column) => {
                const value =
                  typeof column.accessor === 'function'
                    ? column.accessor(row)
                    : row[column.accessor]
                return (
                  <td key={column.header} className={column.className}>
                    {value as ReactNode}
                  </td>
                )
              })

              // If href is provided, wrap row in a link for proper browser behavior
              if (href) {
                return (
                  <tr key={rowKey} className="table__row--linkable">
                    <td colSpan={columns.length} className="table__row-link-cell">
                      <a href={href} className="table__row-link">
                        <table className="table__row-link-table">
                          <tbody>
                            <tr>{cells}</tr>
                          </tbody>
                        </table>
                      </a>
                    </td>
                  </tr>
                )
              }

              return (
                <tr
                  key={rowKey}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={isClickable ? 'table__row--clickable' : ''}
                >
                  {cells}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
