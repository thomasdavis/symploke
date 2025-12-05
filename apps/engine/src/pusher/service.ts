import Pusher from 'pusher'
import { logger } from '@symploke/logger'
import { config } from '../config.js'
import type { SyncJobStatus } from '@symploke/db'

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

export type LogLevel = 'info' | 'warn' | 'error' | 'success'

export interface SyncLogEvent {
  repoId: string
  level: LogLevel
  message: string
  details?: string
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
}

// Singleton instance
let pusherServiceInstance: PusherService | null = null

export function getPusherService(): PusherService {
  if (!pusherServiceInstance) {
    pusherServiceInstance = new PusherService()
  }
  return pusherServiceInstance
}
