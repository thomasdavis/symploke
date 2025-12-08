'use client'

import Link from 'next/link'
import type { WeaveType } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
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

type WeaveDetailClientProps = {
  plexusId: string
  weave: WeaveData
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

function GlossaryAlignmentDetail({ weave, plexusId }: { weave: WeaveData; plexusId: string }) {
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

      {/* Repository Summaries */}
      {(metadata.sourceSummary || metadata.targetSummary) && (
        <div className="wd-section">
          <h3>Repository Summaries</h3>
          <div className="wd-summaries-compare">
            <div className="wd-summary-card">
              <h4>{weave.sourceRepo.fullName}</h4>
              <p>{metadata.sourceSummary || 'No summary available'}</p>
              <Link
                href={`/plexus/${plexusId}/repos/${weave.sourceRepo.id}/glossary`}
                className="wd-glossary-link"
              >
                View Full Profile
              </Link>
            </div>
            <div className="wd-summary-card">
              <h4>{weave.targetRepo.fullName}</h4>
              <p>{metadata.targetSummary || 'No summary available'}</p>
              <Link
                href={`/plexus/${plexusId}/repos/${weave.targetRepo.id}/glossary`}
                className="wd-glossary-link"
              >
                View Full Profile
              </Link>
            </div>
          </div>
        </div>
      )}
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
