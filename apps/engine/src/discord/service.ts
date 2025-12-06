import { logger } from '@symploke/logger'

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK

interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  fields?: Array<{
    name: string
    value: string
    inline?: boolean
  }>
  footer?: {
    text: string
  }
  timestamp?: string
}

interface DiscordMessage {
  content?: string
  embeds?: DiscordEmbed[]
}

// Discord embed colors
const COLORS = {
  success: 0x22c55e, // green
  info: 0x3b82f6, // blue
  warning: 0xf59e0b, // amber
  error: 0xef4444, // red
  purple: 0xa855f7, // purple for weaves
}

/**
 * Send a message to the Discord webhook
 */
async function sendWebhook(message: DiscordMessage): Promise<boolean> {
  if (!DISCORD_WEBHOOK_URL) {
    logger.debug('Discord webhook not configured, skipping notification')
    return false
  }

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      logger.error(
        { status: response.status, statusText: response.statusText },
        'Failed to send Discord webhook',
      )
      return false
    }

    return true
  } catch (error) {
    logger.error({ error }, 'Error sending Discord webhook')
    return false
  }
}

/**
 * Notify Discord about a completed file sync
 */
export async function notifySyncCompleted(data: {
  repoName: string
  repoFullName: string
  plexusName: string
  totalFiles: number
  processedFiles: number
  skippedFiles: number
  failedFiles: number
  duration: number
  jobId: string
}): Promise<void> {
  const durationStr = formatDuration(data.duration)
  const successRate =
    data.totalFiles > 0 ? ((data.processedFiles / data.totalFiles) * 100).toFixed(1) : '100'

  await sendWebhook({
    embeds: [
      {
        title: `Sync Completed: ${data.repoName}`,
        description: `Repository **${data.repoFullName}** has been synced in **${data.plexusName}**`,
        color: data.failedFiles > 0 ? COLORS.warning : COLORS.success,
        fields: [
          { name: 'Total Files', value: data.totalFiles.toLocaleString(), inline: true },
          { name: 'Processed', value: data.processedFiles.toLocaleString(), inline: true },
          { name: 'Success Rate', value: `${successRate}%`, inline: true },
          { name: 'Skipped', value: data.skippedFiles.toLocaleString(), inline: true },
          { name: 'Failed', value: data.failedFiles.toLocaleString(), inline: true },
          { name: 'Duration', value: durationStr, inline: true },
        ],
        footer: { text: `Job ID: ${data.jobId}` },
        timestamp: new Date().toISOString(),
      },
    ],
  })
}

/**
 * Notify Discord about completed embeddings
 */
export async function notifyEmbedCompleted(data: {
  repoName: string
  repoFullName: string
  plexusName: string
  totalFiles: number
  chunksCreated: number
  embeddingsGenerated: number
  duration: number
  jobId: string
}): Promise<void> {
  const durationStr = formatDuration(data.duration)

  await sendWebhook({
    embeds: [
      {
        title: `Embeddings Generated: ${data.repoName}`,
        description: `Repository **${data.repoFullName}** has been embedded in **${data.plexusName}**`,
        color: COLORS.info,
        fields: [
          { name: 'Files Processed', value: data.totalFiles.toLocaleString(), inline: true },
          { name: 'Chunks Created', value: data.chunksCreated.toLocaleString(), inline: true },
          { name: 'Embeddings', value: data.embeddingsGenerated.toLocaleString(), inline: true },
          { name: 'Duration', value: durationStr, inline: true },
        ],
        footer: { text: `Job ID: ${data.jobId}` },
        timestamp: new Date().toISOString(),
      },
    ],
  })
}

/**
 * Notify Discord about discovered weaves
 */
export async function notifyWeavesDiscovered(data: {
  plexusName: string
  plexusSlug: string
  repoPairsAnalyzed: number
  candidatesFound: number
  weavesSaved: number
  weavesSkipped: number
  duration: number
  runId: string
  weaves: Array<{
    title: string
    description: string
    score: number
    sourceRepo: string
    targetRepo: string
    type: string
  }>
}): Promise<void> {
  const durationStr = formatDuration(data.duration)

  // Build weave summaries
  const weaveDescriptions = data.weaves
    .slice(0, 5) // Limit to 5 weaves to avoid message length issues
    .map((w) => {
      const scorePercent = (w.score * 100).toFixed(0)
      return (
        `**${w.title}** (${scorePercent}% confidence)\n` +
        `${w.sourceRepo} <-> ${w.targetRepo}\n` +
        `_${w.description.slice(0, 150)}${w.description.length > 150 ? '...' : ''}_`
      )
    })
    .join('\n\n')

  const hasNewWeaves = data.weavesSaved > 0

  await sendWebhook({
    embeds: [
      {
        title: hasNewWeaves
          ? `New Weaves Discovered in ${data.plexusName}!`
          : `Weave Discovery Complete: ${data.plexusName}`,
        description: hasNewWeaves
          ? `Found **${data.weavesSaved}** new integration opportunities!`
          : 'No new weaves discovered this run.',
        color: hasNewWeaves ? COLORS.purple : COLORS.info,
        fields: [
          { name: 'Repo Pairs Analyzed', value: data.repoPairsAnalyzed.toString(), inline: true },
          { name: 'Candidates Found', value: data.candidatesFound.toString(), inline: true },
          { name: 'New Weaves', value: data.weavesSaved.toString(), inline: true },
          { name: 'Already Existed', value: data.weavesSkipped.toString(), inline: true },
          { name: 'Duration', value: durationStr, inline: true },
        ],
        footer: { text: `Run ID: ${data.runId}` },
        timestamp: new Date().toISOString(),
      },
      // Add a second embed with weave details if there are new weaves
      ...(hasNewWeaves && weaveDescriptions
        ? [
            {
              title: 'Discovered Weaves',
              description: weaveDescriptions,
              color: COLORS.purple,
            },
          ]
        : []),
    ],
  })
}

/**
 * Send a daily summary to Discord
 */
export async function notifyDailySummary(data: {
  plexusName: string
  totalRepos: number
  totalFiles: number
  totalChunks: number
  totalEmbeddings: number
  totalWeaves: number
  reposWithEmbeddings: number
  syncJobsToday: number
  embedJobsToday: number
  weaveRunsToday: number
}): Promise<void> {
  const embeddingCoverage =
    data.totalRepos > 0 ? ((data.reposWithEmbeddings / data.totalRepos) * 100).toFixed(0) : '0'

  await sendWebhook({
    embeds: [
      {
        title: `Daily Summary: ${data.plexusName}`,
        description: `Here's what's happening in your plexus today.`,
        color: COLORS.info,
        fields: [
          { name: 'Repositories', value: data.totalRepos.toLocaleString(), inline: true },
          { name: 'Files Indexed', value: data.totalFiles.toLocaleString(), inline: true },
          { name: 'Total Chunks', value: data.totalChunks.toLocaleString(), inline: true },
          { name: 'Embeddings', value: data.totalEmbeddings.toLocaleString(), inline: true },
          { name: 'Weaves', value: data.totalWeaves.toLocaleString(), inline: true },
          { name: 'Embedding Coverage', value: `${embeddingCoverage}%`, inline: true },
          { name: "Today's Sync Jobs", value: data.syncJobsToday.toString(), inline: true },
          { name: "Today's Embed Jobs", value: data.embedJobsToday.toString(), inline: true },
          { name: "Today's Weave Runs", value: data.weaveRunsToday.toString(), inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  })
}

/**
 * Format duration in milliseconds to human readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Check if Discord webhook is configured
 */
export function isDiscordConfigured(): boolean {
  return !!DISCORD_WEBHOOK_URL
}
