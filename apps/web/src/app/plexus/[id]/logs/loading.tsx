import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { Card, CardContent } from '@symploke/ui/Card/Card'
import { Skeleton } from '@symploke/ui/Skeleton/Skeleton'

export default function LogsLoading() {
  return (
    <div
      style={{
        padding: 'var(--space-8)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
      }}
    >
      <PageHeader title="Logs" subtitle="Loading..." />
      <Card>
        <CardContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <Skeleton height={20} width="90%" />
            <Skeleton height={20} width="75%" />
            <Skeleton height={20} width="85%" />
            <Skeleton height={20} width="60%" />
            <Skeleton height={20} width="80%" />
            <Skeleton height={20} width="70%" />
            <Skeleton height={20} width="95%" />
            <Skeleton height={20} width="65%" />
            <Skeleton height={20} width="88%" />
            <Skeleton height={20} width="72%" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
