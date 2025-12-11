import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@symploke/ui/Card/Card'
import './settings.css'

export default async function SettingsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/')
  }

  // Get user's plexuses
  const userPlexuses = await db.plexusMember.findMany({
    where: { userId: session.user.id },
    include: {
      plexus: {
        include: {
          _count: { select: { repos: true, members: true } },
        },
      },
    },
  })

  return (
    <main className="settings-page">
      <div className="settings-container">
        <PageHeader title="Settings" subtitle="Manage your account and preferences" />

        <div className="settings-content">
          {/* Account Section */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="settings-section">
                <div className="settings-row">
                  <div className="settings-label">Email</div>
                  <div className="settings-value">{session.user.email || 'Not set'}</div>
                </div>
                <div className="settings-row">
                  <div className="settings-label">GitHub Account</div>
                  <div className="settings-value settings-value--connected">
                    <span className="settings-connected-badge">Connected</span>
                    {session.user.name}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plexuses Section */}
          <Card>
            <CardHeader>
              <CardTitle>Your Plexuses</CardTitle>
            </CardHeader>
            <CardContent>
              {userPlexuses.length === 0 ? (
                <p className="settings-empty">You haven't joined any plexuses yet.</p>
              ) : (
                <div className="settings-plexuses">
                  {userPlexuses.map((membership) => (
                    <div key={membership.plexus.id} className="settings-plexus-row">
                      <div className="settings-plexus-info">
                        <span className="settings-plexus-name">{membership.plexus.name}</span>
                        <span className="settings-plexus-stats">
                          {membership.plexus._count.repos} repos &middot;{' '}
                          {membership.plexus._count.members} members
                        </span>
                      </div>
                      <span className="settings-role-badge">{membership.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preferences Section */}
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="settings-section">
                <div className="settings-row">
                  <div className="settings-label">Theme</div>
                  <div className="settings-value settings-value--muted">
                    Use the toggle in the header to switch themes
                  </div>
                </div>
                <div className="settings-row">
                  <div className="settings-label">Notifications</div>
                  <div className="settings-value settings-value--muted">Coming soon</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="settings-danger-card">
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="settings-danger-section">
                <div className="settings-danger-item">
                  <div>
                    <div className="settings-danger-title">Delete Account</div>
                    <div className="settings-danger-description">
                      Permanently delete your account and all associated data. This action cannot be
                      undone.
                    </div>
                  </div>
                  <button type="button" className="settings-danger-button" disabled>
                    Delete Account
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
