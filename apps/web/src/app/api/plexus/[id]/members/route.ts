import { db } from '@symploke/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'

const addMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']).default('MEMBER'),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - List members
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: plexusId } = await params

    // Check user authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' } },
        { status: 401 },
      )
    }

    // Check user is a member of this plexus
    const currentMember = await db.plexusMember.findUnique({
      where: {
        userId_plexusId: {
          userId: session.user.id,
          plexusId,
        },
      },
    })

    if (!currentMember) {
      return NextResponse.json(
        { error: { code: 'NOT_PLEXUS_MEMBER', message: 'Not a member of this plexus' } },
        { status: 403 },
      )
    }

    const members = await db.plexusMember.findMany({
      where: { plexusId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { role: 'asc' },
    })

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: { code: 'UNKNOWN_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}

// POST - Add member
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: plexusId } = await params

    // Check user authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' } },
        { status: 401 },
      )
    }

    // Check user is a member of this plexus (and has admin/owner role)
    const currentMember = await db.plexusMember.findUnique({
      where: {
        userId_plexusId: {
          userId: session.user.id,
          plexusId,
        },
      },
    })

    if (!currentMember) {
      return NextResponse.json(
        { error: { code: 'NOT_PLEXUS_MEMBER', message: 'Not a member of this plexus' } },
        { status: 403 },
      )
    }

    // Only owners and admins can add members
    if (!['OWNER', 'ADMIN'].includes(currentMember.role)) {
      return NextResponse.json(
        { error: { code: 'NOT_AUTHORIZED', message: 'Only owners and admins can add members' } },
        { status: 403 },
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = addMemberSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: validation.error.message } },
        { status: 400 },
      )
    }

    const { userId, role } = validation.data

    // Check if user exists
    const userToAdd = await db.user.findUnique({
      where: { id: userId },
    })

    if (!userToAdd) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 },
      )
    }

    // Check if already a member
    const existingMember = await db.plexusMember.findUnique({
      where: {
        userId_plexusId: {
          userId,
          plexusId,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: { code: 'ALREADY_MEMBER', message: 'User is already a member' } },
        { status: 409 },
      )
    }

    // Add member
    const member = await db.plexusMember.create({
      data: {
        userId,
        plexusId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    console.error('Error adding member:', error)
    return NextResponse.json(
      { error: { code: 'UNKNOWN_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
