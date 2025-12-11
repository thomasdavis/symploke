'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { Button } from '@symploke/ui/Button/Button'
import { Progress } from '@symploke/ui/Progress/Progress'
import { Tabs } from '@symploke/ui/Tabs/Tabs'
import { useWeaveDiscovery, type WeaveLogEntry } from '@/contexts/WeaveDiscoveryContext'
import './weave-run.css'

interface WeaveRunClientProps {
  plexusId: string
  plexusName: string
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDuration(startedAt: string | null): string {
  if (!startedAt) return '-'
  const start = new Date(startedAt)
  const now = new Date()
  const ms = now.getTime() - start.getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

function LogLevel({ level }: { level: WeaveLogEntry['level'] }) {
  return <span className={`weave-run-log__level weave-run-log__level--${level}`}>{level}</span>
}

function LogPanel({ logs, filter }: { logs: WeaveLogEntry[]; filter: string }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  const filteredLogs = useMemo(() => {
    if (filter === 'all') return logs
    return logs.filter((log) => log.level === filter)
  }, [logs, filter])

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [filteredLogs, autoScroll])

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      // Auto-scroll if within 50px of bottom
      setAutoScroll(scrollHeight - scrollTop - clientHeight < 50)
    }
  }

  return (
    <div className="weave-run-logs__content" ref={scrollRef} onScroll={handleScroll}>
      {filteredLogs.length === 0 ? (
        <div className="weave-run-logs__empty">No logs yet...</div>
      ) : (
        filteredLogs.map((log) => (
          <div key={log.id} className={`weave-run-log weave-run-log--${log.level}`}>
            <span className="weave-run-log__time">{formatTime(log.timestamp)}</span>
            <LogLevel level={log.level} />
            <span className="weave-run-log__message">{log.message}</span>
            {log.data && Object.keys(log.data).length > 0 && (
              <details className="weave-run-log__data">
                <summary>data</summary>
                <pre>{JSON.stringify(log.data, null, 2)}</pre>
              </details>
            )}
          </div>
        ))
      )}
    </div>
  )
}

export function WeaveRunClient({ plexusId, plexusName }: WeaveRunClientProps) {
  const discovery = useWeaveDiscovery()
  const [logFilter, setLogFilter] = useState('all')
  const [elapsedTime, setElapsedTime] = useState('-')

  // Update elapsed time every second when running
  useEffect(() => {
    if (!discovery.isRunning || !discovery.startedAt) return

    const updateElapsed = () => {
      setElapsedTime(formatDuration(discovery.startedAt))
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [discovery.isRunning, discovery.startedAt])

  // Count logs by level
  const logCounts = useMemo(() => {
    const counts = { all: 0, info: 0, debug: 0, warn: 0, error: 0 }
    discovery.logs.forEach((log) => {
      counts.all++
      counts[log.level]++
    })
    return counts
  }, [discovery.logs])

  const getStatusText = () => {
    switch (discovery.status) {
      case 'running':
        return 'Running'
      case 'completed':
        return 'Completed'
      case 'error':
        return 'Failed'
      default:
        return 'Idle'
    }
  }

  const getStatusClass = () => {
    switch (discovery.status) {
      case 'running':
        return 'weave-run-status--running'
      case 'completed':
        return 'weave-run-status--completed'
      case 'error':
        return 'weave-run-status--error'
      default:
        return 'weave-run-status--idle'
    }
  }

  return (
    <div className="weave-run-page">
      <PageHeader title="Weave Discovery" subtitle={plexusName} />

      <div className="weave-run-content">
        {/* Status Card */}
        <div className="weave-run-card">
          <div className="weave-run-status-header">
            <div className={`weave-run-status ${getStatusClass()}`}>
              {discovery.isRunning && <span className="weave-run-status__pulse" />}
              {getStatusText()}
            </div>
            {discovery.duration && (
              <span className="weave-run-duration">Completed in {discovery.duration}</span>
            )}
            {discovery.isRunning && (
              <span className="weave-run-duration">Elapsed: {elapsedTime}</span>
            )}
          </div>

          {/* Progress Bar */}
          <div className="weave-run-progress">
            <div className="weave-run-progress__label">
              <span>Progress</span>
              <span>
                {discovery.repoPairsChecked} / {discovery.repoPairsTotal} pairs
              </span>
            </div>
            <Progress.Root value={discovery.progress} className="weave-run-progress__bar">
              <Progress.Indicator />
            </Progress.Root>
          </div>

          {/* Stats */}
          <div className="weave-run-stats">
            <div className="weave-run-stat">
              <span className="weave-run-stat__value">{discovery.weavesFound}</span>
              <span className="weave-run-stat__label">Weaves Found</span>
            </div>
            <div className="weave-run-stat">
              <span className="weave-run-stat__value">{discovery.repoPairsChecked}</span>
              <span className="weave-run-stat__label">Pairs Checked</span>
            </div>
            <div className="weave-run-stat">
              <span className="weave-run-stat__value">{discovery.logs.length}</span>
              <span className="weave-run-stat__label">Log Entries</span>
            </div>
          </div>

          {/* Current Pair */}
          {discovery.isRunning &&
            discovery.currentSourceRepoName &&
            discovery.currentTargetRepoName && (
              <div className="weave-run-current">
                <span className="weave-run-current__label">Checking:</span>
                <span className="weave-run-current__value">
                  {discovery.currentSourceRepoName} ↔ {discovery.currentTargetRepoName}
                </span>
              </div>
            )}

          {/* Error */}
          {discovery.error && (
            <div className="weave-run-error">
              <strong>Error:</strong> {discovery.error}
            </div>
          )}
        </div>

        {/* Discovered Weaves */}
        {discovery.newWeaves.length > 0 && (
          <div className="weave-run-card">
            <h3 className="weave-run-card__title">
              Discovered Weaves ({discovery.newWeaves.length})
            </h3>
            <div className="weave-run-weaves">
              {discovery.newWeaves.map((weave) => (
                <div key={weave.id} className="weave-run-weave">
                  <span className={`weave-run-weave__type weave-run-weave__type--${weave.type}`}>
                    {weave.type}
                  </span>
                  <span className="weave-run-weave__repos">
                    {weave.sourceRepo.name} ↔ {weave.targetRepo.name}
                  </span>
                  <span className="weave-run-weave__score">{(weave.score * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="weave-run-card weave-run-logs">
          <div className="weave-run-logs__header">
            <h3 className="weave-run-card__title">Logs</h3>
            {discovery.isRunning && (
              <div className="weave-run-logs__live">
                <span className="weave-run-logs__live-dot" />
                Live
              </div>
            )}
          </div>

          <Tabs.Root defaultValue="all" onValueChange={setLogFilter}>
            <Tabs.List className="weave-run-logs__tabs">
              <Tabs.Tab value="all">All ({logCounts.all})</Tabs.Tab>
              <Tabs.Tab value="info">Info ({logCounts.info})</Tabs.Tab>
              <Tabs.Tab value="debug">Debug ({logCounts.debug})</Tabs.Tab>
              <Tabs.Tab value="warn">Warn ({logCounts.warn})</Tabs.Tab>
              <Tabs.Tab value="error">Error ({logCounts.error})</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value={logFilter} keepMounted>
              <LogPanel logs={discovery.logs} filter={logFilter} />
            </Tabs.Panel>
          </Tabs.Root>
        </div>

        {/* Actions */}
        <div className="weave-run-actions">
          <Link href={`/plexus/${plexusId}/weaves`}>
            <Button variant="secondary">Back to Weaves</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
