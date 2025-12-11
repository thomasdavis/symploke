import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { Card, CardContent } from '@symploke/ui/Card/Card'
import { SkeletonTable } from '@symploke/ui/Skeleton/Skeleton'

export default function MembersLoading() {
  return (
    <div
      style={{
        padding: 'var(--space-8)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
      }}
    >
      <PageHeader title="Members" subtitle="Loading..." />
      <Card>
        <CardContent>
          <SkeletonTable rows={5} columns={4} columnWidths={['1fr', '150px', '100px', '80px']} />
        </CardContent>
      </Card>
    </div>
  )
}
