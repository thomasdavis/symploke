import type { TableColumn } from '../Table/Table'
import { Table } from '../Table/Table'
import '@symploke/design/components/repos-table.css'

export type Repo = {
  id: string
  name: string
  fullName: string
  url: string
  lastIndexed: Date | null
  createdAt: Date
  // Embedding status
  lastEmbedded?: Date | null
  embeddingStatus?: string | null
  isEmbeddingOutdated?: boolean
  // Latest job IDs
  latestSyncJobId?: string | null
  latestEmbedJobId?: string | null
}

export type SyncStatus = {
  status: 'PENDING' | 'FETCHING_TREE' | 'PROCESSING_FILES' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  processedFiles: number
  totalFiles: number
  currentFile?: string
  error?: string
}

export type EmbedStatus = {
  status: 'PENDING' | 'CHUNKING' | 'EMBEDDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  processedFiles: number
  totalFiles: number
  chunksCreated?: number
  embeddingsGenerated?: number
  error?: string
}

export type ReposTableProps = {
  repos: Repo[]
  className?: string
  plexusId: string
  onSync?: (repoId: string) => void
  onEmbed?: (repoId: string) => void
  onDelete?: (repoId: string, repoName: string) => void
  getSyncStatus?: (repoId: string) => SyncStatus | undefined
  getEmbedStatus?: (repoId: string) => EmbedStatus | undefined
  isSyncing?: (repoId: string) => boolean
  isEmbedding?: (repoId: string) => boolean
  getRepoHref?: (repoId: string) => string
}

function formatTimeAgo(date: Date | string | null): string {
  if (!date) return 'Never'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()

  // Handle future dates
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

const syncIcon = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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

function SyncStatusCell({
  repo,
  status,
  onSync,
  isSyncing,
  plexusId,
}: {
  repo: Repo
  status?: SyncStatus
  onSync?: () => void
  isSyncing?: boolean
  plexusId: string
}) {
  const detailHref = `/plexus/${plexusId}/repos/${repo.id}`

  // Currently syncing - show progress bar (clickable to view details)
  if (isSyncing && status) {
    const percent =
      status.totalFiles > 0 ? Math.round((status.processedFiles / status.totalFiles) * 100) : 0

    return (
      <a href={detailHref} className="repos-table__progress-cell repos-table__progress-link">
        <div className="repos-table__progress-bar">
          <div className="repos-table__progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="repos-table__progress-text">
          {status.status === 'FETCHING_TREE'
            ? 'Fetching...'
            : `${status.processedFiles}/${status.totalFiles}`}
        </span>
      </a>
    )
  }

  // Sync failed
  if (status?.status === 'FAILED') {
    return (
      <button
        type="button"
        className="repos-table__action-btn repos-table__action-btn--danger"
        onClick={onSync}
        title={status.error}
      >
        {syncIcon}
        <span>Retry</span>
      </button>
    )
  }

  // Has been synced before
  if (repo.lastIndexed) {
    return (
      <button
        type="button"
        className="repos-table__action-btn repos-table__action-btn--ghost"
        onClick={onSync}
        disabled={isSyncing}
        title="Re-sync files"
      >
        {syncIcon}
        <span>Re-sync</span>
      </button>
    )
  }

  // Never synced
  return (
    <button type="button" className="repos-table__action-btn" onClick={onSync} disabled={isSyncing}>
      {syncIcon}
      <span>Sync</span>
    </button>
  )
}

const embedIcon = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="8" cy="8" r="2" fill="currentColor" />
  </svg>
)

const deleteIcon = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 4H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path
      d="M6 4V2.5C6 2.22386 6.22386 2 6.5 2H9.5C9.77614 2 10 2.22386 10 2.5V4"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M4 4L4.5 13.5C4.5 13.7761 4.72386 14 5 14H11C11.2761 14 11.5 13.7761 11.5 13.5L12 4"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
)

function EmbedStatusCell({
  repo,
  status,
  onEmbed,
  isEmbedding,
  plexusId,
}: {
  repo: Repo
  status?: EmbedStatus
  onEmbed?: () => void
  isEmbedding?: boolean
  plexusId: string
}) {
  const detailHref = `/plexus/${plexusId}/repos/${repo.id}`

  // Currently embedding - show progress bar (clickable to view details)
  if (isEmbedding && status) {
    const percent =
      status.totalFiles > 0 ? Math.round((status.processedFiles / status.totalFiles) * 100) : 0

    const statusText =
      status.status === 'CHUNKING'
        ? 'Chunking...'
        : status.status === 'EMBEDDING'
          ? `${status.embeddingsGenerated || 0} vectors`
          : `${status.processedFiles}/${status.totalFiles}`

    return (
      <a href={detailHref} className="repos-table__progress-cell repos-table__progress-link">
        <div className="repos-table__progress-bar">
          <div className="repos-table__progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="repos-table__progress-text">{statusText}</span>
      </a>
    )
  }

  // Embed failed
  if (status?.status === 'FAILED') {
    return (
      <button
        type="button"
        className="repos-table__action-btn repos-table__action-btn--danger"
        onClick={onEmbed}
        title={status.error}
      >
        {embedIcon}
        <span>Retry</span>
      </button>
    )
  }

  // Not synced yet - can't embed
  if (!repo.lastIndexed) {
    return <span className="repos-table__status-muted">—</span>
  }

  // Has embeddings but they're out of date
  if (repo.isEmbeddingOutdated) {
    return (
      <button
        type="button"
        className="repos-table__action-btn repos-table__action-btn--warning"
        onClick={onEmbed}
        disabled={isEmbedding}
      >
        {embedIcon}
        <span>Update</span>
      </button>
    )
  }

  // Has been embedded before
  if (repo.lastEmbedded) {
    return (
      <button
        type="button"
        className="repos-table__action-btn repos-table__action-btn--ghost"
        onClick={onEmbed}
        disabled={isEmbedding}
        title="Re-run embeddings"
      >
        {embedIcon}
        <span>Re-run</span>
      </button>
    )
  }

  // Never embedded - show "Embed" button
  return (
    <button
      type="button"
      className="repos-table__action-btn"
      onClick={onEmbed}
      disabled={isEmbedding}
    >
      {embedIcon}
      <span>Embed</span>
    </button>
  )
}

function createColumns(
  plexusId: string,
  onSync?: (repoId: string) => void,
  onEmbed?: (repoId: string) => void,
  onDelete?: (repoId: string, repoName: string) => void,
  getSyncStatus?: (repoId: string) => SyncStatus | undefined,
  getEmbedStatus?: (repoId: string) => EmbedStatus | undefined,
  isSyncing?: (repoId: string) => boolean,
  isEmbedding?: (repoId: string) => boolean,
  getRepoHref?: (repoId: string) => string,
): TableColumn<Repo>[] {
  const columns: TableColumn<Repo>[] = [
    {
      header: 'Repository',
      accessor: (repo) => {
        const repoHref = getRepoHref?.(repo.id)
        const content = (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="repos-table__repo-icon"
              aria-hidden="true"
            >
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
          </>
        )

        return (
          <div className="repos-table__repo-cell">
            {repoHref ? (
              <a href={repoHref} className="repos-table__repo-link">
                {content}
              </a>
            ) : (
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="repos-table__repo-link"
              >
                {content}
              </a>
            )}
          </div>
        )
      },
    },
    {
      header: 'Last Synced',
      accessor: (repo) => formatTimeAgo(repo.lastIndexed),
      className: 'repos-table__last-indexed',
    },
    {
      header: 'Files',
      accessor: (repo) => (
        <SyncStatusCell
          repo={repo}
          status={getSyncStatus?.(repo.id)}
          onSync={onSync ? () => onSync(repo.id) : undefined}
          isSyncing={isSyncing?.(repo.id)}
          plexusId={plexusId}
        />
      ),
      className: 'repos-table__sync-column',
    },
    {
      header: 'Embeddings',
      accessor: (repo) => (
        <EmbedStatusCell
          repo={repo}
          status={getEmbedStatus?.(repo.id)}
          onEmbed={onEmbed ? () => onEmbed(repo.id) : undefined}
          isEmbedding={isEmbedding?.(repo.id)}
          plexusId={plexusId}
        />
      ),
      className: 'repos-table__embed-column',
    },
    {
      header: '',
      accessor: (repo) =>
        onDelete ? (
          <button
            type="button"
            className="repos-table__action-btn repos-table__action-btn--icon repos-table__action-btn--danger-subtle"
            onClick={() => onDelete(repo.id, repo.fullName)}
            title="Remove repository"
            aria-label={`Remove ${repo.name}`}
          >
            {deleteIcon}
          </button>
        ) : null,
      className: 'repos-table__actions-column',
    },
  ]

  return columns
}

export function ReposTable({
  repos,
  className,
  plexusId,
  onSync,
  onEmbed,
  onDelete,
  getSyncStatus,
  getEmbedStatus,
  isSyncing,
  isEmbedding,
  getRepoHref,
}: ReposTableProps) {
  const columns = createColumns(
    plexusId,
    onSync,
    onEmbed,
    onDelete,
    getSyncStatus,
    getEmbedStatus,
    isSyncing,
    isEmbedding,
    getRepoHref,
  )

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
