# GitHub App Installation Issue

## Problem Statement

User clicks "thomasdavis" organization in the UI, clicks "Install GitHub App", completes installation on GitHub for thomasdavis account, but after redirect the system still shows "Install GitHub App" button and returns `NO_INSTALLATION` error when trying to fetch repositories.

## What We Know (Facts Only)

### Server Logs from Installation Callback

```
[GitHub App Callback] {
  installationId: '98030096',
  setupAction: 'install',
  stateParam: '{"org":"thomasdavis","plexusId":"cmirxwt6v00002uc8xx9yi6n4"}'
}
[GitHub App Callback] Installation details: {
  id: 98030096,
  account: 'symplokeai',  // <-- This is the issue
  accountType: 'Organization'
}
[GitHub App Callback] Installation saved to database
```

**Key Facts:**
- User selected `thomasdavis` (confirmed in state parameter)
- GitHub's API returned installation details showing account is `symplokeai`
- Installation ID: `98030096`
- The callback saved this to database with `accountLogin: 'symplokeai'`

### Subsequent Repository Fetch Request

```
[DEBUG] Session state: {
  hasSession: true,
  hasUser: true,
  userId: 'cmirxr8uc00002uafs3j4gg3z',
  userEmail: 'thomasalwyndavis@gmail.com',
  hasAccessToken: true
}
GET /api/github/repositories?org=thomasdavis&plexusId=cmirxwt6v00002uc8xx9yi6n4 404
Response: {
  code: "NO_INSTALLATION",
  message: "GitHub App not installed for thomasdavis. Please install the app first."
}
```

**Key Facts:**
- Request is looking for installation with `accountLogin: 'thomasdavis'`
- Database has installation with `accountLogin: 'symplokeai'`
- Database query returns no match → `NO_INSTALLATION` error

## Code Structure

### Callback Route: `/apps/web/src/app/api/github/app-callback/route.ts`

Fetches installation details from GitHub:

```typescript
const app = getGitHubApp()
const { data: installation } = await app.octokit.request(
  'GET /app/installations/{installation_id}',
  {
    installation_id: parseInt(installationId, 10),
  },
)

console.log('[GitHub App Callback] Installation details:', {
  id: installation.id,
  account: installation.account?.login,  // This returned 'symplokeai'
  accountType: installation.account?.type,
})

await db.gitHubAppInstallation.upsert({
  where: {
    installationId: installation.id,
  },
  update: { ... },
  create: {
    installationId: installation.id,
    userId: session.user.id,
    accountLogin: installation.account?.login || '',  // Saved as 'symplokeai'
    accountType: installation.account?.type || '',
    accountId: installation.account?.id || 0,
    suspended: installation.suspended_at !== null,
  },
})
```

### Repository Fetch Route: `/apps/web/src/app/api/github/repositories/route.ts`

Looks up installation in database:

```typescript
const org = searchParams.get('org')  // 'thomasdavis'

const installation = await db.gitHubAppInstallation.findFirst({
  where: {
    userId: session.user.id,
    accountLogin: org,  // Looking for accountLogin: 'thomasdavis'
  },
})

if (!installation) {
  return NextResponse.json(
    {
      error: {
        code: 'NO_INSTALLATION',
        message: `GitHub App not installed for ${org}. Please install the app first.`,
      },
    },
    { status: 404 },
  )
}
```

### Database Schema

```prisma
model GitHubAppInstallation {
  installationId Int      @id
  userId         String
  accountLogin   String  // This is what we query by
  accountType    String
  accountId      Int
  suspended      Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@map("github_app_installations")
}
```

## Questions for Investigation

1. **Why did GitHub's installation API return `account: 'symplokeai'` when user installed on thomasdavis?**
   - Was the app actually installed on symplokeai org instead?
   - Is there a GitHub App setting that affects this?
   - Is the installation_id from the callback URL associated with the wrong account?

2. **What account(s) actually have the GitHub App installed?**
   - Need to check: https://github.com/settings/installations
   - Look for "SymplokeAI" app

3. **Is there a mismatch between personal accounts and organizations in GitHub's API?**
   - The user's personal account is "thomasdavis" (type: User)
   - There's an organization "symplokeai" (type: Organization)
   - Could the installation be getting associated with the wrong account?

4. **Should we be querying by something other than `accountLogin`?**
   - Maybe we should query by `installationId` instead?
   - Or store multiple mappings?

## GitHub App Configuration

- App Slug: `symplokeai`
- Callback URLs configured:
  - `http://localhost:3000/api/github/app-callback`
  - `https://symploke.dev/api/github/app-callback`
- "Request user authorization (OAuth) during installation" is checked
- Installation URL: `https://github.com/apps/symplokeai/installations/new`

## Environment

- Next.js 16.0.7 (Turbopack)
- NextAuth v5 with JWT session strategy
- Prisma ORM with PostgreSQL (Neon)
- @octokit/app for GitHub App authentication

## Current Database State

Unknown - need to query `GitHubAppInstallation` table to see what's actually saved.

## Possible Solutions to Investigate

1. Check what GitHub installations actually exist for the user
2. Query the GitHub API directly with the installation_id to see what account it belongs to
3. Consider if we should match installations differently (by installation_id + user_id instead of accountLogin + user_id)
4. Check if there's a GitHub App permission or setting that needs to be configured
5. Verify the installation flow is working correctly by testing with a fresh installation
