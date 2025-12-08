'use client'

import Link from 'next/link'
import type { GlossaryStatus } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import './glossary-detail.css'

type GlossaryTerm = {
  term: string
  definition: string
  context: string
  emotionalValence: string
}

type GlossaryData = {
  id: string
  status: GlossaryStatus
  terms: GlossaryTerm[]
  empirics: {
    measures: string[]
    evidenceTypes: string[]
    truthClaims: string[]
    uncertainties: string[]
  }
  psychology: {
    fears: string[]
    confidences: string[]
    defenses: string[]
    attachments: string[]
    blindSpots: string[]
  }
  poetics: {
    metaphors: string[]
    namingPatterns: string[]
    aesthetic: string
    rhythm: string
    voice: string
  }
  philosophy: {
    beliefs: string[]
    assumptions: string[]
    virtues: string[]
    epistemology: string
    ontology: string
    teleology: string
  }
  resentments: {
    hates: string[]
    definesAgainst: string[]
    allergies: string[]
    warnings: string[]
    enemies: string[]
  }
  futureVision: string | null
  confidence: number | null
  unglossableReason: string | null
  extractedAt: string | null
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
  variant?: 'default' | 'positive' | 'negative' | 'sacred' | 'profane'
}) {
  if (!items || items.length === 0) {
    return <span className="gd-empty">None</span>
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
    return <span className="gd-empty">None</span>
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
        title={`Glossary: ${repo.fullName}`}
        subtitle="The soul of this codebase - its vocabulary, psychology, philosophy, and resentments"
      />

      {!glossary ? (
        <div className="gd-empty-state">
          <h3>No Glossary Extracted</h3>
          <p>Run the glossary extraction command to generate a glossary for this repository:</p>
          <code>pnpm engine extract-glossary --repo-id {repo.id}</code>
        </div>
      ) : glossary.status === 'UNGLOSSABLE' ? (
        <div className="gd-unglossable">
          <StatusBadge status={glossary.status} />
          <h3>Repository is Unglossable</h3>
          <p>{glossary.unglossableReason || 'No reason provided'}</p>
        </div>
      ) : glossary.status !== 'COMPLETE' ? (
        <div className="gd-pending">
          <StatusBadge status={glossary.status} />
          <p>Glossary extraction is {glossary.status.toLowerCase()}...</p>
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

          {/* Terms */}
          <Section title="Terms" className="gd-terms-section">
            {glossary.terms && glossary.terms.length > 0 ? (
              <div className="gd-terms-grid">
                {glossary.terms.map((term, i) => (
                  <div key={i} className={`gd-term-card gd-term-card--${term.emotionalValence}`}>
                    <div className="gd-term-header">
                      <span className="gd-term-name">{term.term}</span>
                      <span className={`gd-term-valence gd-term-valence--${term.emotionalValence}`}>
                        {term.emotionalValence}
                      </span>
                    </div>
                    <p className="gd-term-definition">{term.definition}</p>
                    {term.context && <p className="gd-term-context">{term.context}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <span className="gd-empty">No terms extracted</span>
            )}
          </Section>

          {/* Philosophy */}
          <Section title="Philosophy">
            <div className="gd-philosophy-grid">
              <div className="gd-subsection">
                <h4>Beliefs</h4>
                <BulletList items={glossary.philosophy?.beliefs || []} />
              </div>
              <div className="gd-subsection">
                <h4>Assumptions</h4>
                <BulletList items={glossary.philosophy?.assumptions || []} />
              </div>
              <div className="gd-subsection">
                <h4>Virtues</h4>
                <TagList items={glossary.philosophy?.virtues || []} variant="positive" />
              </div>
              <div className="gd-subsection gd-subsection--full">
                <h4>Epistemology</h4>
                <TextBlock text={glossary.philosophy?.epistemology} />
              </div>
              <div className="gd-subsection">
                <h4>Ontology</h4>
                <TextBlock text={glossary.philosophy?.ontology} />
              </div>
              <div className="gd-subsection">
                <h4>Teleology</h4>
                <TextBlock text={glossary.philosophy?.teleology} />
              </div>
            </div>
          </Section>

          {/* Psychology */}
          <Section title="Psychology">
            <div className="gd-psychology-grid">
              <div className="gd-subsection">
                <h4>Fears</h4>
                <TagList items={glossary.psychology?.fears || []} variant="negative" />
              </div>
              <div className="gd-subsection">
                <h4>Confidences</h4>
                <TagList items={glossary.psychology?.confidences || []} variant="positive" />
              </div>
              <div className="gd-subsection">
                <h4>Defenses</h4>
                <TagList items={glossary.psychology?.defenses || []} />
              </div>
              <div className="gd-subsection">
                <h4>Attachments</h4>
                <TagList items={glossary.psychology?.attachments || []} variant="sacred" />
              </div>
              <div className="gd-subsection gd-subsection--full">
                <h4>Blind Spots</h4>
                <BulletList items={glossary.psychology?.blindSpots || []} />
              </div>
            </div>
          </Section>

          {/* Resentments */}
          <Section title="Resentments" className="gd-resentments-section">
            <div className="gd-resentments-grid">
              <div className="gd-subsection">
                <h4>Hates</h4>
                <TagList items={glossary.resentments?.hates || []} variant="negative" />
              </div>
              <div className="gd-subsection">
                <h4>Defines Against</h4>
                <TagList items={glossary.resentments?.definesAgainst || []} variant="negative" />
              </div>
              <div className="gd-subsection">
                <h4>Enemies</h4>
                <TagList items={glossary.resentments?.enemies || []} variant="negative" />
              </div>
              <div className="gd-subsection">
                <h4>Allergies</h4>
                <TagList items={glossary.resentments?.allergies || []} variant="profane" />
              </div>
              <div className="gd-subsection gd-subsection--full">
                <h4>Warnings</h4>
                <BulletList items={glossary.resentments?.warnings || []} />
              </div>
            </div>
          </Section>

          {/* Poetics */}
          <Section title="Poetics">
            <div className="gd-poetics-grid">
              <div className="gd-subsection">
                <h4>Metaphors</h4>
                <TagList items={glossary.poetics?.metaphors || []} variant="sacred" />
              </div>
              <div className="gd-subsection">
                <h4>Naming Patterns</h4>
                <TagList items={glossary.poetics?.namingPatterns || []} />
              </div>
              <div className="gd-subsection">
                <h4>Aesthetic</h4>
                <TextBlock text={glossary.poetics?.aesthetic} />
              </div>
              <div className="gd-subsection">
                <h4>Voice</h4>
                <TextBlock text={glossary.poetics?.voice} />
              </div>
              <div className="gd-subsection gd-subsection--full">
                <h4>Rhythm</h4>
                <TextBlock text={glossary.poetics?.rhythm} />
              </div>
            </div>
          </Section>

          {/* Empirics */}
          <Section title="Empirics">
            <div className="gd-empirics-grid">
              <div className="gd-subsection">
                <h4>Measures</h4>
                <TagList items={glossary.empirics?.measures || []} />
              </div>
              <div className="gd-subsection">
                <h4>Evidence Types</h4>
                <TagList items={glossary.empirics?.evidenceTypes || []} />
              </div>
              <div className="gd-subsection">
                <h4>Truth Claims</h4>
                <BulletList items={glossary.empirics?.truthClaims || []} />
              </div>
              <div className="gd-subsection">
                <h4>Uncertainties</h4>
                <BulletList items={glossary.empirics?.uncertainties || []} />
              </div>
            </div>
          </Section>

          {/* Future Vision */}
          {glossary.futureVision && (
            <Section title="Future Vision" className="gd-future-section">
              <div className="gd-future-vision">
                <p>{glossary.futureVision}</p>
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  )
}
