import type { TableColumn } from '../Table/Table'
import { Table } from '../Table/Table'
import type { VirtualTableColumn } from '../VirtualTable/VirtualTable'
import { VirtualTable } from '../VirtualTable/VirtualTable'
import '@symploke/design/components/chunks-table.css'

export type Chunk = {
  id: string
  content: string
  startChar: number
  endChar: number
  chunkIndex: number
  embeddedAt: Date | null
  createdAt: Date
  file: {
    path: string
    repo: {
      name: string
      fullName: string
    }
  }
}

export type ChunksTableProps = {
  chunks: Chunk[]
  className?: string
}

function truncateContent(content: string, maxLength = 100): string {
  if (content.length <= maxLength) return content
  return `${content.slice(0, maxLength).trim()}...`
}

function formatNumber(num: number): string {
  return num.toLocaleString()
}

function getFileName(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}

function createColumns(): TableColumn<Chunk>[] {
  return [
    {
      header: 'ID',
      accessor: (chunk) => (
        <span className="chunks-table__id" title={chunk.id}>
          {chunk.id.slice(0, 8)}...
        </span>
      ),
      className: 'chunks-table__id-column',
    },
    {
      header: 'File',
      accessor: (chunk) => (
        <div className="chunks-table__file-cell">
          <div className="chunks-table__file-name">{getFileName(chunk.file.path)}</div>
          <div className="chunks-table__file-path">{chunk.file.path}</div>
        </div>
      ),
    },
    {
      header: 'Position',
      accessor: (chunk) => (
        <span className="chunks-table__position">
          {formatNumber(chunk.startChar)}-{formatNumber(chunk.endChar)}
        </span>
      ),
      className: 'chunks-table__position-column',
    },
    {
      header: '#',
      accessor: (chunk) => <span className="chunks-table__index">{chunk.chunkIndex}</span>,
      className: 'chunks-table__index-column',
    },
    {
      header: 'Content',
      accessor: (chunk) => (
        <span className="chunks-table__content" title={chunk.content.slice(0, 500)}>
          {truncateContent(chunk.content)}
        </span>
      ),
      className: 'chunks-table__content-column',
    },
    {
      header: 'Embedded',
      accessor: (chunk) => (
        <span
          className={`chunks-table__embedded ${chunk.embeddedAt ? 'chunks-table__embedded--yes' : 'chunks-table__embedded--no'}`}
        >
          {chunk.embeddedAt ? 'Yes' : 'No'}
        </span>
      ),
      className: 'chunks-table__embedded-column',
    },
  ]
}

export function ChunksTable({ chunks, className }: ChunksTableProps) {
  const columns = createColumns()

  return (
    <Table
      columns={columns}
      data={chunks}
      emptyMessage="No chunks created yet"
      className={className}
      getRowKey={(chunk) => chunk.id}
    />
  )
}

// Virtual table columns (adapted for VirtualTable component)
function createVirtualColumns(): VirtualTableColumn<Chunk>[] {
  return [
    {
      header: 'ID',
      accessor: (chunk) => (
        <span className="chunks-table__id" title={chunk.id}>
          {chunk.id.slice(0, 8)}...
        </span>
      ),
      width: '90px',
    },
    {
      header: 'File',
      accessor: (chunk) => (
        <div className="chunks-table__file-cell">
          <div className="chunks-table__file-name">{getFileName(chunk.file.path)}</div>
          <div className="chunks-table__file-path">{chunk.file.path}</div>
        </div>
      ),
      width: 'grow',
    },
    {
      header: 'Position',
      accessor: (chunk) => (
        <span className="chunks-table__position">
          {formatNumber(chunk.startChar)}-{formatNumber(chunk.endChar)}
        </span>
      ),
      width: '120px',
    },
    {
      header: '#',
      accessor: (chunk) => <span className="chunks-table__index">{chunk.chunkIndex}</span>,
      width: '50px',
      align: 'center',
    },
    {
      header: 'Content',
      accessor: (chunk) => (
        <span className="chunks-table__content" title={chunk.content.slice(0, 500)}>
          {truncateContent(chunk.content)}
        </span>
      ),
      width: '200px',
    },
    {
      header: 'Embedded',
      accessor: (chunk) => (
        <span
          className={`chunks-table__embedded ${chunk.embeddedAt ? 'chunks-table__embedded--yes' : 'chunks-table__embedded--no'}`}
        >
          {chunk.embeddedAt ? 'Yes' : 'No'}
        </span>
      ),
      width: '90px',
      align: 'center',
    },
  ]
}

export type VirtualChunksTableProps = {
  chunks: Chunk[]
  totalCount: number
  hasMore: boolean
  onLoadMore: () => void
  isLoadingMore: boolean
  className?: string
}

export function VirtualChunksTable({
  chunks,
  totalCount,
  hasMore,
  onLoadMore,
  isLoadingMore,
  className,
}: VirtualChunksTableProps) {
  const columns = createVirtualColumns()

  return (
    <VirtualTable
      columns={columns}
      data={chunks}
      getRowKey={(chunk) => chunk.id}
      totalCount={totalCount}
      hasMore={hasMore}
      onLoadMore={onLoadMore}
      isLoadingMore={isLoadingMore}
      emptyMessage="No chunks created yet"
      className={className}
      estimatedRowHeight={52}
    />
  )
}
