import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { Skeleton, SkeletonSlider, SkeletonGraph } from '@symploke/ui/Skeleton/Skeleton'
import './weaves.css'

export default function WeavesLoading() {
  return (
    <div className="weaves-page">
      <div className="weaves-header">
        <PageHeader title="Weaves" subtitle="Loading..." />
      </div>

      {/* Tabs and Run Selector Row */}
      <div className="weaves-tabs-row">
        <div className="weaves-tabs">
          <Skeleton className="weaves-tab" width={70} height={36} />
          <Skeleton className="weaves-tab" width={70} height={36} />
          <Skeleton className="weaves-tab" width={70} height={36} />
        </div>
        <div className="weaves-run-selector">
          <Skeleton width={200} height={36} style={{ borderRadius: 'var(--radius-md)' }} />
        </div>
      </div>

      {/* Score filter bar skeleton */}
      <div className="score-filter">
        <SkeletonSlider />
        <Skeleton width={80} height={16} />
      </div>

      {/* Graph area skeleton */}
      <div className="weaves-graph-container">
        <SkeletonGraph style={{ flex: 1 }} />
      </div>
    </div>
  )
}
