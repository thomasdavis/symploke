import { FeaturedRepos } from '@/components/landing/FeaturedRepos'
import { HeroSection } from '@/components/landing/HeroSection'
import { Header } from '@/components/shared/Header'

const STEPS = [
  { num: 1, title: 'Paste', desc: 'Drop a GitHub repo URL' },
  { num: 2, title: 'Resolve', desc: 'We crawl the full dependency tree' },
  { num: 3, title: 'Build', desc: 'Watch your tower assemble in 3D' },
  { num: 4, title: 'Play', desc: 'Pull blocks and see what breaks' },
]

export default function HomePage() {
  return (
    <>
      <Header />
      <main style={{ flex: 1 }}>
        <HeroSection />

        <section className="jenga-how-it-works">
          <h2>How it works</h2>
          <div className="jenga-steps">
            {STEPS.map((step) => (
              <div key={step.num} className="jenga-step">
                <div className="jenga-step-number">{step.num}</div>
                <div className="jenga-step-title">{step.title}</div>
                <div className="jenga-step-desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <FeaturedRepos />
      </main>

      <footer className="jenga-footer">
        <p>
          Inspired by{' '}
          <a href="https://xkcd.com/2347/" target="_blank" rel="noopener">
            XKCD #2347
          </a>
          . Built by <a href="https://symploke.dev">Symploke</a>.
        </p>
      </footer>
    </>
  )
}
