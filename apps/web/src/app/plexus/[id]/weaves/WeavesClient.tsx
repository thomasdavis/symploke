'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import type { WeaveType, WeaveDiscoveryRun } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { Select } from '@symploke/ui/Select/Select'
import { Table } from '@symploke/ui/Table/Table'
import { Card, CardContent } from '@symploke/ui/Card/Card'
import { EmptyState } from '@symploke/ui/EmptyState/EmptyState'
import { RepoFlowGraph } from './RepoFlowGraph'
import { WeaveDiscoveryOverlay } from './WeaveDiscoveryOverlay'
import { useWeaveDiscovery } from '@/contexts/WeaveDiscoveryContext'
import './weaves.css'

// Glossary data from database
type GlossaryData = {
  status: string
  empirics: unknown
  philosophy: unknown
  poetics: unknown
  futureVision: string | null
  confidence: number | null
} | null

// Parsed glossary for display
type ParsedGlossary = {
  purpose: string
  features: string[]
  techStack: string[]
  targetUsers: string[]
  kpis: string[]
  roadmap: string[]
  values: string[]
  enemies: string[]
  aesthetic: string
  summary: string | null
  confidence: number | null
}

type Repo = {
  id: string
  name: string
  fullName: string
  url: string
  lastIndexed: Date | null
  createdAt: Date
  _count?: {
    files: number
  }
}

type Weave = {
  id: string
  sourceRepoId: string
  targetRepoId: string
  discoveryRunId: string | null
  type: WeaveType
  title: string
  description: string
  score: number
  createdAt: Date
  sourceRepo: { name: string; fullName: string; glossary: GlossaryData }
  targetRepo: { name: string; fullName: string; glossary: GlossaryData }
  metadata: unknown
}

// Simplified weave type for graph display (without glossary data)
type GraphWeave = {
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

type DiscoveryRun = Pick<WeaveDiscoveryRun, 'id' | 'startedAt' | 'weavesSaved'>

type WeavesClientProps = {
  repos: Repo[]
  weaves: Weave[]
  discoveryRuns: DiscoveryRun[]
  plexusId: string
}

function formatRunDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

function formatWeaveType(type: WeaveType): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function WeaveTypeBadge({ type }: { type: WeaveType }) {
  return (
    <span className={`weave-type-badge weave-type-badge--${type.toLowerCase()}`}>
      {formatWeaveType(type)}
    </span>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const percentage = Math.round(score * 100)
  const level = percentage >= 90 ? 'high' : percentage >= 75 ? 'medium' : 'low'
  return <span className={`weave-score weave-score--${level}`}>{percentage}%</span>
}

// Parse raw glossary data from DB into structured format
function parseGlossary(glossary: GlossaryData): ParsedGlossary | null {
  if (!glossary || glossary.status !== 'COMPLETE') return null

  const empirics = glossary.empirics as Record<string, unknown> | null
  const philosophy = glossary.philosophy as Record<string, unknown> | null
  const poetics = glossary.poetics as Record<string, unknown> | null

  return {
    purpose: (empirics?.purpose as string) || '',
    features: (empirics?.features as string[]) || [],
    techStack: (empirics?.techStack as string[]) || [],
    targetUsers: (empirics?.targetUsers as string[]) || [],
    kpis: (empirics?.kpis as string[]) || [],
    roadmap: (empirics?.roadmap as string[]) || [],
    values: (philosophy?.values as string[]) || [],
    enemies: (philosophy?.enemies as string[]) || [],
    aesthetic: (poetics?.aesthetic as string) || '',
    summary: glossary.futureVision,
    confidence: glossary.confidence,
  }
}

// Glossary metadata from AI comparison
type GlossaryAlignmentMetadata = {
  narrative?: string
  overallScore?: number
  complementary?: boolean
  competing?: boolean
  synergies?: string[]
  tensions?: string[]
}

// Actionable opportunity types
type ActionableOpportunity = {
  type:
    | 'dependency'
    | 'api-integration'
    | 'shared-infra'
    | 'contribution-match'
    | 'data-pipeline'
    | 'pattern-replication'
    | 'merge-candidate'
  title: string
  description: string
  evidence: {
    files?: string[]
    functions?: string[]
    issues?: string[]
    todos?: string[]
  }
  steps: string[]
  effort: 'trivial' | 'small' | 'medium' | 'large'
  value: string
}

type ActionableWeaveMetadata = {
  version?: string
  analysisDepth?: 'screening' | 'deep'
  opportunities?: ActionableOpportunity[]
  noOpportunityReason?: string
}

// Component to display glossary comparison for glossary_alignment weaves
function GlossaryAlignmentDetail({ weave }: { weave: Weave }) {
  const metadata = weave.metadata as GlossaryAlignmentMetadata | null
  const sourceGlossary = parseGlossary(weave.sourceRepo.glossary)
  const targetGlossary = parseGlossary(weave.targetRepo.glossary)

  return (
    <div className="glossary-alignment-detail">
      {/* AI Analysis */}
      {metadata?.narrative && (
        <div className="weave-detail__section">
          <h3>AI Analysis</h3>
          <p className="weave-detail__narrative">{metadata.narrative}</p>
          <div className="weave-detail__badges">
            {metadata.complementary && (
              <span className="weave-detail__badge weave-detail__badge--complementary">
                Complementary
              </span>
            )}
            {metadata.competing && (
              <span className="weave-detail__badge weave-detail__badge--competing">Same Arena</span>
            )}
          </div>
        </div>
      )}

      {/* Synergies */}
      {metadata?.synergies && metadata.synergies.length > 0 && (
        <div className="weave-detail__section">
          <h3>Synergies</h3>
          <ul className="weave-detail__list weave-detail__list--synergies">
            {metadata.synergies.map((synergy, i) => (
              <li key={i}>{synergy}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tensions */}
      {metadata?.tensions && metadata.tensions.length > 0 && (
        <div className="weave-detail__section">
          <h3>Potential Tensions</h3>
          <ul className="weave-detail__list weave-detail__list--tensions">
            {metadata.tensions.map((tension, i) => (
              <li key={i}>{tension}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Glossary Comparison */}
      {(sourceGlossary || targetGlossary) && (
        <div className="weave-detail__section weave-detail__glossary-comparison">
          <h3>Glossary Comparison</h3>
          <div className="weave-detail__glossary-grid">
            {/* Source Glossary */}
            <div className="weave-detail__glossary-card">
              <h4>{weave.sourceRepo.name}</h4>
              {sourceGlossary ? (
                <GlossaryBreakdown glossary={sourceGlossary} />
              ) : (
                <p className="weave-detail__empty">No glossary available</p>
              )}
            </div>

            {/* Target Glossary */}
            <div className="weave-detail__glossary-card">
              <h4>{weave.targetRepo.name}</h4>
              {targetGlossary ? (
                <GlossaryBreakdown glossary={targetGlossary} />
              ) : (
                <p className="weave-detail__empty">No glossary available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Component to display a single glossary breakdown
function GlossaryBreakdown({ glossary }: { glossary: ParsedGlossary }) {
  return (
    <div className="glossary-breakdown">
      {glossary.purpose && (
        <div className="glossary-breakdown__item">
          <span className="glossary-breakdown__label">Purpose</span>
          <p>{glossary.purpose}</p>
        </div>
      )}

      {glossary.features.length > 0 && (
        <div className="glossary-breakdown__item">
          <span className="glossary-breakdown__label">Features</span>
          <ul>
            {glossary.features.slice(0, 4).map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {glossary.values.length > 0 && (
        <div className="glossary-breakdown__item">
          <span className="glossary-breakdown__label">Values</span>
          <div className="glossary-breakdown__tags">
            {glossary.values.map((v, i) => (
              <span key={i} className="glossary-breakdown__tag glossary-breakdown__tag--value">
                {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {glossary.enemies.length > 0 && (
        <div className="glossary-breakdown__item">
          <span className="glossary-breakdown__label">Enemies</span>
          <div className="glossary-breakdown__tags">
            {glossary.enemies.map((e, i) => (
              <span key={i} className="glossary-breakdown__tag glossary-breakdown__tag--enemy">
                {e}
              </span>
            ))}
          </div>
        </div>
      )}

      {glossary.techStack.length > 0 && (
        <div className="glossary-breakdown__item">
          <span className="glossary-breakdown__label">Tech Stack</span>
          <div className="glossary-breakdown__tags">
            {glossary.techStack.slice(0, 5).map((t, i) => (
              <span key={i} className="glossary-breakdown__tag">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Component to display actionable opportunities for integration_opportunity weaves
function ActionableOpportunitiesDetail({ weave }: { weave: Weave }) {
  const metadata = weave.metadata as ActionableWeaveMetadata | null
  const opportunities = metadata?.opportunities || []

  const effortLabels = {
    trivial: '< 1 hour',
    small: '1-4 hours',
    medium: '1-2 days',
    large: '1+ week',
  }

  const opportunityTypeLabels: Record<ActionableOpportunity['type'], string> = {
    dependency: 'Dependency',
    'api-integration': 'API Integration',
    'shared-infra': 'Shared Infrastructure',
    'contribution-match': 'Contributor Match',
    'data-pipeline': 'Data Pipeline',
    'pattern-replication': 'Pattern Replication',
    'merge-candidate': 'Merge Candidate',
  }

  if (opportunities.length === 0) {
    return (
      <div className="actionable-opportunities">
        <div className="actionable-opportunities__empty">
          <p>{metadata?.noOpportunityReason || 'No actionable opportunities found'}</p>
          {metadata?.analysisDepth && (
            <span className="actionable-opportunities__depth">
              Analysis depth: {metadata.analysisDepth}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="actionable-opportunities">
      <div className="actionable-opportunities__header">
        <h3>
          {opportunities.length} Actionable Opportunit{opportunities.length === 1 ? 'y' : 'ies'}
        </h3>
        {metadata?.analysisDepth && (
          <span className="actionable-opportunities__depth-badge">
            {metadata.analysisDepth === 'deep' ? 'Deep Analysis' : 'Screening'}
          </span>
        )}
      </div>

      {opportunities.map((opp, index) => (
        <div key={index} className="actionable-opportunity">
          <div className="actionable-opportunity__header">
            <span
              className={`actionable-opportunity__type actionable-opportunity__type--${opp.type}`}
            >
              {opportunityTypeLabels[opp.type]}
            </span>
            <span
              className={`actionable-opportunity__effort actionable-opportunity__effort--${opp.effort}`}
            >
              {effortLabels[opp.effort]}
            </span>
          </div>

          <h4 className="actionable-opportunity__title">{opp.title}</h4>
          <p className="actionable-opportunity__description">{opp.description}</p>

          {/* Value proposition */}
          <div className="actionable-opportunity__value">
            <span className="actionable-opportunity__value-label">Value:</span>
            <span>{opp.value}</span>
          </div>

          {/* Evidence */}
          {(opp.evidence.files?.length ||
            opp.evidence.functions?.length ||
            opp.evidence.todos?.length) && (
            <div className="actionable-opportunity__evidence">
              <span className="actionable-opportunity__evidence-label">Evidence:</span>
              {opp.evidence.files && opp.evidence.files.length > 0 && (
                <div className="actionable-opportunity__evidence-section">
                  <span>Files:</span>
                  <ul>
                    {opp.evidence.files.slice(0, 3).map((file, i) => (
                      <li key={i}>
                        <code>{file}</code>
                      </li>
                    ))}
                    {opp.evidence.files.length > 3 && (
                      <li className="actionable-opportunity__more">
                        +{opp.evidence.files.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
              {opp.evidence.functions && opp.evidence.functions.length > 0 && (
                <div className="actionable-opportunity__evidence-section">
                  <span>Functions:</span>
                  <ul>
                    {opp.evidence.functions.map((fn, i) => (
                      <li key={i}>
                        <code>{fn}()</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {opp.evidence.todos && opp.evidence.todos.length > 0 && (
                <div className="actionable-opportunity__evidence-section">
                  <span>TODOs:</span>
                  <ul>
                    {opp.evidence.todos.map((todo, i) => (
                      <li key={i}>{todo}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Implementation steps */}
          {opp.steps.length > 0 && (
            <div className="actionable-opportunity__steps">
              <span className="actionable-opportunity__steps-label">Implementation Steps:</span>
              <ol>
                {opp.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function WeaveDetail({
  weave,
  onClose,
  plexusId,
}: {
  weave: Weave
  onClose: () => void
  plexusId: string
}) {
  const metadata = weave.metadata as {
    filePairs?: Array<{ sourceFile: string; targetFile: string; avgSimilarity: number }>
  } | null

  return (
    <div className="weave-detail">
      <div className="weave-detail__header">
        <h2>{weave.title}</h2>
        <button type="button" className="weave-detail__close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <Link href={`/plexus/${plexusId}/weaves/${weave.id}`} className="weave-detail__view-full">
        View Full Details
      </Link>

      <div className="weave-detail__meta">
        <div className="weave-detail__badges">
          <WeaveTypeBadge type={weave.type} />
          <ScoreBadge score={weave.score} />
        </div>

        <div className="weave-detail__repos">
          <div className="weave-detail__repo">
            <span className="weave-detail__label">Source</span>
            <span className="weave-detail__value">{weave.sourceRepo.fullName}</span>
          </div>
          <div className="weave-detail__arrow" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M4 10H16M16 10L11 5M16 10L11 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="weave-detail__repo">
            <span className="weave-detail__label">Target</span>
            <span className="weave-detail__value">{weave.targetRepo.fullName}</span>
          </div>
        </div>
      </div>

      {/* Type-specific detail views */}
      {weave.type === 'glossary_alignment' ? (
        <GlossaryAlignmentDetail weave={weave} />
      ) : weave.type === 'integration_opportunity' ? (
        <ActionableOpportunitiesDetail weave={weave} />
      ) : (
        <>
          <div className="weave-detail__description">
            <h3>Description</h3>
            <p>{weave.description}</p>
          </div>

          {metadata?.filePairs && metadata.filePairs.length > 0 && (
            <div className="weave-detail__files">
              <h3>Related File Pairs</h3>
              <div className="weave-detail__file-list">
                {metadata.filePairs.map((pair, i) => (
                  <div key={i} className="weave-detail__file-pair">
                    <div className="weave-detail__file-similarity">
                      {Math.round(pair.avgSimilarity * 100)}%
                    </div>
                    <div className="weave-detail__file-paths">
                      <code>{pair.sourceFile}</code>
                      <span className="weave-detail__file-arrow">&harr;</span>
                      <code>{pair.targetFile}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Tab icons
function GraphIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 5.5L7 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.5 5.5L9 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function TableIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 6H14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 6V14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function WeavesClient({ repos, weaves, discoveryRuns, plexusId }: WeavesClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Get view from URL param, default to 'graph'
  const viewParam = searchParams.get('view')
  const activeView = viewParam === 'table' ? 'table' : 'graph'

  const [selectedRunId, setSelectedRunId] = useState<string>('latest')
  const [selectedWeave, setSelectedWeave] = useState<Weave | null>(null)
  const [minScore, setMinScore] = useState<number>(0.3)

  // Weave discovery real-time progress (from context)
  const weaveProgress = useWeaveDiscovery()

  const setActiveView = (view: 'graph' | 'table') => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', view)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const filteredWeaves = useMemo(() => {
    let result = weaves

    // Filter by run
    if (selectedRunId === 'all') {
      result = weaves
    } else if (selectedRunId === 'latest') {
      const latestRunId = discoveryRuns[0]?.id
      if (latestRunId) {
        const runWeaves = weaves.filter((w) => w.discoveryRunId === latestRunId)
        result = runWeaves.length > 0 ? runWeaves : weaves.filter((w) => !w.discoveryRunId)
      }
    } else {
      result = weaves.filter((w) => w.discoveryRunId === selectedRunId)
    }

    // Filter by minimum score
    return result.filter((w) => w.score >= minScore)
  }, [weaves, selectedRunId, discoveryRuns, minScore])

  // Convert to graph weave format (without glossary data)
  const graphWeaves: GraphWeave[] = useMemo(() => {
    return filteredWeaves.map((w) => ({
      id: w.id,
      sourceRepoId: w.sourceRepoId,
      targetRepoId: w.targetRepoId,
      type: w.type,
      title: w.title,
      description: w.description,
      score: w.score,
      sourceRepo: { name: w.sourceRepo.name },
      targetRepo: { name: w.targetRepo.name },
    }))
  }, [filteredWeaves])

  const selectedRun =
    selectedRunId !== 'latest' && selectedRunId !== 'all'
      ? discoveryRuns.find((r) => r.id === selectedRunId)
      : selectedRunId === 'latest'
        ? discoveryRuns[0]
        : null

  const columns = [
    {
      header: 'Type',
      accessor: (weave: Weave) => <WeaveTypeBadge type={weave.type} />,
      width: 'shrink' as const,
    },
    {
      header: 'Title',
      accessor: (weave: Weave) => weave.title,
      width: 'grow' as const,
    },
    {
      header: 'Source',
      accessor: (weave: Weave) => weave.sourceRepo.name,
      width: 'shrink' as const,
    },
    {
      header: 'Target',
      accessor: (weave: Weave) => weave.targetRepo.name,
      width: 'shrink' as const,
    },
    {
      header: 'Score',
      accessor: (weave: Weave) => <ScoreBadge score={weave.score} />,
      width: 'shrink' as const,
      align: 'right' as const,
    },
  ]

  // During discovery, show the higher of weavesFound (from Pusher/polling) or filteredWeaves (from server)
  // This handles the case where the page loads mid-discovery with weaves already in DB
  const displayWeaveCount = weaveProgress.isRunning
    ? Math.max(weaveProgress.weavesFound, filteredWeaves.length)
    : filteredWeaves.length

  return (
    <div className={`weaves-page ${activeView === 'table' ? 'weaves-page--table-view' : ''}`}>
      <div className="weaves-header">
        <PageHeader
          title="Weaves"
          subtitle={`${repos.length} repositories · ${displayWeaveCount} weave${displayWeaveCount !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Tabs and Run Selector Row */}
      <div className="weaves-tabs-row">
        <div className="weaves-tabs">
          <button
            type="button"
            className={`weaves-tab ${activeView === 'graph' ? 'weaves-tab--active' : ''}`}
            onClick={() => setActiveView('graph')}
          >
            <GraphIcon />
            Graph
          </button>
          <button
            type="button"
            className={`weaves-tab ${activeView === 'table' ? 'weaves-tab--active' : ''}`}
            onClick={() => setActiveView('table')}
          >
            <TableIcon />
            Table
          </button>
        </div>
        <div className="weaves-run-selector">
          <Select.Root
            value={weaveProgress.isRunning ? 'running' : selectedRunId}
            onValueChange={(val) => {
              if (val !== 'running') {
                setSelectedRunId(typeof val === 'string' ? val : 'latest')
              }
            }}
          >
            <Select.Trigger className="run-selector-trigger">
              <Select.Value>
                {weaveProgress.isRunning
                  ? `Running... ${displayWeaveCount} weave${displayWeaveCount !== 1 ? 's' : ''} found`
                  : selectedRunId === 'all'
                    ? `All runs (${weaves.length} weaves)`
                    : selectedRunId === 'latest'
                      ? selectedRun
                        ? `Latest: ${formatRunDate(selectedRun.startedAt)} (${filteredWeaves.length} weaves)`
                        : 'Latest run'
                      : selectedRun
                        ? `${formatRunDate(selectedRun.startedAt)} (${selectedRun.weavesSaved} weaves)`
                        : 'Select run'}
              </Select.Value>
              <Select.Icon aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner>
                <Select.Popup>
                  <Select.List>
                    {weaveProgress.isRunning && (
                      <>
                        <Select.Item value="running">
                          <Select.ItemText>
                            Running... {displayWeaveCount} weave
                            {displayWeaveCount !== 1 ? 's' : ''} found
                            {weaveProgress.currentSourceRepoName &&
                            weaveProgress.currentTargetRepoName
                              ? ` (${weaveProgress.currentSourceRepoName} ↔ ${weaveProgress.currentTargetRepoName})`
                              : ''}
                          </Select.ItemText>
                          <Select.ItemIndicator aria-hidden="true">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M2.5 6L5 8.5L9.5 3.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </Select.ItemIndicator>
                        </Select.Item>
                        <Select.Separator />
                      </>
                    )}
                    <Select.Item value="all">
                      <Select.ItemText>All runs ({weaves.length} weaves)</Select.ItemText>
                      <Select.ItemIndicator aria-hidden="true">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M2.5 6L5 8.5L9.5 3.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </Select.ItemIndicator>
                    </Select.Item>
                    <Select.Item value="latest">
                      <Select.ItemText>
                        Latest run
                        {discoveryRuns[0] ? ` (${discoveryRuns[0].weavesSaved} weaves)` : ''}
                      </Select.ItemText>
                      <Select.ItemIndicator aria-hidden="true">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M2.5 6L5 8.5L9.5 3.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </Select.ItemIndicator>
                    </Select.Item>
                    {discoveryRuns.length > 0 && <Select.Separator />}
                    {discoveryRuns.map((run) => (
                      <Select.Item key={run.id} value={run.id}>
                        <Select.ItemText>
                          {formatRunDate(run.startedAt)} ({run.weavesSaved} weaves)
                        </Select.ItemText>
                        <Select.ItemIndicator aria-hidden="true">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M2.5 6L5 8.5L9.5 3.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.List>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </div>
      </div>

      {/* Score filter bar (shown for both views) */}
      <div className="weaves-score-filter-bar">
        <div className="weaves-score-filter-bar__control">
          <label htmlFor="weaves-min-score">
            Min Score: <strong>{Math.round(minScore * 100)}%</strong>
          </label>
          <input
            id="weaves-min-score"
            type="range"
            min="0"
            max="100"
            value={minScore * 100}
            onChange={(e) => setMinScore(Number(e.target.value) / 100)}
            className="weaves-score-slider-wide"
          />
        </div>
        <span className="weaves-score-filter-bar__count">
          {displayWeaveCount} weave{displayWeaveCount !== 1 ? 's' : ''} shown
        </span>
      </div>

      {/* Graph View */}
      {activeView === 'graph' && (
        <div className="weaves-graph-container">
          <RepoFlowGraph
            repos={repos}
            weaves={graphWeaves}
            plexusId={plexusId}
            isDiscoveryRunning={weaveProgress.isRunning}
            newWeaves={weaveProgress.newWeaves}
          />
          {weaveProgress.isRunning && (
            <WeaveDiscoveryOverlay
              repoPairsChecked={weaveProgress.repoPairsChecked}
              repoPairsTotal={weaveProgress.repoPairsTotal}
              weavesFound={weaveProgress.weavesFound}
              progress={weaveProgress.progress}
            />
          )}
        </div>
      )}

      {/* Table View */}
      {activeView === 'table' && (
        <div className="weaves-content">
          <div className="weaves-main">
            {filteredWeaves.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState
                    title="No weaves found"
                    description="Run weave discovery from the CLI to find integration opportunities between your repositories."
                    actionLabel="View Documentation"
                    actionHref="https://github.com/symploke/symploke"
                  />
                  <div className="weaves-empty-command">
                    <code>pnpm engine find-weaves --plexus-id {plexusId}</code>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="weaves-table-wrapper">
                <Table
                  columns={columns}
                  data={filteredWeaves}
                  getRowKey={(weave) => weave.id}
                  getRowHref={(weave) => `/plexus/${plexusId}/weaves/${weave.id}`}
                  emptyMessage="No weaves found"
                />
              </div>
            )}
          </div>

          {selectedWeave && (
            <div className="weaves-sidebar">
              <WeaveDetail
                weave={selectedWeave}
                onClose={() => setSelectedWeave(null)}
                plexusId={plexusId}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
