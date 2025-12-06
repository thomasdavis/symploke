'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { Button } from '@symploke/ui/Button/Button'
import { Input } from '@symploke/ui/Input/Input'
import { Tabs } from '@symploke/ui/Tabs/Tabs'
import { getPusherClient } from '@/lib/pusher/client'
import type { Channel } from 'pusher-js'
import './logs.css'

type LogEntry = {
  timestamp: string
  level: 'info' | 'debug' | 'warn' | 'error'
  message: string
  data?: Record<string, unknown>
}

type ActivityLog = {
  id: string
  type: 'sync' | 'embed' | 'discovery'
  status: string
  repoName?: string
  startedAt: Date
  completedAt: Date | null
  logs: LogEntry[]
  summary: {
    processedFiles?: number
    totalFiles?: number
    skippedFiles?: number
    failedFiles?: number
    chunksCreated?: number
    embeddingsGenerated?: number
    weavesSaved?: number
    candidatesFound?: number
  }
}

type StreamEvent = {
  id: string
  timestamp: Date
  type: 'sync' | 'embed' | 'discovery'
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
  repoName?: string
  details?: Record<string, unknown>
}

type LogsClientProps = {
  plexusId: string
  initialLogs: ActivityLog[]
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d)
}

function formatDuration(start: Date | string, end: Date | string | null): string {
  if (!end) return 'running...'
  const startDate = typeof start === 'string' ? new Date(start) : start
  const endDate = typeof end === 'string' ? new Date(end) : end
  const ms = endDate.getTime() - startDate.getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function StatusBadge({ status }: { status: string }) {
  const isRunning = [
    'PENDING',
    'FETCHING_TREE',
    'PROCESSING_FILES',
    'CHUNKING',
    'EMBEDDING',
    'RUNNING',
  ].includes(status)
  const isSuccess = status === 'COMPLETED'
  const isError = status === 'FAILED'

  return (
    <span
      className={`logs-status logs-status--${isRunning ? 'running' : isSuccess ? 'success' : isError ? 'error' : 'default'}`}
    >
      {isRunning && <span className="logs-status__pulse" />}
      {status}
    </span>
  )
}

function TypeBadge({ type }: { type: 'sync' | 'embed' | 'discovery' }) {
  const labels = {
    sync: 'File Sync',
    embed: 'Embedding',
    discovery: 'Discovery',
  }
  return <span className={`logs-type logs-type--${type}`}>{labels[type]}</span>
}

function ActivityCard({
  activity,
  isSelected,
  onClick,
}: {
  activity: ActivityLog
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`activity-card ${isSelected ? 'activity-card--selected' : ''}`}
      onClick={onClick}
    >
      <div className="activity-card__header">
        <TypeBadge type={activity.type} />
        <StatusBadge status={activity.status} />
      </div>
      {activity.repoName && <div className="activity-card__repo">{activity.repoName}</div>}
      <div className="activity-card__meta">
        <span>{formatDate(activity.startedAt)}</span>
        <span>{formatDuration(activity.startedAt, activity.completedAt)}</span>
      </div>
      <div className="activity-card__summary">
        {activity.type === 'sync' && activity.summary.totalFiles && (
          <span>
            {activity.summary.processedFiles}/{activity.summary.totalFiles} files
          </span>
        )}
        {activity.type === 'embed' && activity.summary.embeddingsGenerated !== undefined && (
          <span>{activity.summary.embeddingsGenerated} embeddings</span>
        )}
        {activity.type === 'discovery' && activity.summary.weavesSaved !== undefined && (
          <span>{activity.summary.weavesSaved} weaves saved</span>
        )}
      </div>
    </button>
  )
}

function StreamPanel({ events, onClear }: { events: StreamEvent[]; onClear: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events, autoScroll])

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      setAutoScroll(scrollHeight - scrollTop - clientHeight < 50)
    }
  }

  return (
    <div className="stream-panel">
      <div className="stream-panel__header">
        <div className="stream-panel__title">
          <span className="stream-panel__indicator" />
          Live Stream
          <span className="stream-panel__count">({events.length})</span>
        </div>
        <div className="stream-panel__actions">
          <Button variant="secondary" size="sm" onClick={onClear}>
            Clear
          </Button>
        </div>
      </div>
      <div className="stream-panel__content" ref={scrollRef} onScroll={handleScroll}>
        {events.length === 0 ? (
          <div className="stream-panel__empty">Waiting for events...</div>
        ) : (
          events.map((event) => (
            <div key={event.id} className={`stream-event stream-event--${event.level}`}>
              <span className="stream-event__time">{event.timestamp.toLocaleTimeString()}</span>
              <span className={`stream-event__type stream-event__type--${event.type}`}>
                {event.type}
              </span>
              {event.repoName && <span className="stream-event__repo">{event.repoName}</span>}
              <span className="stream-event__message">{event.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ActivityDetail({ activity }: { activity: ActivityLog }) {
  return (
    <div className="activity-detail">
      <div className="activity-detail__header">
        <TypeBadge type={activity.type} />
        <StatusBadge status={activity.status} />
      </div>

      {activity.repoName && <div className="activity-detail__repo">{activity.repoName}</div>}

      <div className="activity-detail__timing">
        <div className="activity-detail__row">
          <span className="activity-detail__label">Started</span>
          <span className="activity-detail__value">{formatDate(activity.startedAt)}</span>
        </div>
        {activity.completedAt && (
          <div className="activity-detail__row">
            <span className="activity-detail__label">Completed</span>
            <span className="activity-detail__value">{formatDate(activity.completedAt)}</span>
          </div>
        )}
        <div className="activity-detail__row">
          <span className="activity-detail__label">Duration</span>
          <span className="activity-detail__value">
            {formatDuration(activity.startedAt, activity.completedAt)}
          </span>
        </div>
      </div>

      <div className="activity-detail__stats">
        {activity.type === 'sync' && (
          <>
            {activity.summary.totalFiles !== undefined && (
              <div className="activity-detail__stat">
                <span className="activity-detail__stat-value">
                  {activity.summary.processedFiles}/{activity.summary.totalFiles}
                </span>
                <span className="activity-detail__stat-label">Files</span>
              </div>
            )}
            {activity.summary.skippedFiles !== undefined && (
              <div className="activity-detail__stat">
                <span className="activity-detail__stat-value">{activity.summary.skippedFiles}</span>
                <span className="activity-detail__stat-label">Skipped</span>
              </div>
            )}
            {activity.summary.failedFiles !== undefined && (
              <div className="activity-detail__stat">
                <span className="activity-detail__stat-value">{activity.summary.failedFiles}</span>
                <span className="activity-detail__stat-label">Failed</span>
              </div>
            )}
          </>
        )}
        {activity.type === 'embed' && (
          <>
            {activity.summary.processedFiles !== undefined && (
              <div className="activity-detail__stat">
                <span className="activity-detail__stat-value">
                  {activity.summary.processedFiles}
                </span>
                <span className="activity-detail__stat-label">Files</span>
              </div>
            )}
            {activity.summary.chunksCreated !== undefined && (
              <div className="activity-detail__stat">
                <span className="activity-detail__stat-value">
                  {activity.summary.chunksCreated}
                </span>
                <span className="activity-detail__stat-label">Chunks</span>
              </div>
            )}
            {activity.summary.embeddingsGenerated !== undefined && (
              <div className="activity-detail__stat">
                <span className="activity-detail__stat-value">
                  {activity.summary.embeddingsGenerated}
                </span>
                <span className="activity-detail__stat-label">Embeddings</span>
              </div>
            )}
          </>
        )}
        {activity.type === 'discovery' && (
          <>
            {activity.summary.candidatesFound !== undefined && (
              <div className="activity-detail__stat">
                <span className="activity-detail__stat-value">
                  {activity.summary.candidatesFound}
                </span>
                <span className="activity-detail__stat-label">Candidates</span>
              </div>
            )}
            {activity.summary.weavesSaved !== undefined && (
              <div className="activity-detail__stat">
                <span className="activity-detail__stat-value">{activity.summary.weavesSaved}</span>
                <span className="activity-detail__stat-label">Saved</span>
              </div>
            )}
          </>
        )}
      </div>

      {activity.logs.length > 0 && (
        <div className="activity-detail__logs">
          <h4>Execution Logs</h4>
          <div className="activity-detail__log-list">
            {activity.logs.map((log, i) => (
              <div key={i} className={`activity-log activity-log--${log.level}`}>
                <span className="activity-log__time">
                  {new Date(log.timestamp).toISOString().slice(11, 23)}
                </span>
                <span className={`activity-log__level`}>{log.level}</span>
                <span className="activity-log__message">{log.message}</span>
                {log.data && (
                  <pre className="activity-log__data">{JSON.stringify(log.data, null, 2)}</pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function LogsClient({ plexusId, initialLogs }: LogsClientProps) {
  const router = useRouter()
  const [activities] = useState<ActivityLog[]>(initialLogs)
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null)
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'sync' | 'embed' | 'discovery'>('all')
  const [repoLookup, setRepoLookup] = useState<Record<string, string>>({})

  // Build repo lookup from activities
  useEffect(() => {
    const lookup: Record<string, string> = {}
    activities.forEach((a) => {
      if (a.repoName) {
        // Extract repo ID pattern from activities
      }
    })
    setRepoLookup(lookup)
  }, [activities])

  const addStreamEvent = useCallback((event: Omit<StreamEvent, 'id' | 'timestamp'>) => {
    setStreamEvents((prev) => [
      ...prev.slice(-499), // Keep last 500 events
      {
        ...event,
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
      },
    ])
  }, [])

  // Subscribe to Pusher events
  useEffect(() => {
    const pusher = getPusherClient()
    if (!pusher) return

    const channelName = `private-plexus-${plexusId}`
    let channel: Channel

    try {
      channel = pusher.subscribe(channelName)

      // Sync events
      channel.bind(
        'sync:progress',
        (data: {
          repoId: string
          status: string
          processedFiles: number
          totalFiles: number
          currentFile?: string
        }) => {
          const repoName = repoLookup[data.repoId] || data.repoId.slice(0, 8)
          addStreamEvent({
            type: 'sync',
            level: 'info',
            message: data.currentFile
              ? `Processing ${data.currentFile}`
              : `${data.processedFiles}/${data.totalFiles} files (${data.status})`,
            repoName,
          })
        },
      )

      channel.bind('sync:completed', (data: { repoId: string }) => {
        const repoName = repoLookup[data.repoId] || data.repoId.slice(0, 8)
        addStreamEvent({
          type: 'sync',
          level: 'success',
          message: 'Sync completed',
          repoName,
        })
        router.refresh()
      })

      channel.bind('sync:error', (data: { repoId: string; error: string }) => {
        const repoName = repoLookup[data.repoId] || data.repoId.slice(0, 8)
        addStreamEvent({
          type: 'sync',
          level: 'error',
          message: `Sync failed: ${data.error}`,
          repoName,
        })
      })

      channel.bind(
        'sync:log',
        (data: {
          repoId: string
          level: 'info' | 'warn' | 'error' | 'success'
          message: string
        }) => {
          const repoName = repoLookup[data.repoId] || data.repoId.slice(0, 8)
          addStreamEvent({
            type: 'sync',
            level: data.level,
            message: data.message,
            repoName,
          })
        },
      )

      // Embed events
      channel.bind(
        'embed:progress',
        (data: {
          repoId: string
          status: string
          chunksCreated: number
          embeddingsGenerated: number
        }) => {
          const repoName = repoLookup[data.repoId] || data.repoId.slice(0, 8)
          addStreamEvent({
            type: 'embed',
            level: 'info',
            message: `${data.status}: ${data.chunksCreated} chunks, ${data.embeddingsGenerated} embeddings`,
            repoName,
          })
        },
      )

      channel.bind('embed:completed', (data: { repoId: string; embeddingsGenerated: number }) => {
        const repoName = repoLookup[data.repoId] || data.repoId.slice(0, 8)
        addStreamEvent({
          type: 'embed',
          level: 'success',
          message: `Embedding completed (${data.embeddingsGenerated} embeddings)`,
          repoName,
        })
        router.refresh()
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
  }, [plexusId, addStreamEvent, router, repoLookup])

  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      if (search) {
        const searchLower = search.toLowerCase()
        const matchesRepo = a.repoName?.toLowerCase().includes(searchLower)
        const matchesStatus = a.status.toLowerCase().includes(searchLower)
        const matchesType = a.type.toLowerCase().includes(searchLower)
        if (!matchesRepo && !matchesStatus && !matchesType) return false
      }
      return true
    })
  }, [activities, typeFilter, search])

  return (
    <div className="logs-page">
      <PageHeader
        title="Activity Logs"
        subtitle="Monitor sync, embedding, and discovery operations"
      />

      <div className="logs-content">
        <div className="logs-sidebar">
          <div className="logs-filters">
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="logs-search"
            />
            <Tabs.Root
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
            >
              <Tabs.List className="logs-type-tabs">
                <Tabs.Tab value="all">All</Tabs.Tab>
                <Tabs.Tab value="sync">Sync</Tabs.Tab>
                <Tabs.Tab value="embed">Embed</Tabs.Tab>
                <Tabs.Tab value="discovery">Discovery</Tabs.Tab>
                <Tabs.Indicator />
              </Tabs.List>
            </Tabs.Root>
          </div>

          <div className="logs-activity-list">
            {filteredActivities.length === 0 ? (
              <div className="logs-empty">No activities found</div>
            ) : (
              filteredActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  isSelected={selectedActivity?.id === activity.id}
                  onClick={() => setSelectedActivity(activity)}
                />
              ))
            )}
          </div>
        </div>

        <div className="logs-main">
          <StreamPanel events={streamEvents} onClear={() => setStreamEvents([])} />

          {selectedActivity && (
            <div className="logs-detail-panel">
              <ActivityDetail activity={selectedActivity} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
