'use client'

import { useRef, useCallback, useEffect, useState, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import '@symploke/design/components/virtual-table.css'
import '@symploke/design/components/virtual-log-table.css'

export type LogLevel = 'info' | 'debug' | 'warn' | 'error'

export type LogEntry = {
  id: string
  timestamp: string
  level: LogLevel
  message: string
  data?: Record<string, unknown>
}

export type VirtualLogTableProps = {
  logs: LogEntry[]
  totalCount?: number
  emptyMessage?: string
  className?: string
  formatTime?: (timestamp: string) => string
  /** Slot for additional toolbar content (e.g., level filter tabs) */
  toolbarExtra?: ReactNode
  /** Text filter */
  filter?: string
  onFilterChange?: (value: string) => void
  filterPlaceholder?: string
}

function defaultFormatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function LogLevelBadge({ level }: { level: LogLevel }) {
  return <span className={`virtual-log__level virtual-log__level--${level}`}>{level}</span>
}

function LogDataValue({ value }: { value: unknown }) {
  if (value === null) return <span className="virtual-log__data-null">null</span>
  if (value === undefined) return <span className="virtual-log__data-null">undefined</span>
  if (typeof value === 'boolean')
    return <span className="virtual-log__data-boolean">{value ? 'true' : 'false'}</span>
  if (typeof value === 'number') return <span className="virtual-log__data-number">{value}</span>
  if (typeof value === 'string') return <span className="virtual-log__data-string">"{value}"</span>
  if (Array.isArray(value)) return <span className="virtual-log__data-array">[{value.length}]</span>
  if (typeof value === 'object') return <span className="virtual-log__data-object">{'{...}'}</span>
  return <span>{String(value)}</span>
}

function LogDataDisplay({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data)
  if (entries.length === 0) return null

  return (
    <div className="virtual-log__data-grid">
      {entries.map(([key, value]) => (
        <div key={key} className="virtual-log__data-row">
          <span className="virtual-log__data-key">{key}</span>
          <LogDataValue value={value} />
        </div>
      ))}
    </div>
  )
}

export function VirtualLogTable({
  logs,
  totalCount,
  emptyMessage = 'No logs yet...',
  className,
  formatTime = defaultFormatTime,
  toolbarExtra,
  filter,
  onFilterChange,
  filterPlaceholder = 'Filter logs...',
}: VirtualLogTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleExpanded = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Estimate row height: collapsed ~44px, expanded ~120px
  const getEstimatedSize = useCallback(
    (index: number) => {
      const log = logs[index]
      if (!log) return 44
      const hasData = log.data && Object.keys(log.data).length > 0
      if (!hasData) return 44
      return expandedRows.has(log.id) ? 120 : 44
    },
    [logs, expandedRows],
  )

  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: getEstimatedSize,
    overscan: 15,
  })

  // Re-measure when expanded state changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: virtualizer.measure() should only run when expandedRows changes
  useEffect(() => {
    virtualizer.measure()
  }, [expandedRows])

  const virtualItems = virtualizer.getVirtualItems()

  const containerClasses = ['virtual-log-table', className].filter(Boolean).join(' ')

  const hasFilter = filter !== undefined && onFilterChange !== undefined

  return (
    <div className={containerClasses}>
      {/* Toolbar */}
      {(hasFilter || toolbarExtra) && (
        <div className="virtual-log-table__toolbar">
          {toolbarExtra}
          {hasFilter && (
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
                placeholder={filterPlaceholder}
                value={filter}
                onChange={(e) => onFilterChange(e.target.value)}
              />
              {filter && (
                <button
                  type="button"
                  className="virtual-table__search-clear"
                  onClick={() => onFilterChange('')}
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
          )}
        </div>
      )}

      {/* Empty state */}
      {logs.length === 0 ? (
        <div className="virtual-log-table__empty">
          {filter ? `No logs matching "${filter}"` : emptyMessage}
        </div>
      ) : (
        <>
          {/* Scrollable log list */}
          <div className="virtual-log-table__scroll" ref={parentRef}>
            <div
              className="virtual-log-table__body"
              style={{ height: `${virtualizer.getTotalSize()}px` }}
            >
              {virtualItems.map((virtualRow) => {
                const log = logs[virtualRow.index]
                if (!log) return null
                const hasData = log.data && Object.keys(log.data).length > 0
                const isExpanded = expandedRows.has(log.id)

                return (
                  <div
                    key={log.id}
                    className={`virtual-log virtual-log--${log.level}`}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="virtual-log__row">
                      <span className="virtual-log__time">{formatTime(log.timestamp)}</span>
                      <LogLevelBadge level={log.level} />
                      <span className="virtual-log__message">{log.message}</span>
                      {hasData && (
                        <button
                          type="button"
                          className="virtual-log__expand-btn"
                          onClick={() => toggleExpanded(log.id)}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? 'Collapse data' : 'Expand data'}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                            style={{
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
                              transition: 'transform 0.15s ease',
                            }}
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                          {Object.keys(log.data!).length}{' '}
                          {Object.keys(log.data!).length === 1 ? 'field' : 'fields'}
                        </button>
                      )}
                    </div>
                    {hasData && isExpanded && (
                      <div className="virtual-log__data">
                        <LogDataDisplay data={log.data!} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="virtual-log-table__footer">
            <span className="virtual-log-table__count">
              {totalCount !== undefined
                ? `${logs.length.toLocaleString()} of ${totalCount.toLocaleString()} logs`
                : `${logs.length.toLocaleString()} logs`}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
