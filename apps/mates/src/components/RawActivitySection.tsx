'use client'

import { Card } from '@symploke/ui/Card/Card'
import { Collapsible } from '@symploke/ui/Collapsible/Collapsible'
import { useState } from 'react'

interface CrawledRepo {
  owner: string
  name: string
  fullName: string
  description: string | null
  topics: string[]
  language: string | null
  stars: number
  readme: string | null
  commits: Array<{ message: string; date: string }>
  pullRequests: Array<{ title: string; body: string | null; state: string }>
  issues: Array<{ title: string; body: string | null; state: string }>
}

interface RawActivity {
  user: {
    login: string
    id: number
    avatarUrl: string
    bio: string | null
    company: string | null
    location: string | null
    blog: string | null
    name: string | null
  }
  repos: CrawledRepo[]
  eventCount: number
}

export function RawActivitySection({ rawActivity }: { rawActivity: RawActivity }) {
  const { repos, eventCount } = rawActivity
  const totalCommits = repos.reduce((sum, r) => sum + r.commits.length, 0)
  const totalPRs = repos.reduce((sum, r) => sum + r.pullRequests.length, 0)
  const totalIssues = repos.reduce((sum, r) => sum + r.issues.length, 0)
  const languages = [...new Set(repos.map((r) => r.language).filter(Boolean))]

  return (
    <div className="mates-raw-section">
      <h2 className="mates-section-heading">Raw Activity Data</h2>
      <p className="mates-section-subtext">The public GitHub data used to generate this profile</p>

      {/* Summary stats */}
      <div className="mates-raw-stats">
        <div className="mates-raw-stat">
          <span className="mates-raw-stat-value">{repos.length}</span>
          <span className="mates-raw-stat-label">Repos</span>
        </div>
        <div className="mates-raw-stat">
          <span className="mates-raw-stat-value">{totalCommits}</span>
          <span className="mates-raw-stat-label">Commits</span>
        </div>
        <div className="mates-raw-stat">
          <span className="mates-raw-stat-value">{totalPRs}</span>
          <span className="mates-raw-stat-label">PRs</span>
        </div>
        <div className="mates-raw-stat">
          <span className="mates-raw-stat-value">{totalIssues}</span>
          <span className="mates-raw-stat-label">Issues</span>
        </div>
        <div className="mates-raw-stat">
          <span className="mates-raw-stat-value">{eventCount}</span>
          <span className="mates-raw-stat-label">Events</span>
        </div>
      </div>

      {/* Languages */}
      {languages.length > 0 && (
        <div className="mates-raw-languages">
          {languages.map((lang) => (
            <span key={lang} className="mates-raw-lang">
              {lang}
            </span>
          ))}
        </div>
      )}

      {/* Repos */}
      <div className="mates-raw-repos">
        {repos.map((repo) => (
          <RepoCard key={repo.fullName} repo={repo} />
        ))}
      </div>
    </div>
  )
}

function RepoCard({ repo }: { repo: CrawledRepo }) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Card className="mates-raw-repo">
        <Collapsible.Trigger className="mates-raw-repo-trigger">
          <div className="mates-raw-repo-header">
            <div className="mates-raw-repo-title">
              <a
                href={`https://github.com/${repo.fullName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mates-raw-repo-name"
                onClick={(e) => e.stopPropagation()}
              >
                {repo.fullName}
              </a>
              <div className="mates-raw-repo-meta">
                {repo.language && <span className="mates-raw-lang-dot">{repo.language}</span>}
                {repo.stars > 0 && (
                  <span className="mates-raw-stars">{repo.stars.toLocaleString()}</span>
                )}
              </div>
            </div>
            <div className="mates-raw-repo-counts">
              {repo.commits.length > 0 && (
                <span className="mates-raw-count">{repo.commits.length} commits</span>
              )}
              {repo.pullRequests.length > 0 && (
                <span className="mates-raw-count">{repo.pullRequests.length} PRs</span>
              )}
              {repo.issues.length > 0 && (
                <span className="mates-raw-count">{repo.issues.length} issues</span>
              )}
            </div>
            <span className={`mates-raw-chevron ${open ? 'mates-raw-chevron--open' : ''}`}>
              &#9662;
            </span>
          </div>
          {repo.description && <p className="mates-raw-repo-desc">{repo.description}</p>}
        </Collapsible.Trigger>
        <Collapsible.Panel>
          <div className="mates-raw-repo-details">
            {/* Topics */}
            {repo.topics.length > 0 && (
              <div className="mates-raw-topics">
                {repo.topics.map((t) => (
                  <span key={t} className="mates-raw-topic">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Commits */}
            {repo.commits.length > 0 && (
              <div className="mates-raw-detail-group">
                <h4 className="mates-raw-detail-heading">Recent Commits</h4>
                <ul className="mates-raw-detail-list">
                  {repo.commits.map((c, i) => (
                    <li key={i} className="mates-raw-commit">
                      <span className="mates-raw-commit-msg">
                        {(c.message ?? '').split('\n')[0]}
                      </span>
                      <span className="mates-raw-commit-date">
                        {new Date(c.date).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* PRs */}
            {repo.pullRequests.length > 0 && (
              <div className="mates-raw-detail-group">
                <h4 className="mates-raw-detail-heading">Pull Requests</h4>
                <ul className="mates-raw-detail-list">
                  {repo.pullRequests.map((pr, i) => (
                    <li key={i} className="mates-raw-pr">
                      <span className={`mates-raw-pr-state mates-raw-pr-state--${pr.state}`}>
                        {pr.state}
                      </span>
                      <span className="mates-raw-pr-title">{pr.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Issues */}
            {repo.issues.length > 0 && (
              <div className="mates-raw-detail-group">
                <h4 className="mates-raw-detail-heading">Issues</h4>
                <ul className="mates-raw-detail-list">
                  {repo.issues.map((issue, i) => (
                    <li key={i} className="mates-raw-pr">
                      <span className={`mates-raw-pr-state mates-raw-pr-state--${issue.state}`}>
                        {issue.state}
                      </span>
                      <span className="mates-raw-pr-title">{issue.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Collapsible.Panel>
      </Card>
    </Collapsible.Root>
  )
}
