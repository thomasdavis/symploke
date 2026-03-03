'use client'

import Link from 'next/link'

const FEATURED = [
  { owner: 'facebook', repo: 'react', icon: '\u269B\uFE0F', desc: 'UI library' },
  { owner: 'vercel', repo: 'next.js', icon: '\u25B2', desc: 'React framework' },
  { owner: 'expressjs', repo: 'express', icon: '\u26A1', desc: 'Web framework' },
  { owner: 'prisma', repo: 'prisma', icon: '\u25C6', desc: 'ORM' },
  { owner: 'fastify', repo: 'fastify', icon: '\u{1F680}', desc: 'Fast web framework' },
  { owner: 'lodash', repo: 'lodash', icon: '\u{1F9F0}', desc: 'Utility library' },
]

export function FeaturedRepos() {
  return (
    <section className="jenga-featured">
      <h2>Try a popular repo</h2>
      <div className="jenga-featured-grid">
        {FEATURED.map((r) => (
          <Link
            key={`${r.owner}/${r.repo}`}
            href={`/play/${r.owner}/${r.repo}`}
            className="jenga-featured-card"
          >
            <span className="jenga-featured-icon">{r.icon}</span>
            <div>
              <div className="jenga-featured-name">
                {r.owner}/{r.repo}
              </div>
              <div className="jenga-featured-desc">{r.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
