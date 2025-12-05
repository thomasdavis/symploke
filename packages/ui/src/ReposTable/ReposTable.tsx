import { Table } from '../Table/Table'
import type { TableColumn } from '../Table/Table'
import '@symploke/design/components/repos-table.css'

export type Repo = {
  id: string
  name: string
  fullName: string
  url: string
  lastIndexed: Date | null
  createdAt: Date
}

export type SyncStatus = {
  status: 'PENDING' | 'FETCHING_TREE' | 'PROCESSING_FILES' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  processedFiles: number
  totalFiles: number
  currentFile?: string
  error?: string
}

export type ReposTableProps = {
  repos: Repo[]
  className?: string
  onSync?: (repoId: string) => void
  getSyncStatus?: (repoId: string) => SyncStatus | undefined
  isSyncing?: (repoId: string) => boolean
  getRepoHref?: (repoId: string) => string
}

function formatDate(date: Date | string | null): string {
  if (!date) return 'Never'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - dateObj.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}

function SyncStatusCell({
  status,
  onSync,
  isSyncing,
  href,
}: {
  status?: SyncStatus
  onSync?: () => void
  isSyncing?: boolean
  href?: string
}) {
  const syncIcon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 8C2 4.68629 4.68629 2 8 2C10.2208 2 12.1599 3.26477 13.1973 5.10051"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 8C14 11.3137 11.3137 14 8 14C5.77915 14 3.84006 12.7352 2.80269 10.8995"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 5H14V1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 11H2V15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )

  if (isSyncing && status) {
    const percent =
      status.totalFiles > 0 ? Math.round((status.processedFiles / status.totalFiles) * 100) : 0

    // If we have href, make the progress clickable to view details
    const progressContent = (
      <div className="repos-table__sync-progress">
        <div className="repos-table__sync-bar">
          <div className="repos-table__sync-bar-fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="repos-table__sync-text">
          {status.status === 'FETCHING_TREE'
            ? 'Fetching files...'
            : `${status.processedFiles}/${status.totalFiles} files`}
        </span>
      </div>
    )

    if (href) {
      return (
        <a href={href} className="repos-table__sync-status repos-table__sync-status--link">
          {progressContent}
        </a>
      )
    }

    return <div className="repos-table__sync-status">{progressContent}</div>
  }

  if (status?.status === 'COMPLETED') {
    const content = (
      <>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M13.5 4.5L6 12L2.5 8.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>Synced</span>
      </>
    )

    if (href) {
      return (
        <a
          href={href}
          className="repos-table__sync-status repos-table__sync-status--success repos-table__sync-status--link"
        >
          {content}
        </a>
      )
    }

    return (
      <div className="repos-table__sync-status repos-table__sync-status--success">{content}</div>
    )
  }

  if (status?.status === 'FAILED') {
    return (
      <div className="repos-table__sync-status repos-table__sync-status--error">
        <span title={status.error}>Failed</span>
        {href ? (
          <a href={href} className="repos-table__sync-button repos-table__sync-button--retry">
            Retry
          </a>
        ) : (
          <button
            type="button"
            className="repos-table__sync-button repos-table__sync-button--retry"
            onClick={onSync}
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  // Default: show sync button/link
  if (href) {
    return (
      <a href={href} className="repos-table__sync-button">
        {syncIcon}
        Sync
      </a>
    )
  }

  return (
    <button
      type="button"
      className="repos-table__sync-button"
      onClick={onSync}
      disabled={isSyncing}
    >
      {syncIcon}
      Sync
    </button>
  )
}

function createColumns(
  onSync?: (repoId: string) => void,
  getSyncStatus?: (repoId: string) => SyncStatus | undefined,
  isSyncing?: (repoId: string) => boolean,
  getRepoHref?: (repoId: string) => string,
): TableColumn<Repo>[] {
  const columns: TableColumn<Repo>[] = [
    {
      header: 'Repository',
      accessor: (repo) => (
        <div className="repos-table__repo-cell">
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="repos-table__repo-link"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="repos-table__repo-icon"
            >
              <title>Repository</title>
              <rect
                x="2"
                y="2"
                width="12"
                height="12"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path d="M2 5H14" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <div className="repos-table__repo-info">
              <div className="repos-table__repo-name">{repo.name}</div>
              <div className="repos-table__repo-full-name">{repo.fullName}</div>
            </div>
          </a>
        </div>
      ),
    },
    {
      header: 'Last Indexed',
      accessor: (repo) => formatDate(repo.lastIndexed),
      className: 'repos-table__last-indexed',
    },
    {
      header: 'Added',
      accessor: (repo) => formatDate(repo.createdAt),
      className: 'repos-table__created',
    },
  ]

  // Add sync column if sync handlers or href is provided
  if (onSync || getRepoHref) {
    columns.push({
      header: '',
      accessor: (repo) => (
        <SyncStatusCell
          status={getSyncStatus?.(repo.id)}
          onSync={onSync ? () => onSync(repo.id) : undefined}
          isSyncing={isSyncing?.(repo.id)}
          href={getRepoHref?.(repo.id)}
        />
      ),
      className: 'repos-table__sync-column',
    })
  }

  return columns
}

export function ReposTable({
  repos,
  className,
  onSync,
  getSyncStatus,
  isSyncing,
  getRepoHref,
}: ReposTableProps) {
  const columns = createColumns(onSync, getSyncStatus, isSyncing, getRepoHref)

  return (
    <Table
      columns={columns}
      data={repos}
      emptyMessage="No repositories yet"
      className={className}
      getRowKey={(repo) => repo.id}
    />
  )
}
