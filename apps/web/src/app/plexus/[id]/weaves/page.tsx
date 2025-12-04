import Image from 'next/image'

export default function WeavesPage() {
  return (
    <div style={{ padding: 'var(--space-8)' }}>
      <h1>Weaves</h1>
      <div style={{ marginTop: 'var(--space-4)' }}>
        <Image
          src="/demon.png"
          alt="Demon"
          width={400}
          height={400}
          style={{ borderRadius: 'var(--radius-lg)' }}
        />
      </div>
    </div>
  )
}
