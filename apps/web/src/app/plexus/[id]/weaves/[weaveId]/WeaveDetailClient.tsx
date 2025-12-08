'use client'

import type { WeaveType } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import Link from 'next/link'
import './weave-detail.css'

// Types
type RepoData = {
  id: string
  name: string
  fullName: string
  url: string
}

type WeaveData = {
  id: string
  type: WeaveType
  title: string
  description: string
  score: number
  dismissed: boolean
  metadata: Record<string, unknown> | null
  createdAt: string
  sourceRepo: RepoData
  targetRepo: RepoData
  discoveryRun: {
    id: string
    status: string
    startedAt: string
  } | null
  comments: Array<{
    id: string
    content: string
    createdAt: string
    user: { name: string | null; email: string; image: string | null }
  }>
}

type GlossaryData = {
  id: string
  status: string
  purpose: string | null
  features: string[] | null
  techStack: string[] | null
  targetUsers: string[] | null
  kpis: string[] | null
  roadmap: string[] | null
  values: string[] | null
  enemies: string[] | null
  aesthetic: string | null
  confidence: number | null
  summary: string | null
}

type WeaveDetailClientProps = {
  plexusId: string
  weave: WeaveData & {
    sourceRepo: RepoData & { glossary?: GlossaryData | null }
    targetRepo: RepoData & { glossary?: GlossaryData | null }
  }
}

// Shared Components
function WeaveTypeBadge({ type }: { type: WeaveType }) {
  const formatted = type.replace(/_/g, ' ')
  return <span className={`wd-type-badge wd-type-badge--${type}`}>{formatted}</span>
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

function ScoreDisplay({ score, label = 'Score' }: { score: number; label?: string }) {
  const percentage = (score * 100).toFixed(0)
  const isHigh = score >= 0.5
  return (
    <div className={`wd-score ${isHigh ? 'wd-score--high' : ''}`}>
      <span className="wd-score-label">{label}</span>
      <span className="wd-score-value">{percentage}%</span>
    </div>
  )
}

// ============================================================================
// GLOSSARY ALIGNMENT DETAIL
// ============================================================================

type GlossaryAlignmentMetadata = {
  narrative: string
  overallScore: number
  complementary: boolean
  competing: boolean
  synergies: string[]
  tensions: string[]
  sourceSummary?: string
  targetSummary?: string
}

// Helper components for glossary display
function TagList({
  items,
  variant = 'default',
}: {
  items: string[] | null | undefined
  variant?: string
}) {
  if (!items || items.length === 0) {
    return <span className="wd-empty-inline">None specified</span>
  }
  return (
    <div className="wd-tags">
      {items.map((item, i) => (
        <span key={i} className={`wd-tag wd-tag--${variant}`}>
          {item}
        </span>
      ))}
    </div>
  )
}

function GlossaryColumn({
  glossary,
  repoName,
  repoId,
  plexusId,
}: {
  glossary: GlossaryData | null | undefined
  repoName: string
  repoId: string
  plexusId: string
}) {
  if (!glossary || glossary.status !== 'COMPLETE') {
    return (
      <div className="wd-glossary-column wd-glossary-column--empty">
        <h4>{repoName}</h4>
        <p className="wd-empty">No glossary extracted</p>
        <Link href={`/plexus/${plexusId}/repos/${repoId}/glossary`} className="wd-glossary-link">
          View Profile
        </Link>
      </div>
    )
  }

  return (
    <div className="wd-glossary-column">
      <div className="wd-glossary-column-header">
        <h4>{repoName}</h4>
        <Link href={`/plexus/${plexusId}/repos/${repoId}/glossary`} className="wd-glossary-link">
          Full Profile
        </Link>
      </div>

      {glossary.purpose && (
        <div className="wd-glossary-row">
          <strong>Purpose</strong>
          <p>{glossary.purpose}</p>
        </div>
      )}

      {glossary.features && glossary.features.length > 0 && (
        <div className="wd-glossary-row">
          <strong>Features</strong>
          <ul className="wd-compact-list">
            {glossary.features.slice(0, 4).map((f, i) => (
              <li key={i}>{f}</li>
            ))}
            {glossary.features.length > 4 && (
              <li className="wd-more">+{glossary.features.length - 4} more</li>
            )}
          </ul>
        </div>
      )}

      {glossary.techStack && glossary.techStack.length > 0 && (
        <div className="wd-glossary-row">
          <strong>Tech Stack</strong>
          <TagList items={glossary.techStack} variant="tech" />
        </div>
      )}

      {glossary.values && glossary.values.length > 0 && (
        <div className="wd-glossary-row">
          <strong>Values</strong>
          <TagList items={glossary.values} variant="positive" />
        </div>
      )}

      {glossary.enemies && glossary.enemies.length > 0 && (
        <div className="wd-glossary-row">
          <strong>Enemies</strong>
          <TagList items={glossary.enemies} variant="negative" />
        </div>
      )}

      {glossary.targetUsers && glossary.targetUsers.length > 0 && (
        <div className="wd-glossary-row">
          <strong>Target Users</strong>
          <TagList items={glossary.targetUsers} />
        </div>
      )}
    </div>
  )
}

type WeaveWithGlossary = WeaveData & {
  sourceRepo: RepoData & { glossary?: GlossaryData | null }
  targetRepo: RepoData & { glossary?: GlossaryData | null }
}

function GlossaryAlignmentDetail({
  weave,
  plexusId,
}: {
  weave: WeaveWithGlossary
  plexusId: string
}) {
  const metadata = weave.metadata as GlossaryAlignmentMetadata | null

  if (!metadata?.narrative) {
    return (
      <div className="wd-type-detail wd-glossary-detail">
        <p className="wd-empty">No comparison data available</p>
      </div>
    )
  }
  return (
    <div className="wd-type-detail wd-glossary-detail">
      {/* Narrative */}
      <div className="wd-section wd-narrative-section">
        <h3>AI Analysis</h3>
        <p className="wd-narrative">{metadata.narrative}</p>
        <div className="wd-relationship-badges">
          {metadata.complementary && (
            <span className="wd-badge wd-badge--complementary">Complementary</span>
          )}
          {metadata.competing && <span className="wd-badge wd-badge--competing">Same Arena</span>}
        </div>
      </div>

      {/* Synergies */}
      {metadata.synergies && metadata.synergies.length > 0 && (
        <div className="wd-section">
          <h3>Synergies</h3>
          <ul className="wd-synergies-list">
            {metadata.synergies.map((synergy, i) => (
              <li key={i}>{synergy}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tensions */}
      {metadata.tensions && metadata.tensions.length > 0 && (
        <div className="wd-section wd-tensions-section">
          <h3>Potential Tensions</h3>
          <ul className="wd-tensions-list">
            {metadata.tensions.map((tension, i) => (
              <li key={i}>{tension}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Full Glossary Comparison */}
      <div className="wd-section">
        <h3>Glossary Comparison</h3>
        <div className="wd-glossary-compare-full">
          <GlossaryColumn
            glossary={weave.sourceRepo.glossary}
            repoName={weave.sourceRepo.fullName}
            repoId={weave.sourceRepo.id}
            plexusId={plexusId}
          />
          <div className="wd-glossary-divider" />
          <GlossaryColumn
            glossary={weave.targetRepo.glossary}
            repoName={weave.targetRepo.fullName}
            repoId={weave.targetRepo.id}
            plexusId={plexusId}
          />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// INTEGRATION OPPORTUNITY DETAIL
// ============================================================================

type FilePairMatch = {
  sourceFile: string
  targetFile: string
  avgSimilarity: number
  maxSimilarity: number
  chunkCount: number
  matches: Array<{
    sourceChunkId: string
    targetChunkId: string
    sourceContent: string
    targetContent: string
    similarity: number
  }>
}

function IntegrationOpportunityDetail({ weave }: { weave: WeaveData }) {
  const metadata = weave.metadata as {
    filePairs?: FilePairMatch[]
    llmReasoning?: string
  } | null

  const filePairs = metadata?.filePairs || []

  return (
    <div className="wd-type-detail wd-integration-detail">
      {/* LLM Reasoning */}
      {metadata?.llmReasoning && (
        <div className="wd-section">
          <h3>Analysis</h3>
          <p className="wd-reasoning">{metadata.llmReasoning}</p>
        </div>
      )}

      {/* File Pairs */}
      <div className="wd-section">
        <h3>Matching File Pairs ({filePairs.length})</h3>
        <div className="wd-file-pairs">
          {filePairs.map((pair, i) => (
            <div key={i} className="wd-file-pair">
              <div className="wd-file-pair-header">
                <div className="wd-file-pair-files">
                  <span className="wd-file-path">{pair.sourceFile}</span>
                  <span className="wd-file-arrow">↔</span>
                  <span className="wd-file-path">{pair.targetFile}</span>
                </div>
                <div className="wd-file-pair-scores">
                  <span>Avg: {(pair.avgSimilarity * 100).toFixed(0)}%</span>
                  <span>Max: {(pair.maxSimilarity * 100).toFixed(0)}%</span>
                  <span>{pair.chunkCount} chunks</span>
                </div>
              </div>

              {/* Chunk matches preview */}
              {pair.matches && pair.matches.length > 0 && (
                <div className="wd-chunk-matches">
                  {pair.matches.slice(0, 2).map((match, j) => (
                    <div key={j} className="wd-chunk-match">
                      <div className="wd-chunk-side">
                        <pre>{match.sourceContent.slice(0, 200)}...</pre>
                      </div>
                      <div className="wd-chunk-similarity">
                        {(match.similarity * 100).toFixed(0)}%
                      </div>
                      <div className="wd-chunk-side">
                        <pre>{match.targetContent.slice(0, 200)}...</pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// PHILOSOPHICAL ALIGNMENT DETAIL
// ============================================================================

function PhilosophicalAlignmentDetail({ weave }: { weave: WeaveData }) {
  const metadata = weave.metadata as {
    epistemology?: string
    antagonist?: string
    cognitiveTransform?: string
    sourcePhilosophy?: string
    targetPhilosophy?: string
  } | null

  return (
    <div className="wd-type-detail wd-philosophical-detail">
      {metadata?.epistemology && (
        <div className="wd-section">
          <h3>Epistemology</h3>
          <p className="wd-philosophy-text">{metadata.epistemology}</p>
        </div>
      )}

      {metadata?.antagonist && (
        <div className="wd-section">
          <h3>Shared Antagonist</h3>
          <p className="wd-philosophy-text">{metadata.antagonist}</p>
        </div>
      )}

      {metadata?.cognitiveTransform && (
        <div className="wd-section">
          <h3>Cognitive Transform</h3>
          <p className="wd-philosophy-text">{metadata.cognitiveTransform}</p>
        </div>
      )}

      {(metadata?.sourcePhilosophy || metadata?.targetPhilosophy) && (
        <div className="wd-section">
          <h3>Philosophy Statements</h3>
          <div className="wd-philosophy-compare">
            <div className="wd-philosophy-side">
              <h4>{weave.sourceRepo.fullName}</h4>
              <p>{metadata?.sourcePhilosophy || 'Not available'}</p>
            </div>
            <div className="wd-philosophy-side">
              <h4>{weave.targetRepo.fullName}</h4>
              <p>{metadata?.targetPhilosophy || 'Not available'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// GENERIC DETAIL (for other weave types)
// ============================================================================

function GenericWeaveDetail({ weave }: { weave: WeaveData }) {
  return (
    <div className="wd-type-detail wd-generic-detail">
      <div className="wd-section">
        <h3>Weave Metadata</h3>
        {weave.metadata ? (
          <pre className="wd-metadata-json">{JSON.stringify(weave.metadata, null, 2)}</pre>
        ) : (
          <p className="wd-empty">No additional metadata available</p>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WeaveDetailClient({ plexusId, weave }: WeaveDetailClientProps) {
  // Select the appropriate detail component based on weave type
  const renderTypeDetail = () => {
    switch (weave.type) {
      case 'glossary_alignment':
        return <GlossaryAlignmentDetail weave={weave} plexusId={plexusId} />
      case 'integration_opportunity':
        return <IntegrationOpportunityDetail weave={weave} />
      case 'philosophical_alignment':
        return <PhilosophicalAlignmentDetail weave={weave} />
      default:
        return <GenericWeaveDetail weave={weave} />
    }
  }

  return (
    <div className="wd-page">
      <div className="wd-nav">
        <Link href={`/plexus/${plexusId}/weaves`} className="wd-back-link">
          Back to Weaves
        </Link>
      </div>

      <PageHeader title={weave.title} subtitle={weave.description} />

      {/* Header Info */}
      <div className="wd-header-info">
        <WeaveTypeBadge type={weave.type} />
        <ScoreDisplay score={weave.score} />
        <span className="wd-date">Created: {formatDate(weave.createdAt)}</span>
        {weave.dismissed && <span className="wd-dismissed-badge">Dismissed</span>}
      </div>

      {/* Repo Links */}
      <div className="wd-repos">
        <a
          href={weave.sourceRepo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="wd-repo-link"
        >
          {weave.sourceRepo.fullName}
        </a>
        <span className="wd-repo-arrow">↔</span>
        <a
          href={weave.targetRepo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="wd-repo-link"
        >
          {weave.targetRepo.fullName}
        </a>
      </div>

      {/* Discovery Run Link */}
      {weave.discoveryRun && (
        <div className="wd-discovery-run">
          <span>From discovery run: </span>
          <Link href={`/plexus/${plexusId}/discovery`}>
            {weave.discoveryRun.id.slice(0, 8)}... ({weave.discoveryRun.status})
          </Link>
        </div>
      )}

      {/* Type-specific Detail */}
      {renderTypeDetail()}

      {/* Comments */}
      {weave.comments.length > 0 && (
        <div className="wd-section wd-comments-section">
          <h3>Comments ({weave.comments.length})</h3>
          <div className="wd-comments">
            {weave.comments.map((comment) => (
              <div key={comment.id} className="wd-comment">
                <div className="wd-comment-header">
                  <span className="wd-comment-author">
                    {comment.user.name || comment.user.email}
                  </span>
                  <span className="wd-comment-date">{formatDate(comment.createdAt)}</span>
                </div>
                <p className="wd-comment-content">{comment.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
