'use client'

import { Html } from '@react-three/drei'
import type { BlockData } from '@/types/tower'

export function BlockLabel({ block }: { block: BlockData }) {
  const { dependency } = block

  return (
    <Html
      center
      distanceFactor={8}
      style={{
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <div
        style={{
          background: 'rgba(0,0,0,0.85)',
          color: '#fff',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: 'var(--font-azeret-mono, monospace)',
          transform: 'translateY(-20px)',
        }}
      >
        <strong>{dependency.name}</strong>
        {dependency.version && (
          <span style={{ opacity: 0.6, marginLeft: 4 }}>v{dependency.version}</span>
        )}
        {block.isXkcdBlock && <span style={{ color: '#ff4444', marginLeft: 4 }}>CRITICAL</span>}
      </div>
    </Html>
  )
}
