import Pusher from 'pusher'
import { logger } from '@symploke/logger'
import { config } from '../config.js'
import type { SyncJobStatus, ChunkJobStatus, WeaveType } from '@symploke/db'

export interface SyncProgressEvent {
  jobId: string
  repoId: string
  status: SyncJobStatus
  processedFiles: number
  totalFiles: number
  skippedFiles: number
  failedFiles: number
  currentFile?: string
  error?: string
}

export interface EmbedProgressEvent {
  jobId: string
  repoId: string
  status: ChunkJobStatus
  processedFiles: number
  totalFiles: number
  chunksCreated: number
  embeddingsGenerated: number
  currentFile?: string
  error?: string
}

export type LogLevel = 'info' | 'warn' | 'error' | 'success'

export interface SyncLogEvent {
  repoId: string
  level: LogLevel
  message: string
  details?: string
}

// Weave discovery events
export interface WeaveStartedEvent {
  runId: string
  plexusId: string
  repoPairsTotal: number
}

export interface WeaveProgressEvent {
  runId: string
  repoPairsChecked: number
  repoPairsTotal: number
  weavesFound: number
  currentSourceRepoName: string | null
  currentTargetRepoName: string | null
}

export interface WeaveDiscoveredEvent {
  runId: string
  weave: {
    id: string
    sourceRepoId: string
    targetRepoId: string
    type: WeaveType
    title: string
    description: string
    score: number
    sourceRepo: { name: string }
    targetRepo: { name: string }
  }
}

export interface WeaveCompletedEvent {
  runId: string
  weavesSaved: number
  duration: string
}

export interface WeaveErrorEvent {
  runId: string
  error: string
}

export interface WeaveLogEvent {
  runId: string
  level: 'info' | 'debug' | 'warn' | 'error'
  message: string
  data?: Record<string, unknown>
}

/**
 * Pusher service for real-time sync progress updates
 */
export class PusherService {
  private client: Pusher | null = null

  constructor() {
    if (config.PUSHER_APP_ID && config.PUSHER_KEY && config.PUSHER_SECRET) {
      this.client = new Pusher({
        appId: config.PUSHER_APP_ID,
        key: config.PUSHER_KEY,
        secret: config.PUSHER_SECRET,
        cluster: config.PUSHER_CLUSTER,
        useTLS: true,
      })
      logger.info('Pusher service initialized')
    } else {
      logger.warn('Pusher credentials not configured, real-time updates disabled')
    }
  }

  /**
   * Check if Pusher is configured
   */
  isConfigured(): boolean {
    return this.client !== null
  }

  /**
   * Emit sync progress event
   */
  async emitSyncProgress(plexusId: string, event: SyncProgressEvent): Promise<void> {
    if (!this.client) return

    try {
      await this.client.trigger(`private-plexus-${plexusId}`, 'sync:progress', event)
      logger.debug({ plexusId, event }, 'Emitted sync progress event')
    } catch (error) {
      logger.error({ error, plexusId }, 'Failed to emit Pusher event')
    }
  }

  /**
   * Emit sync started event
   */
  async emitSyncStarted(plexusId: string, jobId: string, repoId: string): Promise<void> {
    if (!this.client) return

    try {
      await this.client.trigger(`private-plexus-${plexusId}`, 'sync:started', {
        jobId,
        repoId,
      })
      logger.debug({ plexusId, jobId, repoId }, 'Emitted sync started event')
    } catch (error) {
      logger.error({ error, plexusId }, 'Failed to emit Pusher event')
    }
  }

  /**
   * Emit sync completed event
   */
  async emitSyncCompleted(plexusId: string, event: SyncProgressEvent): Promise<void> {
    if (!this.client) return

    try {
      await this.client.trigger(`private-plexus-${plexusId}`, 'sync:completed', event)
      logger.debug({ plexusId, event }, 'Emitted sync completed event')
    } catch (error) {
      logger.error({ error, plexusId }, 'Failed to emit Pusher event')
    }
  }

  /**
   * Emit sync error event
   */
  async emitSyncError(
    plexusId: string,
    jobId: string,
    repoId: string,
    error: string,
  ): Promise<void> {
    if (!this.client) return

    try {
      await this.client.trigger(`private-plexus-${plexusId}`, 'sync:error', {
        jobId,
        repoId,
        error,
      })
      logger.debug({ plexusId, jobId, error }, 'Emitted sync error event')
    } catch (err) {
      logger.error({ error: err, plexusId }, 'Failed to emit Pusher event')
    }
  }

  /**
   * Emit sync log event
   */
  async emitSyncLog(plexusId: string, event: SyncLogEvent): Promise<void> {
    if (!this.client) return

    try {
      await this.client.trigger(`private-plexus-${plexusId}`, 'sync:log', event)
    } catch {
      // Don't log every log event failure, too noisy
    }
  }

  /**
   * Emit embed progress event
   */
  async emitEmbedProgress(plexusId: string, event: EmbedProgressEvent): Promise<void> {
    if (!this.client) return

    try {
      await this.client.trigger(`private-plexus-${plexusId}`, 'embed:progress', event)
      logger.debug({ plexusId, event }, 'Emitted embed progress event')
    } catch (error) {
      logger.error({ error, plexusId }, 'Failed to emit embed progress event')
    }
  }

  /**
   * Emit embed completed event
   */
  async emitEmbedCompleted(plexusId: string, event: EmbedProgressEvent): Promise<void> {
    if (!this.client) return

    try {
      await this.client.trigger(`private-plexus-${plexusId}`, 'embed:completed', event)
      logger.debug({ plexusId, event }, 'Emitted embed completed event')
    } catch (error) {
      logger.error({ error, plexusId }, 'Failed to emit embed completed event')
    }
  }

  /**
   * Emit weave discovery started event
   */
  async emitWeaveStarted(plexusId: string, event: WeaveStartedEvent): Promise<void> {
    if (!this.client) return

    try {
      await this.client.trigger(`private-plexus-${plexusId}`, 'weave:started', event)
      logger.debug({ plexusId, event }, 'Emitted weave started event')
    } catch (error) {
      logger.error({ error, plexusId }, 'Failed to emit weave started event')
    }
  }

  /**
   * Emit weave discovery progress event
   */
  async emitWeaveProgress(plexusId: string, event: WeaveProgressEvent): Promise<void> {
    if (!this.client) return

    try {
      await this.client.trigger(`private-plexus-${plexusId}`, 'weave:progress', event)
      logger.debug({ plexusId, event }, 'Emitted weave progress event')
    } catch (error) {
      logger.error({ error, plexusId }, 'Failed to emit weave progress event')
    }
  }

  /**
   * Emit weave discovered event (when a new weave is found)
   */
  async emitWeaveDiscovered(plexusId: string, event: WeaveDiscoveredEvent): Promise<void> {
    if (!this.client) return

    try {
      await this.client.trigger(`private-plexus-${plexusId}`, 'weave:discovered', event)
      logger.debug({ plexusId, weaveId: event.weave.id }, 'Emitted weave discovered event')
    } catch (error) {
      logger.error({ error, plexusId }, 'Failed to emit weave discovered event')
    }
  }

  /**
   * Emit weave discovery completed event
   */
  async emitWeaveCompleted(plexusId: string, event: WeaveCompletedEvent): Promise<void> {
    if (!this.client) return

    try {
      await this.client.trigger(`private-plexus-${plexusId}`, 'weave:completed', event)
      logger.debug({ plexusId, event }, 'Emitted weave completed event')
    } catch (error) {
      logger.error({ error, plexusId }, 'Failed to emit weave completed event')
    }
  }

  /**
   * Emit weave discovery error event
   */
  async emitWeaveError(plexusId: string, event: WeaveErrorEvent): Promise<void> {
    if (!this.client) return

    try {
      await this.client.trigger(`private-plexus-${plexusId}`, 'weave:error', event)
      logger.debug({ plexusId, event }, 'Emitted weave error event')
    } catch (error) {
      logger.error({ error, plexusId }, 'Failed to emit weave error event')
    }
  }

  /**
   * Emit weave discovery log event for real-time debug output
   */
  async emitWeaveLog(plexusId: string, event: WeaveLogEvent): Promise<void> {
    if (!this.client) return

    try {
      await this.client.trigger(`private-plexus-${plexusId}`, 'weave:log', event)
    } catch {
      // Don't log every log event failure, too noisy
    }
  }

  // === Mates events (public channels, no auth required) ===

  /**
   * Emit mates status update event
   */
  async emitMatesStatus(
    username: string,
    event: { profileId: string; status: string; step: string; error?: string },
  ): Promise<void> {
    if (!this.client) return

    try {
      await this.client.trigger(`mates-${username}`, 'status-update', event)
    } catch {
      // Non-critical
    }
  }

  /**
   * Emit mates progress event
   */
  async emitMatesProgress(username: string, step: string): Promise<void> {
    if (!this.client) return

    try {
      await this.client.trigger(`mates-${username}`, 'progress', { username, step })
    } catch {
      // Non-critical
    }
  }

  /**
   * Emit mates profile-ready event
   */
  async emitMatesProfileReady(
    username: string,
    event: { profileId: string; matchCount: number },
  ): Promise<void> {
    if (!this.client) return

    try {
      await this.client.trigger(`mates-${username}`, 'profile-ready', event)
    } catch {
      // Non-critical
    }
  }
}

// Singleton instance
let pusherServiceInstance: PusherService | null = null

export function getPusherService(): PusherService {
  if (!pusherServiceInstance) {
    pusherServiceInstance = new PusherService()
  }
  return pusherServiceInstance
}
