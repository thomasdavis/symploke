import type { TableColumn } from '../Table/Table'
import { Table } from '../Table/Table'
import type { VirtualTableColumn } from '../VirtualTable/VirtualTable'
import { VirtualTable } from '../VirtualTable/VirtualTable'
import '@symploke/design/components/files-table.css'

export type File = {
  id: string
  path: string
  size: number
  language: string | null
  loc: number | null
  skippedReason: string | null
  updatedAt: Date
  repo: {
    name: string
    fullName: string
  }
}

export type FilesTableProps = {
  files: File[]
  className?: string
  getFileHref?: (fileId: string) => string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

function formatTimeAgo(date: Date | string | null): string {
  if (!date) return 'Never'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()

  if (diffMs < 0) return 'Just now'

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (seconds < 60) return 'Just now'
  if (minutes === 1) return '1 minute ago'
  if (minutes < 60) return `${minutes} minutes ago`
  if (hours === 1) return '1 hour ago'
  if (hours < 24) return `${hours} hours ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (weeks === 1) return '1 week ago'
  if (weeks < 4) return `${weeks} weeks ago`
  if (months === 1) return '1 month ago'
  if (months < 12) return `${months} months ago`
  if (years === 1) return '1 year ago'
  return `${years} years ago`
}

function getFileName(path: string): string {
  return path.split('/').pop() || path
}

function getFileExtension(path: string): string {
  const fileName = getFileName(path)
  const lastDot = fileName.lastIndexOf('.')
  return lastDot > 0 ? fileName.slice(lastDot + 1) : ''
}

function FileIcon({ extension }: { extension: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="files-table__file-icon"
      aria-hidden="true"
    >
      <path
        d="M3 2C3 1.44772 3.44772 1 4 1H9L13 5V14C13 14.5523 12.5523 15 12 15H4C3.44772 15 3 14.5523 3 14V2Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M9 1V5H13" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      {extension && (
        <text x="8" y="11" textAnchor="middle" fontSize="4" fill="currentColor" fontWeight="600">
          {extension.slice(0, 3).toUpperCase()}
        </text>
      )}
    </svg>
  )
}

function createColumns(getFileHref?: (fileId: string) => string): TableColumn<File>[] {
  return [
    {
      header: 'File',
      accessor: (file) => {
        const fileName = getFileName(file.path)
        const extension = getFileExtension(file.path)
        const content = (
          <div className="files-table__file-cell">
            <FileIcon extension={extension} />
            <div className="files-table__file-info">
              <div className="files-table__file-name">{fileName}</div>
              <div className="files-table__file-path">{file.path}</div>
            </div>
          </div>
        )

        if (getFileHref) {
          return (
            <a href={getFileHref(file.id)} className="files-table__file-link">
              {content}
            </a>
          )
        }

        return content
      },
    },
    {
      header: 'Repository',
      accessor: (file) => <span className="files-table__repo">{file.repo.name}</span>,
      className: 'files-table__repo-column',
    },
    {
      header: 'Language',
      accessor: (file) => (
        <span className="files-table__language">
          {file.language || (file.skippedReason ? 'Skipped' : '—')}
        </span>
      ),
      className: 'files-table__language-column',
    },
    {
      header: 'Size',
      accessor: (file) => <span className="files-table__size">{formatBytes(file.size)}</span>,
      className: 'files-table__size-column',
    },
    {
      header: 'Lines',
      accessor: (file) => (
        <span className="files-table__loc">
          {file.loc !== null ? file.loc.toLocaleString() : '—'}
        </span>
      ),
      className: 'files-table__loc-column',
    },
    {
      header: 'Updated',
      accessor: (file) => formatTimeAgo(file.updatedAt),
      className: 'files-table__updated-column',
    },
  ]
}

export function FilesTable({ files, className, getFileHref }: FilesTableProps) {
  const columns = createColumns(getFileHref)

  return (
    <Table
      columns={columns}
      data={files}
      emptyMessage="No files synced yet"
      className={className}
      getRowKey={(file) => file.id}
    />
  )
}

// Virtual table columns (adapted for VirtualTable component)
function createVirtualColumns(): VirtualTableColumn<File>[] {
  return [
    {
      header: 'File',
      accessor: (file) => {
        const fileName = getFileName(file.path)
        const extension = getFileExtension(file.path)
        return (
          <div className="files-table__file-cell">
            <FileIcon extension={extension} />
            <div className="files-table__file-info">
              <div className="files-table__file-name">{fileName}</div>
              <div className="files-table__file-path">{file.path}</div>
            </div>
          </div>
        )
      },
      width: 'grow',
    },
    {
      header: 'Repository',
      accessor: (file) => <span className="files-table__repo">{file.repo.name}</span>,
      width: '140px',
    },
    {
      header: 'Language',
      accessor: (file) => (
        <span className="files-table__language">
          {file.language || (file.skippedReason ? 'Skipped' : '—')}
        </span>
      ),
      width: '100px',
    },
    {
      header: 'Size',
      accessor: (file) => <span className="files-table__size">{formatBytes(file.size)}</span>,
      width: '80px',
      align: 'right',
    },
    {
      header: 'Lines',
      accessor: (file) => (
        <span className="files-table__loc">
          {file.loc !== null ? file.loc.toLocaleString() : '—'}
        </span>
      ),
      width: '80px',
      align: 'right',
    },
    {
      header: 'Updated',
      accessor: (file) => formatTimeAgo(file.updatedAt),
      width: '120px',
    },
  ]
}

export type VirtualFilesTableProps = {
  files: File[]
  totalCount: number
  hasMore: boolean
  onLoadMore: () => void
  isLoadingMore: boolean
  className?: string
}

export function VirtualFilesTable({
  files,
  totalCount,
  hasMore,
  onLoadMore,
  isLoadingMore,
  className,
}: VirtualFilesTableProps) {
  const columns = createVirtualColumns()

  return (
    <VirtualTable
      columns={columns}
      data={files}
      getRowKey={(file) => file.id}
      totalCount={totalCount}
      hasMore={hasMore}
      onLoadMore={onLoadMore}
      isLoadingMore={isLoadingMore}
      emptyMessage="No files synced yet"
      className={className}
      estimatedRowHeight={52}
    />
  )
}
