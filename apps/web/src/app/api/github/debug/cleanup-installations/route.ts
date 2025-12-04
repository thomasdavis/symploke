import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@symploke/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get all installations for this user
    const installations = await db.gitHubAppInstallation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      count: installations.length,
      installations: installations.map((i: any) => ({
        installationId: i.installationId,
        accountLogin: i.accountLogin,
        accountType: i.accountType,
        createdAt: i.createdAt,
      })),
    })
  } catch (error) {
    console.error('Error fetching installations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Delete all installations for this user
    const result = await db.gitHubAppInstallation.deleteMany({
      where: { userId: session.user.id },
    })

    return NextResponse.json({
      message: 'All installations deleted',
      count: result.count,
    })
  } catch (error) {
    console.error('Error deleting installations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
