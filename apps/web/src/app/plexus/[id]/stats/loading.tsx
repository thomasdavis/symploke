import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@symploke/ui/Card/Card'
import {
  SkeletonTabs,
  SkeletonSlider,
  SkeletonMetric,
  SkeletonTable,
  SkeletonTypeRow,
} from '@symploke/ui/Skeleton/Skeleton'
import './stats.css'

export default function StatsLoading() {
  return (
    <div className="stats-page">
      <PageHeader title="Stats" subtitle="Leaderboard and analytics for weave discovery" />

      {/* Toolbar: Tabs + Score Filter */}
      <div className="stats-toolbar">
        <SkeletonTabs count={2} />
        <SkeletonSlider />
      </div>

      {/* Overview Cards */}
      <div className="stats-overview">
        <Card>
          <CardContent>
            <SkeletonMetric />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <SkeletonMetric />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <SkeletonMetric />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <SkeletonMetric />
          </CardContent>
        </Card>
      </div>

      {/* Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Weaves by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="stats-types">
            <SkeletonTypeRow />
            <SkeletonTypeRow />
            <SkeletonTypeRow />
            <SkeletonTypeRow />
            <SkeletonTypeRow />
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Repository Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonTable
            rows={8}
            columns={5}
            columnWidths={['60px', '1fr', '80px', '80px', '200px']}
          />
        </CardContent>
      </Card>
    </div>
  )
}
