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

export type ReposTableProps = {
  repos: Repo[]
  className?: string
}

function formatDate(date: Date | null): string {
  if (!date) return 'Never'
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}

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

export function ReposTable({ repos, className }: ReposTableProps) {
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
