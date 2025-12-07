'use client'

import type {
  WeaveDiscoveryRun,
  WeaveDiscoveryStatus,
  RepoGlossary,
  GlossaryStatus,
  Weave,
} from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { Tabs } from '@symploke/ui/Tabs/Tabs'
import './weave-logs.css'

type LogEntry = {
  timestamp: string
  level: 'info' | 'debug' | 'warn' | 'error'
  message: string
  data?: Record<string, unknown>
}

type Repo = {
  id: string
  fullName: string
  name?: string
}

type GlossaryWithRepo = RepoGlossary & {
  repo: { id: string; fullName: string }
}

type WeaveWithRepos = Weave & {
  sourceRepo: { fullName: string }
  targetRepo: { fullName: string }
}

type FocusPair = {
  blocks: GlossaryWithRepo | null
  carmack: GlossaryWithRepo | null
  weave: WeaveWithRepos | null
  blocksRepoId: string | null
  carmackRepoId: string | null
}

type WeaveLogsProps = {
  plexusId: string
  runs: WeaveDiscoveryRun[]
  repos: Repo[]
  glossaries: GlossaryWithRepo[]
  weaves: WeaveWithRepos[]
  focusPair: FocusPair
}

function StatusBadge({ status }: { status: WeaveDiscoveryStatus | GlossaryStatus | string }) {
  const statusLower = status.toLowerCase()
  return <span className={`wl-status wl-status--${statusLower}`}>{status}</span>
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

// Extract glossary alignment attempts from logs
function extractGlossaryAttempts(logs: LogEntry[]): Array<{
  sourceRepo: string
  targetRepo: string
  scores?: {
    vocabulary: number
    resentment: number
    philosophy: number
    poetics: number
    psychology: number
    final: number
  }
  status: 'calculated' | 'no_glossary' | 'pending'
}> {
  const attempts: Map<
    string,
    {
      sourceRepo: string
      targetRepo: string
      scores?: {
        vocabulary: number
        resentment: number
        philosophy: number
        poetics: number
        psychology: number
        final: number
      }
      status: 'calculated' | 'no_glossary' | 'pending'
    }
  > = new Map()

  for (const log of logs) {
    // Look for "Finding glossary alignments" logs
    if (log.message === 'Finding glossary alignments' && log.data) {
      const sourceId = log.data.sourceRepoId as string
      const targetId = log.data.targetRepoId as string
      const key = `${sourceId}:${targetId}`

      if (!attempts.has(key)) {
        attempts.set(key, {
          sourceRepo: sourceId,
          targetRepo: targetId,
          status: 'pending',
        })
      }
    }

    // Look for "Glossary alignment scores calculated" logs
    if (log.message === 'Glossary alignment scores calculated' && log.data) {
      const sourceId = log.data.sourceRepoId as string
      const targetId = log.data.targetRepoId as string
      const key = `${sourceId}:${targetId}`

      attempts.set(key, {
        sourceRepo: sourceId,
        targetRepo: targetId,
        scores: {
          vocabulary: log.data.vocabularyScore as number,
          resentment: log.data.resentmentScore as number,
          philosophy: log.data.philosophyScore as number,
          poetics: log.data.poeticsScore as number,
          psychology: log.data.psychologyScore as number,
          final: log.data.finalScore as number,
        },
        status: 'calculated',
      })
    }

    // Look for "One or both repos missing complete glossary" logs
    if (log.message.includes('missing complete glossary') && log.data) {
      const sourceId = log.data.sourceRepoId as string
      const targetId = log.data.targetRepoId as string
      const key = `${sourceId}:${targetId}`

      attempts.set(key, {
        sourceRepo: sourceId,
        targetRepo: targetId,
        status: 'no_glossary',
      })
    }
  }

  return Array.from(attempts.values())
}

function GlossariesTab({ glossaries }: { glossaries: GlossaryWithRepo[]; repos: Repo[] }) {
  return (
    <div className="wl-section">
      <h3>Repository Glossaries</h3>
      <p className="wl-description">
        Glossaries extracted from each repository - their vocabulary, psychology, philosophy, and
        resentments.
      </p>

      {glossaries.length === 0 ? (
        <div className="wl-empty">
          No glossaries extracted yet. Run:{' '}
          <code>pnpm engine extract-glossary --plexus-id {'<id>'}</code>
        </div>
      ) : (
        <div className="wl-glossaries">
          {glossaries.map((g) => (
            <div key={g.id} className="wl-glossary-card">
              <div className="wl-glossary-header">
                <span className="wl-glossary-repo">{g.repo.fullName}</span>
                <StatusBadge status={g.status} />
              </div>

              {g.status === 'COMPLETE' && (
                <div className="wl-glossary-content">
                  <div className="wl-glossary-section">
                    <strong>Terms:</strong>
                    <div className="wl-terms">
                      {(g.terms as Array<{ term: string; emotionalValence: string }>)
                        ?.slice(0, 5)
                        .map((t, i) => (
                          <span key={i} className={`wl-term wl-term--${t.emotionalValence}`}>
                            {t.term}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="wl-glossary-section">
                    <strong>Philosophy:</strong>
                    <div className="wl-philosophy">
                      {(g.philosophy as { beliefs?: string[] })?.beliefs
                        ?.slice(0, 2)
                        .map((b, i) => (
                          <div key={i} className="wl-belief">
                            {b}
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="wl-glossary-section">
                    <strong>Resentments:</strong>
                    <div className="wl-resentments">
                      {(g.resentments as { hates?: string[]; enemies?: string[] })?.hates
                        ?.slice(0, 3)
                        .map((h, i) => (
                          <span key={i} className="wl-hate">
                            {h}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="wl-glossary-section">
                    <strong>Future Vision:</strong>
                    <div className="wl-future">{g.futureVision?.slice(0, 200)}...</div>
                  </div>

                  <div className="wl-glossary-meta">
                    <span>Confidence: {((g.confidence || 0) * 100).toFixed(0)}%</span>
                    <span>Extracted: {g.extractedAt ? formatDate(g.extractedAt) : 'N/A'}</span>
                  </div>
                </div>
              )}

              {g.status === 'UNGLOSSABLE' && (
                <div className="wl-unglossable">{g.unglossableReason}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RunDetailTab({ run, repos }: { run: WeaveDiscoveryRun; repos: Repo[] }) {
  const logs = (run.logs as LogEntry[]) || []
  const glossaryAttempts = extractGlossaryAttempts(logs)
  const repoMap = new Map(repos.map((r) => [r.id, r.fullName]))

  return (
    <div className="wl-run-detail">
      <div className="wl-run-header">
        <div className="wl-run-meta">
          <div>
            <strong>Run ID:</strong> {run.id}
          </div>
          <div>
            <strong>Status:</strong> <StatusBadge status={run.status} />
          </div>
          <div>
            <strong>Started:</strong> {formatDate(run.startedAt)}
          </div>
          <div>
            <strong>Pairs:</strong> {run.repoPairsChecked}/{run.repoPairsTotal}
          </div>
          <div>
            <strong>Candidates:</strong> {run.candidatesFound}
          </div>
          <div>
            <strong>Saved:</strong> {run.weavesSaved}
          </div>
        </div>
      </div>

      {glossaryAttempts.length > 0 && (
        <div className="wl-section">
          <h4>Glossary Alignment Attempts</h4>
          <table className="wl-attempts-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Target</th>
                <th>Vocab</th>
                <th>Resent</th>
                <th>Philos</th>
                <th>Poetics</th>
                <th>Psych</th>
                <th>Final</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {glossaryAttempts.map((attempt, i) => (
                <tr
                  key={i}
                  className={
                    attempt.scores && attempt.scores.final >= 0.25 ? 'wl-row--success' : ''
                  }
                >
                  <td>{repoMap.get(attempt.sourceRepo) || attempt.sourceRepo.slice(0, 8)}</td>
                  <td>{repoMap.get(attempt.targetRepo) || attempt.targetRepo.slice(0, 8)}</td>
                  {attempt.scores ? (
                    <>
                      <td className="wl-score">{(attempt.scores.vocabulary * 100).toFixed(0)}%</td>
                      <td className="wl-score">{(attempt.scores.resentment * 100).toFixed(0)}%</td>
                      <td className="wl-score">{(attempt.scores.philosophy * 100).toFixed(0)}%</td>
                      <td className="wl-score">{(attempt.scores.poetics * 100).toFixed(0)}%</td>
                      <td className="wl-score">{(attempt.scores.psychology * 100).toFixed(0)}%</td>
                      <td
                        className={`wl-score wl-score--final ${attempt.scores.final >= 0.25 ? 'wl-score--pass' : 'wl-score--fail'}`}
                      >
                        {(attempt.scores.final * 100).toFixed(0)}%
                      </td>
                    </>
                  ) : (
                    <td colSpan={6} className="wl-no-scores">
                      —
                    </td>
                  )}
                  <td>
                    <span className={`wl-attempt-status wl-attempt-status--${attempt.status}`}>
                      {attempt.status === 'no_glossary' ? 'no glossary' : attempt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="wl-section">
        <h4>Raw Logs ({logs.length} entries)</h4>
        <div className="wl-logs">
          {logs.map((log, i) => (
            <div key={i} className={`wl-log wl-log--${log.level}`}>
              <span className="wl-log-time">
                {new Date(log.timestamp).toISOString().slice(11, 23)}
              </span>
              <span className="wl-log-level">{log.level}</span>
              <span className="wl-log-message">{log.message}</span>
              {log.data && Object.keys(log.data).length > 0 && (
                <pre className="wl-log-data">{JSON.stringify(log.data, null, 2)}</pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FocusPairSection({
  focusPair,
  latestRun,
}: {
  focusPair: FocusPair
  latestRun: WeaveDiscoveryRun | null
}) {
  const { blocks, carmack, weave, blocksRepoId, carmackRepoId } = focusPair

  // Extract alignment scores from logs if available
  let alignmentScores: {
    vocabulary: number
    resentment: number
    philosophy: number
    poetics: number
    psychology: number
    final: number
  } | null = null

  if (latestRun) {
    const logs = (latestRun.logs as LogEntry[]) || []
    for (const log of logs) {
      if (log.message === 'Glossary alignment scores calculated' && log.data) {
        const sourceId = log.data.sourceRepoId as string
        const targetId = log.data.targetRepoId as string
        if (
          (sourceId === blocksRepoId && targetId === carmackRepoId) ||
          (sourceId === carmackRepoId && targetId === blocksRepoId)
        ) {
          alignmentScores = {
            vocabulary: log.data.vocabularyScore as number,
            resentment: log.data.resentmentScore as number,
            philosophy: log.data.philosophyScore as number,
            poetics: log.data.poeticsScore as number,
            psychology: log.data.psychologyScore as number,
            final: log.data.finalScore as number,
          }
          break
        }
      }
    }
  }

  return (
    <div className="wl-focus-section">
      <h2 className="wl-focus-title">🔗 Blocks ↔ Carmack Connection</h2>
      <p className="wl-focus-subtitle">
        Deep comparison of these two repositories and their philosophical alignment
      </p>

      {/* Weave Status */}
      <div className="wl-focus-status">
        {weave ? (
          <div className="wl-focus-weave-exists">
            <span className="wl-focus-weave-icon">✓</span>
            <div>
              <strong>Weave Created!</strong>
              <p>
                {weave.title} - Score: {(weave.score * 100).toFixed(0)}%
              </p>
              <p className="wl-focus-weave-desc">{weave.description}</p>
            </div>
          </div>
        ) : (
          <div className="wl-focus-no-weave">
            <span className="wl-focus-weave-icon">○</span>
            <div>
              <strong>No Weave Yet</strong>
              <p>Discovery run in progress or threshold not met</p>
            </div>
          </div>
        )}
      </div>

      {/* Alignment Scores */}
      {alignmentScores && (
        <div className="wl-focus-scores">
          <h3>Alignment Scores (Latest Run)</h3>
          <div className="wl-focus-scores-grid">
            <div className="wl-focus-score">
              <span className="wl-focus-score-label">Vocabulary</span>
              <span className="wl-focus-score-value">
                {(alignmentScores.vocabulary * 100).toFixed(0)}%
              </span>
            </div>
            <div className="wl-focus-score">
              <span className="wl-focus-score-label">Resentment</span>
              <span className="wl-focus-score-value">
                {(alignmentScores.resentment * 100).toFixed(0)}%
              </span>
            </div>
            <div className="wl-focus-score">
              <span className="wl-focus-score-label">Philosophy</span>
              <span className="wl-focus-score-value">
                {(alignmentScores.philosophy * 100).toFixed(0)}%
              </span>
            </div>
            <div className="wl-focus-score">
              <span className="wl-focus-score-label">Poetics</span>
              <span className="wl-focus-score-value">
                {(alignmentScores.poetics * 100).toFixed(0)}%
              </span>
            </div>
            <div className="wl-focus-score">
              <span className="wl-focus-score-label">Psychology</span>
              <span className="wl-focus-score-value">
                {(alignmentScores.psychology * 100).toFixed(0)}%
              </span>
            </div>
            <div className="wl-focus-score wl-focus-score--final">
              <span className="wl-focus-score-label">Final Score</span>
              <span
                className={`wl-focus-score-value ${alignmentScores.final >= 0.25 ? 'wl-focus-score--pass' : 'wl-focus-score--fail'}`}
              >
                {(alignmentScores.final * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <p className="wl-focus-threshold">Threshold: 25% (scores above this create weaves)</p>
        </div>
      )}

      {/* Glossary Comparison */}
      <div className="wl-focus-glossaries">
        <div className="wl-focus-glossary">
          <h3>thomasdavis/blocks</h3>
          {blocks ? (
            <>
              <StatusBadge status={blocks.status} />
              {blocks.status === 'COMPLETE' && (
                <div className="wl-focus-glossary-content">
                  <div className="wl-focus-section-item">
                    <strong>Philosophy</strong>
                    <ul>
                      {(blocks.philosophy as { beliefs?: string[] })?.beliefs?.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="wl-focus-section-item">
                    <strong>Virtues</strong>
                    <div className="wl-terms">
                      {(blocks.philosophy as { virtues?: string[] })?.virtues?.map((v, i) => (
                        <span key={i} className="wl-term wl-term--positive">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="wl-focus-section-item">
                    <strong>Resentments</strong>
                    <div className="wl-resentments">
                      {(blocks.resentments as { hates?: string[] })?.hates?.map((h, i) => (
                        <span key={i} className="wl-hate">
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="wl-focus-section-item">
                    <strong>Defines Against</strong>
                    <div className="wl-resentments">
                      {(blocks.resentments as { definesAgainst?: string[] })?.definesAgainst?.map(
                        (d, i) => (
                          <span key={i} className="wl-hate">
                            {d}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="wl-focus-no-glossary">No glossary extracted</div>
          )}
        </div>

        <div className="wl-focus-glossary">
          <h3>DavinciDreams/carmack</h3>
          {carmack ? (
            <>
              <StatusBadge status={carmack.status} />
              {carmack.status === 'COMPLETE' && (
                <div className="wl-focus-glossary-content">
                  <div className="wl-focus-section-item">
                    <strong>Philosophy</strong>
                    <ul>
                      {(carmack.philosophy as { beliefs?: string[] })?.beliefs?.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="wl-focus-section-item">
                    <strong>Virtues</strong>
                    <div className="wl-terms">
                      {(carmack.philosophy as { virtues?: string[] })?.virtues?.map((v, i) => (
                        <span key={i} className="wl-term wl-term--positive">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="wl-focus-section-item">
                    <strong>Resentments</strong>
                    <div className="wl-resentments">
                      {(carmack.resentments as { hates?: string[] })?.hates?.map((h, i) => (
                        <span key={i} className="wl-hate">
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="wl-focus-section-item">
                    <strong>Defines Against</strong>
                    <div className="wl-resentments">
                      {(carmack.resentments as { definesAgainst?: string[] })?.definesAgainst?.map(
                        (d, i) => (
                          <span key={i} className="wl-hate">
                            {d}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="wl-focus-no-glossary">No glossary extracted</div>
          )}
        </div>
      </div>
    </div>
  )
}

function WeavesTab({ weaves }: { weaves: WeaveWithRepos[] }) {
  return (
    <div className="wl-section">
      <h3>Created Weaves</h3>
      <p className="wl-description">Weaves that were actually created and saved to the database.</p>

      {weaves.length === 0 ? (
        <div className="wl-empty">No weaves created yet.</div>
      ) : (
        <div className="wl-weaves">
          {weaves.map((w) => (
            <div key={w.id} className="wl-weave-card">
              <div className="wl-weave-header">
                <span className="wl-weave-title">{w.title}</span>
                <span className={`wl-weave-type wl-weave-type--${w.type}`}>
                  {w.type.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="wl-weave-repos">
                {w.sourceRepo.fullName} ↔ {w.targetRepo.fullName}
              </div>
              <div className="wl-weave-description">{w.description}</div>
              <div className="wl-weave-meta">
                <span>Score: {(w.score * 100).toFixed(0)}%</span>
                <span>Created: {formatDate(w.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function WeaveLogs({
  plexusId: _plexusId,
  runs,
  repos,
  glossaries,
  weaves,
  focusPair,
}: WeaveLogsProps) {
  // Always show the latest run (first in the array, sorted by startedAt desc)
  const latestRun = runs[0] || null

  return (
    <div className="wl-page">
      <PageHeader
        title="Weave Logs"
        subtitle="Latest discovery run, glossaries, and weave results"
      />

      {/* Focus Pair Section - Blocks ↔ Carmack */}
      <FocusPairSection focusPair={focusPair} latestRun={latestRun} />

      <Tabs.Root defaultValue="runs">
        <Tabs.List>
          <Tabs.Tab value="runs">Latest Run</Tabs.Tab>
          <Tabs.Tab value="glossaries">Glossaries ({glossaries.length})</Tabs.Tab>
          <Tabs.Tab value="weaves">Weaves ({weaves.length})</Tabs.Tab>
          <Tabs.Indicator />
        </Tabs.List>

        <Tabs.Panel value="runs">
          {latestRun ? (
            <div className="wl-run-content wl-run-content--full">
              <RunDetailTab run={latestRun} repos={repos} />
            </div>
          ) : (
            <div className="wl-empty">
              No discovery runs yet. Run: <code>pnpm engine find-weaves --plexus-id {'<id>'}</code>
            </div>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="glossaries">
          <GlossariesTab glossaries={glossaries} repos={repos} />
        </Tabs.Panel>

        <Tabs.Panel value="weaves">
          <WeavesTab weaves={weaves} />
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  )
}
