'use client'

import type { GlossaryStatus } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import Link from 'next/link'
import './glossary-detail.css'

type GlossaryData = {
  id: string
  status: GlossaryStatus
  // What it is
  purpose: string
  category: string
  domain: string
  // What it provides
  provides: string[]
  outputs: string[]
  apis: string[]
  // What it needs
  consumes: string[]
  dependencies: string[]
  gaps: string[]
  // Technical
  techStack: string[]
  patterns: string[]
  // Philosophical
  values: string[]
  antipatterns: string[]
  // Meta
  confidence: number | null
  summary: string | null
  extractedAt: string | null
  unglossableReason: string | null
}

type Repo = {
  id: string
  name: string
  fullName: string
}

type GlossaryDetailClientProps = {
  plexusId: string
  repo: Repo
  glossary: GlossaryData | null
}

function StatusBadge({ status }: { status: GlossaryStatus }) {
  const statusLower = status.toLowerCase()
  return <span className={`gd-status gd-status--${statusLower}`}>{status}</span>
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

function Section({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`gd-section ${className}`}>
      <h3 className="gd-section-title">{title}</h3>
      <div className="gd-section-content">{children}</div>
    </div>
  )
}

function TagList({
  items,
  variant = 'default',
}: {
  items: string[]
  variant?: 'default' | 'positive' | 'negative' | 'sacred' | 'tech'
}) {
  if (!items || items.length === 0) {
    return <span className="gd-empty">None specified</span>
  }
  return (
    <div className="gd-tags">
      {items.map((item, i) => (
        <span key={i} className={`gd-tag gd-tag--${variant}`}>
          {item}
        </span>
      ))}
    </div>
  )
}

function TextBlock({
  text,
  fallback = 'Not specified',
}: {
  text: string | null | undefined
  fallback?: string
}) {
  if (!text) {
    return <span className="gd-empty">{fallback}</span>
  }
  return <p className="gd-text">{text}</p>
}

function BulletList({ items }: { items: string[] }) {
  if (!items || items.length === 0) {
    return <span className="gd-empty">None specified</span>
  }
  return (
    <ul className="gd-list">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

export function GlossaryDetailClient({ plexusId, repo, glossary }: GlossaryDetailClientProps) {
  return (
    <div className="gd-page">
      <div className="gd-nav">
        <Link href={`/plexus/${plexusId}/repos/${repo.id}`} className="gd-back-link">
          Back to {repo.name}
        </Link>
      </div>

      <PageHeader
        title={`Profile: ${repo.fullName}`}
        subtitle="What this repository does, believes, and fights against"
      />

      {!glossary ? (
        <div className="gd-empty-state">
          <h3>No Profile Extracted</h3>
          <p>Run the glossary extraction command to generate a profile for this repository:</p>
          <code>pnpm engine extract-glossary --repo-id {repo.id}</code>
        </div>
      ) : glossary.status === 'UNGLOSSABLE' ? (
        <div className="gd-unglossable">
          <StatusBadge status={glossary.status} />
          <h3>Repository Cannot Be Profiled</h3>
          <p>{glossary.unglossableReason || 'README is missing or too short'}</p>
        </div>
      ) : glossary.status !== 'COMPLETE' ? (
        <div className="gd-pending">
          <StatusBadge status={glossary.status} />
          <p>Profile extraction is {glossary.status.toLowerCase()}...</p>
        </div>
      ) : (
        <>
          {/* Meta info */}
          <div className="gd-meta">
            <StatusBadge status={glossary.status} />
            <span className="gd-meta-item">
              Confidence: {((glossary.confidence || 0) * 100).toFixed(0)}%
            </span>
            {glossary.extractedAt && (
              <span className="gd-meta-item">Extracted: {formatDate(glossary.extractedAt)}</span>
            )}
          </div>

          {/* Summary */}
          {glossary.summary && (
            <Section title="Summary" className="gd-summary-section">
              <div className="gd-summary">
                <p>{glossary.summary}</p>
              </div>
            </Section>
          )}

          {/* What It Is */}
          <Section title="What It Is">
            <div className="gd-practical-grid">
              <div className="gd-subsection">
                <h4>Purpose</h4>
                <TextBlock text={glossary.purpose} fallback="Not specified" />
              </div>
              <div className="gd-subsection">
                <h4>Category</h4>
                <TextBlock text={glossary.category} fallback="Not specified" />
              </div>
              <div className="gd-subsection">
                <h4>Domain</h4>
                <TextBlock text={glossary.domain} fallback="Not specified" />
              </div>
            </div>
          </Section>

          {/* What It Provides */}
          <Section title="What It Provides">
            <div className="gd-practical-grid">
              <div className="gd-subsection">
                <h4>Capabilities</h4>
                <BulletList items={glossary.provides || []} />
              </div>
              <div className="gd-subsection">
                <h4>Outputs</h4>
                <TagList items={glossary.outputs || []} variant="positive" />
              </div>
              <div className="gd-subsection">
                <h4>APIs / Interfaces</h4>
                <TagList items={glossary.apis || []} variant="tech" />
              </div>
            </div>
          </Section>

          {/* What It Needs */}
          <Section title="What It Needs">
            <div className="gd-practical-grid">
              <div className="gd-subsection">
                <h4>Consumes</h4>
                <TagList items={glossary.consumes || []} />
              </div>
              <div className="gd-subsection">
                <h4>Dependencies</h4>
                <TagList items={glossary.dependencies || []} variant="tech" />
              </div>
              {glossary.gaps && glossary.gaps.length > 0 && (
                <div className="gd-subsection">
                  <h4>Gaps / Wants</h4>
                  <TagList items={glossary.gaps} variant="sacred" />
                </div>
              )}
            </div>
          </Section>

          {/* Technical */}
          <Section title="Technical">
            <div className="gd-practical-grid">
              <div className="gd-subsection">
                <h4>Tech Stack</h4>
                <TagList items={glossary.techStack || []} variant="tech" />
              </div>
              <div className="gd-subsection">
                <h4>Patterns</h4>
                <TagList items={glossary.patterns || []} />
              </div>
            </div>
          </Section>

          {/* Philosophy */}
          <Section title="Philosophy">
            <div className="gd-philosophy-grid">
              <div className="gd-subsection">
                <h4>Values</h4>
                <TagList items={glossary.values || []} variant="positive" />
              </div>
              {glossary.antipatterns && glossary.antipatterns.length > 0 && (
                <div className="gd-subsection">
                  <h4>Avoids</h4>
                  <TagList items={glossary.antipatterns} variant="negative" />
                </div>
              )}
            </div>
          </Section>
        </>
      )}
    </div>
  )
}
