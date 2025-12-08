'use client'

import Link from 'next/link'
import type { WeaveType, GlossaryStatus } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import './weave-detail.css'

// Types
type GlossaryData = {
  id: string
  status: GlossaryStatus
  terms: Array<{
    term: string
    definition: string
    context: string
    emotionalValence: string
  }>
  philosophy: {
    beliefs: string[]
    assumptions: string[]
    virtues: string[]
    epistemology: string
    ontology: string
    teleology: string
  }
  psychology: {
    fears: string[]
    confidences: string[]
    defenses: string[]
    attachments: string[]
    blindSpots: string[]
  }
  resentments: {
    hates: string[]
    definesAgainst: string[]
    allergies: string[]
    warnings: string[]
    enemies: string[]
  }
  poetics: {
    metaphors: string[]
    namingPatterns: string[]
    aesthetic: string
    rhythm: string
    voice: string
  }
  empirics: {
    measures: string[]
    evidenceTypes: string[]
    truthClaims: string[]
    uncertainties: string[]
  }
  futureVision: string | null
  confidence: number | null
}

type RepoData = {
  id: string
  name: string
  fullName: string
  url: string
  glossary: GlossaryData | null
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
function StatusBadge({ status }: { status: string }) {
  const statusLower = status.toLowerCase()
  return <span className={`wd-status wd-status--${statusLower}`}>{status}</span>
}

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

function TagList({
  items,
  variant = 'default',
}: {
  items: string[]
  variant?: 'default' | 'positive' | 'negative' | 'sacred'
}) {
  if (!items || items.length === 0) {
    return <span className="wd-empty">None</span>
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

// ============================================================================
// GLOSSARY ALIGNMENT DETAIL
// ============================================================================

function GlossaryAlignmentDetail({ weave, plexusId }: { weave: WeaveData; plexusId: string }) {
  const metadata = weave.metadata as {
    alignmentScores?: {
      vocabulary: number
      resentment: number
      philosophy: number
      poetics: number
      psychology: number
      final: number
    }
    sharedTerms?: string[]
    sharedEnemies?: string[]
    sharedVirtues?: string[]
    sharedMetaphors?: string[]
  } | null

  const alignmentScores = metadata?.alignmentScores
  const sourceGlossary = weave.sourceRepo.glossary
  const targetGlossary = weave.targetRepo.glossary

  return (
    <div className="wd-type-detail wd-glossary-detail">
      {/* Alignment Scores */}
      {alignmentScores && (
        <div className="wd-section">
          <h3>Alignment Scores</h3>
          <div className="wd-alignment-grid">
            <div className="wd-alignment-score">
              <span className="wd-alignment-label">Vocabulary (30%)</span>
              <div className="wd-alignment-bar">
                <div
                  className="wd-alignment-fill"
                  style={{ width: `${alignmentScores.vocabulary * 100}%` }}
                />
              </div>
              <span className="wd-alignment-value">
                {(alignmentScores.vocabulary * 100).toFixed(0)}%
              </span>
            </div>
            <div className="wd-alignment-score">
              <span className="wd-alignment-label">Resentment (25%)</span>
              <div className="wd-alignment-bar">
                <div
                  className="wd-alignment-fill wd-alignment-fill--resentment"
                  style={{ width: `${alignmentScores.resentment * 100}%` }}
                />
              </div>
              <span className="wd-alignment-value">
                {(alignmentScores.resentment * 100).toFixed(0)}%
              </span>
            </div>
            <div className="wd-alignment-score">
              <span className="wd-alignment-label">Philosophy (20%)</span>
              <div className="wd-alignment-bar">
                <div
                  className="wd-alignment-fill wd-alignment-fill--philosophy"
                  style={{ width: `${alignmentScores.philosophy * 100}%` }}
                />
              </div>
              <span className="wd-alignment-value">
                {(alignmentScores.philosophy * 100).toFixed(0)}%
              </span>
            </div>
            <div className="wd-alignment-score">
              <span className="wd-alignment-label">Poetics (15%)</span>
              <div className="wd-alignment-bar">
                <div
                  className="wd-alignment-fill wd-alignment-fill--poetics"
                  style={{ width: `${alignmentScores.poetics * 100}%` }}
                />
              </div>
              <span className="wd-alignment-value">
                {(alignmentScores.poetics * 100).toFixed(0)}%
              </span>
            </div>
            <div className="wd-alignment-score">
              <span className="wd-alignment-label">Psychology (10%)</span>
              <div className="wd-alignment-bar">
                <div
                  className="wd-alignment-fill wd-alignment-fill--psychology"
                  style={{ width: `${alignmentScores.psychology * 100}%` }}
                />
              </div>
              <span className="wd-alignment-value">
                {(alignmentScores.psychology * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <p className="wd-threshold-note">Threshold: 25% (scores above this create weaves)</p>
        </div>
      )}

      {/* Shared Items */}
      {metadata && (
        <div className="wd-section">
          <h3>Shared Characteristics</h3>
          <div className="wd-shared-grid">
            {metadata.sharedTerms && metadata.sharedTerms.length > 0 && (
              <div className="wd-shared-item">
                <h4>Shared Terms</h4>
                <TagList items={metadata.sharedTerms} />
              </div>
            )}
            {metadata.sharedEnemies && metadata.sharedEnemies.length > 0 && (
              <div className="wd-shared-item">
                <h4>Shared Enemies</h4>
                <TagList items={metadata.sharedEnemies} variant="negative" />
              </div>
            )}
            {metadata.sharedVirtues && metadata.sharedVirtues.length > 0 && (
              <div className="wd-shared-item">
                <h4>Shared Virtues</h4>
                <TagList items={metadata.sharedVirtues} variant="positive" />
              </div>
            )}
            {metadata.sharedMetaphors && metadata.sharedMetaphors.length > 0 && (
              <div className="wd-shared-item">
                <h4>Shared Metaphors</h4>
                <TagList items={metadata.sharedMetaphors} variant="sacred" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Side-by-side Glossaries */}
      <div className="wd-section">
        <h3>Glossary Comparison</h3>
        <div className="wd-glossary-compare">
          <GlossaryCard repo={weave.sourceRepo} glossary={sourceGlossary} plexusId={plexusId} />
          <GlossaryCard repo={weave.targetRepo} glossary={targetGlossary} plexusId={plexusId} />
        </div>
      </div>
    </div>
  )
}

function GlossaryCard({
  repo,
  glossary,
  plexusId,
}: {
  repo: RepoData
  glossary: GlossaryData | null
  plexusId: string
}) {
  return (
    <div className="wd-glossary-card">
      <div className="wd-glossary-header">
        <h4>{repo.fullName}</h4>
        {glossary && <StatusBadge status={glossary.status} />}
        <Link href={`/plexus/${plexusId}/repos/${repo.id}/glossary`} className="wd-glossary-link">
          View Full Glossary
        </Link>
      </div>

      {!glossary || glossary.status !== 'COMPLETE' ? (
        <div className="wd-glossary-empty">
          {glossary ? `Status: ${glossary.status}` : 'No glossary extracted'}
        </div>
      ) : (
        <div className="wd-glossary-content">
          {/* Philosophy */}
          <div className="wd-glossary-section">
            <strong>Beliefs</strong>
            <ul>
              {glossary.philosophy?.beliefs?.slice(0, 3).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>

          {/* Virtues */}
          <div className="wd-glossary-section">
            <strong>Virtues</strong>
            <TagList items={glossary.philosophy?.virtues?.slice(0, 5) || []} variant="positive" />
          </div>

          {/* Resentments */}
          <div className="wd-glossary-section">
            <strong>Resentments</strong>
            <TagList items={glossary.resentments?.hates?.slice(0, 5) || []} variant="negative" />
          </div>

          {/* Enemies */}
          <div className="wd-glossary-section">
            <strong>Enemies</strong>
            <TagList items={glossary.resentments?.enemies?.slice(0, 5) || []} variant="negative" />
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
