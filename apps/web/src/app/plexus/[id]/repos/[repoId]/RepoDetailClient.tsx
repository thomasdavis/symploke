'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@symploke/ui/Button/Button'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { getPusherClient } from '@/lib/pusher/client'
import type { Channel } from 'pusher-js'
import './repo-detail.css'

type SyncJobStatus =
  | 'PENDING'
  | 'FETCHING_TREE'
  | 'PROCESSING_FILES'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

interface SyncJob {
  id: string
  status: SyncJobStatus
  totalFiles: number | null
  processedFiles: number
  skippedFiles: number
  failedFiles: number
  error: string | null
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
}

interface Repo {
  id: string
  name: string
  fullName: string
  url: string
  defaultBranch: string
  lastIndexed: Date | null
  fileCount: number
}

interface LogEntry {
  id: string
  timestamp: Date
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
  details?: string
}

interface RepoDetailClientProps {
  plexusId: string
  repo: Repo
  latestJob: SyncJob | null
}

export function RepoDetailClient({ plexusId, repo, latestJob: initialJob }: RepoDetailClientProps) {
  const router = useRouter()
  const [currentJob, setCurrentJob] = useState<SyncJob | null>(initialJob)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isSyncing, setIsSyncing] = useState(
    initialJob?.status === 'PENDING' ||
      initialJob?.status === 'FETCHING_TREE' ||
      initialJob?.status === 'PROCESSING_FILES',
  )
  const logsEndRef = useRef<HTMLDivElement>(null)
  const logsContainerRef = useRef<HTMLDivElement>(null)

  const addLog = useCallback((level: LogEntry['level'], message: string, details?: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        level,
        message,
        details,
      },
    ])
  }, [])

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  // Subscribe to Pusher events
  useEffect(() => {
    const pusher = getPusherClient()
    if (!pusher) return

    const channelName = `private-plexus-${plexusId}`
    let channel: Channel

    try {
      channel = pusher.subscribe(channelName)

      channel.bind(
        'sync:log',
        (data: { repoId: string; level: LogEntry['level']; message: string; details?: string }) => {
          if (data.repoId === repo.id) {
            addLog(data.level, data.message, data.details)
          }
        },
      )

      channel.bind(
        'sync:progress',
        (data: {
          jobId: string
          repoId: string
          status: SyncJobStatus
          processedFiles: number
          totalFiles: number
          skippedFiles: number
          failedFiles: number
          currentFile?: string
        }) => {
          if (data.repoId === repo.id) {
            setCurrentJob((prev) =>
              prev
                ? {
                    ...prev,
                    status: data.status,
                    processedFiles: data.processedFiles,
                    totalFiles: data.totalFiles,
                    skippedFiles: data.skippedFiles,
                    failedFiles: data.failedFiles,
                  }
                : null,
            )

            if (data.currentFile) {
              addLog('info', `Processing: ${data.currentFile}`)
            }
          }
        },
      )

      channel.bind('sync:completed', (data: { repoId: string }) => {
        if (data.repoId === repo.id) {
          setIsSyncing(false)
          addLog('success', 'Sync completed successfully!')
          // Refresh the page data
          router.refresh()
        }
      })

      channel.bind('sync:error', (data: { repoId: string; error: string }) => {
        if (data.repoId === repo.id) {
          setIsSyncing(false)
          addLog('error', `Sync failed: ${data.error}`)
        }
      })
    } catch (error) {
      console.error('Error subscribing to Pusher:', error)
    }

    return () => {
      if (channel) {
        channel.unbind_all()
        pusher.unsubscribe(channelName)
      }
    }
  }, [plexusId, repo.id, addLog, router])

  const handleStartSync = async () => {
    setIsSyncing(true)
    setLogs([])
    addLog('info', 'Starting sync...')

    try {
      const response = await fetch(`/api/plexus/${plexusId}/repositories/${repo.id}/sync`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to start sync')
      }

      const data = await response.json()
      setCurrentJob({
        id: data.jobId,
        status: 'PENDING',
        totalFiles: null,
        processedFiles: 0,
        skippedFiles: 0,
        failedFiles: 0,
        error: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
      })
      addLog('info', `Sync job created: ${data.jobId}`)
    } catch (error: unknown) {
      setIsSyncing(false)
      addLog('error', error instanceof Error ? error.message : String(error))
    }
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Never'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleString()
  }

  const getStatusBadge = (status: SyncJobStatus) => {
    const statusConfig: Record<SyncJobStatus, { label: string; className: string }> = {
      PENDING: { label: 'Pending', className: 'status-badge--pending' },
      FETCHING_TREE: { label: 'Fetching Files', className: 'status-badge--progress' },
      PROCESSING_FILES: { label: 'Processing', className: 'status-badge--progress' },
      COMPLETED: { label: 'Completed', className: 'status-badge--success' },
      FAILED: { label: 'Failed', className: 'status-badge--error' },
      CANCELLED: { label: 'Cancelled', className: 'status-badge--cancelled' },
    }
    const config = statusConfig[status]
    return <span className={`status-badge ${config.className}`}>{config.label}</span>
  }

  const progress = currentJob?.totalFiles
    ? Math.round((currentJob.processedFiles / currentJob.totalFiles) * 100)
    : 0

  return (
    <div className="repo-detail">
      <PageHeader
        title={repo.fullName}
        actions={
          <div className="repo-detail__actions">
            <Link
              href={`/plexus/${plexusId}/repos/${repo.id}/glossary`}
              className="repo-detail__secondary-link"
            >
              View Glossary
            </Link>
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="repo-detail__github-link"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              View on GitHub
            </a>
            <Button variant="primary" onClick={handleStartSync} disabled={isSyncing}>
              {isSyncing ? 'Syncing...' : 'Sync Files'}
            </Button>
          </div>
        }
      />

      <div className="repo-detail__content">
        <div className="repo-detail__info">
          <div className="repo-detail__stats">
            <div className="repo-detail__stat">
              <span className="repo-detail__stat-label">Files</span>
              <span className="repo-detail__stat-value">{repo.fileCount.toLocaleString()}</span>
            </div>
            <div className="repo-detail__stat">
              <span className="repo-detail__stat-label">Default Branch</span>
              <span className="repo-detail__stat-value">{repo.defaultBranch}</span>
            </div>
            <div className="repo-detail__stat">
              <span className="repo-detail__stat-label">Last Synced</span>
              <span className="repo-detail__stat-value">{formatDate(repo.lastIndexed)}</span>
            </div>
          </div>

          {currentJob && (
            <div className="repo-detail__job">
              <div className="repo-detail__job-header">
                <span>Latest Sync Job</span>
                {getStatusBadge(currentJob.status)}
              </div>
              {(isSyncing || currentJob.status === 'PROCESSING_FILES') && currentJob.totalFiles && (
                <div className="repo-detail__progress">
                  <div className="repo-detail__progress-bar">
                    <div className="repo-detail__progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="repo-detail__progress-stats">
                    <span>
                      {currentJob.processedFiles} / {currentJob.totalFiles} files
                    </span>
                    <span>{progress}%</span>
                  </div>
                </div>
              )}
              <div className="repo-detail__job-stats">
                <span>Processed: {currentJob.processedFiles}</span>
                <span>Skipped: {currentJob.skippedFiles}</span>
                <span>Failed: {currentJob.failedFiles}</span>
              </div>
            </div>
          )}
        </div>

        <div className="repo-detail__logs-panel">
          <div className="repo-detail__logs-header">
            <span>Sync Logs</span>
            {logs.length > 0 && (
              <button type="button" className="repo-detail__logs-clear" onClick={() => setLogs([])}>
                Clear
              </button>
            )}
          </div>
          <div className="repo-detail__logs" ref={logsContainerRef}>
            {logs.length === 0 ? (
              <div className="repo-detail__logs-empty">
                Click "Sync Files" to start syncing and see logs here.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={`repo-detail__log repo-detail__log--${log.level}`}>
                  <span className="repo-detail__log-time">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <span className="repo-detail__log-level">[{log.level.toUpperCase()}]</span>
                  <span className="repo-detail__log-message">{log.message}</span>
                  {log.details && <span className="repo-detail__log-details">{log.details}</span>}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
