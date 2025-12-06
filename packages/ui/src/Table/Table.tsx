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
}

export function Table<T>({
  columns,
  data,
  emptyMessage = 'No data available',
  className,
  getRowKey,
  onRowClick,
}: TableProps<T>) {
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
            data.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'table__row--clickable' : ''}
              >
                {columns.map((column) => {
                  const value =
                    typeof column.accessor === 'function'
                      ? column.accessor(row)
                      : row[column.accessor]
                  return (
                    <td key={column.header} className={column.className}>
                      {value as ReactNode}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
