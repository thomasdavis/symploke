'use client'

import { RepoInput } from './RepoInput'

export function HeroSection() {
  return (
    <section className="jenga-hero">
      <div className="jenga-illustration">
        <svg
          viewBox="0 0 200 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Wobbly dependency tower illustration"
        >
          <title>Wobbly dependency tower</title>
          {/* XKCD-style wobbly dependency tower */}
          {/* Base platform */}
          <rect x="30" y="250" width="140" height="8" rx="2" fill="var(--color-border)" />

          {/* Bottom level - 3 blocks horizontal */}
          <rect
            x="35"
            y="230"
            width="38"
            height="18"
            rx="2"
            fill="var(--color-primary)"
            opacity="0.9"
            transform="rotate(-0.5 54 239)"
          />
          <rect
            x="78"
            y="230"
            width="44"
            height="18"
            rx="2"
            fill="#4488dd"
            opacity="0.8"
            transform="rotate(0.3 100 239)"
          />
          <rect
            x="127"
            y="231"
            width="38"
            height="18"
            rx="2"
            fill="#44bb66"
            opacity="0.8"
            transform="rotate(0.8 146 240)"
          />

          {/* Level 2 - rotated blocks */}
          <rect
            x="60"
            y="210"
            width="18"
            height="38"
            rx="2"
            fill="#dd8833"
            opacity="0.8"
            transform="rotate(-1 69 229)"
          />
          <rect
            x="88"
            y="209"
            width="18"
            height="44"
            rx="2"
            fill="#9955cc"
            opacity="0.8"
            transform="rotate(0.5 97 231)"
          />
          <rect
            x="118"
            y="210"
            width="18"
            height="38"
            rx="2"
            fill="#cc55aa"
            opacity="0.8"
            transform="rotate(1.2 127 229)"
          />

          {/* Level 3 */}
          <rect
            x="42"
            y="190"
            width="35"
            height="18"
            rx="2"
            fill="#44aabb"
            opacity="0.8"
            transform="rotate(-0.8 59 199)"
          />
          <rect
            x="82"
            y="189"
            width="40"
            height="18"
            rx="2"
            fill="#ccaa33"
            opacity="0.8"
            transform="rotate(0.6 102 198)"
          />
          <rect
            x="127"
            y="190"
            width="30"
            height="18"
            rx="2"
            fill="#dd4444"
            opacity="0.8"
            transform="rotate(1.5 142 199)"
          />

          {/* Level 4 */}
          <rect
            x="62"
            y="170"
            width="18"
            height="35"
            rx="2"
            fill="#44aa99"
            opacity="0.7"
            transform="rotate(-1.5 71 187)"
          />
          <rect
            x="90"
            y="169"
            width="18"
            height="40"
            rx="2"
            fill="#4488dd"
            opacity="0.7"
            transform="rotate(0.8 99 189)"
          />
          <rect
            x="120"
            y="170"
            width="18"
            height="30"
            rx="2"
            fill="var(--color-primary)"
            opacity="0.7"
            transform="rotate(2 129 185)"
          />

          {/* Level 5 - getting wobbly */}
          <rect
            x="48"
            y="150"
            width="32"
            height="18"
            rx="2"
            fill="#44bb66"
            opacity="0.7"
            transform="rotate(-2 64 159)"
          />
          <rect
            x="85"
            y="148"
            width="38"
            height="18"
            rx="2"
            fill="#dd8833"
            opacity="0.7"
            transform="rotate(1.2 104 157)"
          />
          <rect
            x="128"
            y="150"
            width="28"
            height="18"
            rx="2"
            fill="#9955cc"
            opacity="0.7"
            transform="rotate(2.5 142 159)"
          />

          {/* Level 6 */}
          <rect
            x="65"
            y="130"
            width="18"
            height="32"
            rx="2"
            fill="#cc55aa"
            opacity="0.6"
            transform="rotate(-2.5 74 146)"
          />
          <rect
            x="92"
            y="128"
            width="18"
            height="38"
            rx="2"
            fill="#44aabb"
            opacity="0.6"
            transform="rotate(1.5 101 147)"
          />
          <rect
            x="122"
            y="130"
            width="18"
            height="28"
            rx="2"
            fill="#ccaa33"
            opacity="0.6"
            transform="rotate(3 131 144)"
          />

          {/* Top wobbly levels */}
          <rect
            x="58"
            y="110"
            width="28"
            height="16"
            rx="2"
            fill="#dd4444"
            opacity="0.6"
            transform="rotate(-3 72 118)"
          />
          <rect
            x="90"
            y="108"
            width="34"
            height="16"
            rx="2"
            fill="#44aa99"
            opacity="0.6"
            transform="rotate(2 107 116)"
          />
          <rect
            x="128"
            y="110"
            width="24"
            height="16"
            rx="2"
            fill="#4488dd"
            opacity="0.6"
            transform="rotate(3.5 140 118)"
          />

          {/* Tiny critical block at the very bottom-center with arrow */}
          <rect
            x="90"
            y="245"
            width="20"
            height="6"
            rx="1"
            fill="var(--color-primary)"
            stroke="var(--color-foreground)"
            strokeWidth="0.5"
          />

          {/* Arrow pointing to tiny block */}
          <line
            x1="140"
            y1="265"
            x2="112"
            y2="250"
            stroke="var(--color-muted)"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <text
            x="142"
            y="270"
            fill="var(--color-muted)"
            fontSize="7"
            fontFamily="var(--font-azeret-mono), monospace"
          >
            maintained by
          </text>
          <text
            x="142"
            y="278"
            fill="var(--color-muted)"
            fontSize="7"
            fontFamily="var(--font-azeret-mono), monospace"
          >
            one person in NE
          </text>
        </svg>
      </div>

      <h1>
        Your dependencies,
        <br />
        as a <em>Jenga tower</em>
      </h1>

      <p className="jenga-hero-subtitle">
        Paste a GitHub repo URL and watch its dependency tree become a playable 3D tower. Pull
        blocks to see what breaks. How fragile is your stack?
      </p>

      <p className="jenga-hero-xkcd">Inspired by XKCD #2347</p>

      <RepoInput />
    </section>
  )
}
