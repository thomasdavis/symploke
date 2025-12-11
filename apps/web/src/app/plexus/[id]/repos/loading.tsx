import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { Card, CardContent } from '@symploke/ui/Card/Card'
import { SkeletonTable } from '@symploke/ui/Skeleton/Skeleton'

export default function ReposLoading() {
  return (
    <div
      style={{
        padding: 'var(--space-8)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
      }}
    >
      <PageHeader title="Repositories" subtitle="Loading..." />
      <Card>
        <CardContent>
          <SkeletonTable
            rows={8}
            columns={5}
            columnWidths={['1fr', '100px', '100px', '120px', '80px']}
          />
        </CardContent>
      </Card>
    </div>
  )
}
