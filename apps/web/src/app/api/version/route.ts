import { NextResponse } from 'next/server'

// Track when this module was loaded (approximates deploy time)
const startedAt = new Date().toISOString()

export async function GET() {
  return NextResponse.json({
    service: 'symploke-web',
    commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || 'unknown',
    branch: process.env.VERCEL_GIT_COMMIT_REF || process.env.GIT_BRANCH || 'unknown',
    commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || 'unknown',
    deployedAt: process.env.VERCEL_ENV ? startedAt : 'local',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    region: process.env.VERCEL_REGION || 'unknown',
    nodeVersion: process.version,
  })
}
