import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@symploke/db'
import { Card, CardContent } from '@symploke/ui/Card/Card'
import './profile.css'

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/')
  }

  // Get user's data including subscription status
  const [user, userPlexuses] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionStatus: true },
    }),
    db.plexusMember.findMany({
      where: { userId: session.user.id },
      include: {
        plexus: {
          include: {
            _count: { select: { repos: true, weaves: true } },
          },
        },
      },
    }),
  ])

  const isGoldMember = user?.subscriptionStatus === 'active'

  // Get recent activity
  const recentWeaves = await db.weave.findMany({
    where: {
      plexus: {
        members: {
          some: { userId: session.user.id },
        },
      },
    },
    include: {
      sourceRepo: { select: { name: true } },
      targetRepo: { select: { name: true } },
      plexus: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const totalRepos = userPlexuses.reduce((sum, m) => sum + m.plexus._count.repos, 0)
  const totalWeaves = userPlexuses.reduce((sum, m) => sum + m.plexus._count.weaves, 0)

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  }

  return (
    <main className="profile-page">
      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar-wrapper">
            {session.user.image && (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className={`profile-avatar ${isGoldMember ? 'profile-avatar--gold' : ''}`}
              />
            )}
            {isGoldMember && (
              <span className="profile-gold-badge" title="Gold Member">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="20"
                  height="20"
                  aria-hidden="true"
                >
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
              </span>
            )}
          </div>
          <div className="profile-info">
            <div className="profile-name-row">
              <h1 className="profile-name">{session.user.name}</h1>
              {isGoldMember && <span className="profile-gold-text">Gold Member</span>}
            </div>
            <p className="profile-email">{session.user.email}</p>
            <p className="profile-joined">Symploke member</p>
          </div>
        </div>

        {/* Stats */}
        <div className="profile-stats">
          <div className="profile-stat">
            <span className="profile-stat-value">{userPlexuses.length}</span>
            <span className="profile-stat-label">Plexuses</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{totalRepos}</span>
            <span className="profile-stat-label">Repositories</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{totalWeaves}</span>
            <span className="profile-stat-label">Weaves Discovered</span>
          </div>
        </div>

        <div className="profile-content">
          {/* Plexuses */}
          <Card>
            <CardContent>
              <h2 className="profile-section-title">Your Plexuses</h2>
              {userPlexuses.length === 0 ? (
                <p className="profile-empty">
                  You haven't joined any plexuses yet.{' '}
                  <Link href="/plexus/create" className="profile-link">
                    Create one
                  </Link>
                </p>
              ) : (
                <div className="profile-plexuses">
                  {userPlexuses.map((membership) => (
                    <Link
                      key={membership.plexus.id}
                      href={`/plexus/${membership.plexus.id}/weaves`}
                      className="profile-plexus-card"
                    >
                      <div className="profile-plexus-header">
                        <span className="profile-plexus-name">{membership.plexus.name}</span>
                        <span className="profile-plexus-role">{membership.role}</span>
                      </div>
                      <div className="profile-plexus-stats">
                        <span>{membership.plexus._count.repos} repos</span>
                        <span>{membership.plexus._count.weaves} weaves</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardContent>
              <h2 className="profile-section-title">Recent Weaves</h2>
              {recentWeaves.length === 0 ? (
                <p className="profile-empty">No weaves discovered yet.</p>
              ) : (
                <div className="profile-activity">
                  {recentWeaves.map((weave) => (
                    <Link
                      key={weave.id}
                      href={`/plexus/${weave.plexusId}/weaves/${weave.id}`}
                      className="profile-activity-item"
                    >
                      <div className="profile-activity-content">
                        <span className="profile-activity-title">{weave.title}</span>
                        <span className="profile-activity-repos">
                          {weave.sourceRepo.name} ↔ {weave.targetRepo.name}
                        </span>
                      </div>
                      <div className="profile-activity-meta">
                        <span className="profile-activity-plexus">{weave.plexus.name}</span>
                        <span className="profile-activity-date">{formatDate(weave.createdAt)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
