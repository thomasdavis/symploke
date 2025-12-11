import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { Card, CardContent } from '@symploke/ui/Card/Card'
import { SkeletonTable } from '@symploke/ui/Skeleton/Skeleton'

export default function FilesLoading() {
  return (
    <div
      style={{
        padding: 'var(--space-8)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
      }}
    >
      <PageHeader title="Files" subtitle="Loading..." />
      <Card>
        <CardContent>
          <SkeletonTable rows={10} columns={4} columnWidths={['1fr', '120px', '100px', '100px']} />
        </CardContent>
      </Card>
    </div>
  )
}
