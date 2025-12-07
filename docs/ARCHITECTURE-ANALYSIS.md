# Symploke Architecture Analysis: Per-User Data Fetching & Sync Processes

## Executive Summary

The current architecture uses **per-user-account GitHub App installations** to fetch data for a plexus (team). During sync processes (files, embeddings, weaves), the system iterates through plexus members looking for someone who has installed the GitHub App with access to the target repository. **There is no team-level GitHub App installation** - team access is the union of individual member installations.

---

## 1. Current Architecture: Per-User-Account Scripts

### How Plexus Data Is Fetched

When syncing a repository, the system must find a GitHub App installation that has access:

**File: `apps/engine/src/sync/repo-sync.ts` (lines 19-48)**

```typescript
async function findInstallationForRepo(repo: Repo): Promise<number | null> {
  const owner = repo.fullName.split('/')[0]
  if (!owner) return null

  // Find a plexus member who has an installation for this owner
  const plexusMembers = await db.plexusMember.findMany({
    where: { plexusId: repo.plexusId },
    select: { userId: true },
  })

  for (const member of plexusMembers) {
    const installation = await db.gitHubAppInstallation.findFirst({
      where: {
        userId: member.userId,
        accountLogin: {
          equals: owner,
          mode: 'insensitive',
        },
        suspended: false,
      },
    })

    if (installation) {
      return installation.installationId
    }
  }

  return null
}
```

### Key Observations

1. **Sequential Search**: Loops through members one-by-one until finding one with access
2. **First Match Wins**: Returns immediately on first installation found (no load balancing)
3. **No Audit Trail**: Doesn't log which member's installation was used
4. **Fragile Dependencies**: If the member who installed the app leaves or revokes access, sync breaks

---

## 2. THE GAP: No Logic to Fetch All Members of a Team

### What's Missing

The system does **not** fetch team members from GitHub organizations. It only knows about:

1. **Plexus Members** - users who have been manually added to a plexus via `/api/plexus/[id]/members`
2. **GitHub App Installations** - which GitHub orgs/accounts each user has installed the app for

### What It Should Potentially Do

For proper team synchronization, the system could:

1. **Fetch GitHub Organization Members**: When a repo belongs to a GitHub org, fetch all org members
2. **Auto-Invite to Plexus**: Suggest or auto-add GitHub org members to the corresponding plexus
3. **Team-Level Installation**: Allow a GitHub org to install the app once for the whole team (not per-user)

### Current Member Management

**API Route: `apps/web/src/app/api/plexus/[id]/members/route.ts`**

- GET: Returns all `PlexusMember` records for a plexus
- POST: Allows OWNER/ADMIN to add members by email (must be existing user)

**Database Schema:**

```prisma
model PlexusMember {
  userId   String
  plexusId String
  role     String @default("MEMBER")  // OWNER, ADMIN, MEMBER

  user   User   @relation(...)
  plexus Plexus @relation(...)

  @@id([userId, plexusId])
}
```

---

## 3. Sync Processes Overview

### 3.1 File Sync (apps/engine)

**Entry Point**: `apps/engine/src/sync/repo-sync.ts::syncRepo()`

**Flow**:
1. Find member with GitHub App installation for repo owner
2. Fetch repository tree from GitHub API
3. Create `FileSyncJob` for each file
4. Optionally fetch file content (respects `maxContentFiles` limit)
5. Track progress via Pusher real-time updates

**Job States**: `PENDING` → `FETCHING_TREE` → `PROCESSING_FILES` → `COMPLETED/FAILED`

**Per-User Dependency**: Line 84-86 throws error if no member has installation

```typescript
if (!installationId) {
  throw new Error(`No GitHub App installation found for repo ${repo.fullName}`)
}
```

### 3.2 Embedding Process

**Entry Point**: `apps/engine/src/embed/embed-sync.ts::embedRepo()`

**Two-Phase Architecture**:

1. **Chunking Phase** (lines 100-168)
   - Find all files with content (excludes binary/skipped)
   - Create chunks using `chunkContent(file.content, config)`
   - Track `lastChunkedSha` to avoid re-chunking unchanged files

2. **Embedding Phase** (lines 175-255)
   - Batch chunks (50 at a time) with 100ms delay
   - Call `generateEmbeddings()` from AI package
   - Store vectors in PostgreSQL using raw SQL (for vector type)

**Job States**: `PENDING` → `CHUNKING` → `EMBEDDING` → `COMPLETED`

### 3.3 Weave Discovery

**Entry Point**: `apps/engine/src/weave/finder-v2.ts::findWeavesV2()`

**5-Stage Ontology-First Approach**:

1. **Profile Repositories**: Extract README + package.json, LLM profiles each repo
2. **Match Profiles**: Apply ontology rules to find potential connections
3. **Assess Candidates**: LLM evaluates each candidate pair
4. **Create Weaves**: Save validated connections to database
5. **Philosophical Matching**: Extract deeper profiles and find philosophical connections

**Runs at Plexus Level**: `WeaveDiscoveryRun` scoped to `plexusId`

---

## 4. Data Flow Diagrams

### Sync Flow

```
User clicks "Sync Repo"
    │
    ▼
POST /api/plexus/[id]/repos/[repoId]/sync
    │
    ▼
Creates RepoSyncJob (status: PENDING)
    │
    ▼
Queue Processor polls database (apps/engine/src/queue/processor.ts)
    │
    ▼
findInstallationForRepo(repo)
    │
    ├─► db.plexusMember.findMany({ plexusId })
    │       │
    │       ▼
    │   for each member:
    │       db.gitHubAppInstallation.findFirst({ userId: member.userId, accountLogin: owner })
    │       │
    │       ▼
    │   RETURNS first installationId found (or null → ERROR)
    │
    ▼
fetchRepoTree() via GitHub API using member's installation
    │
    ▼
Create FileSyncJob for each file
    │
    ▼
syncFile() for each file (optionally fetch content)
    │
    ▼
Update RepoSyncJob → COMPLETED
```

### Access Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                           PLEXUS (Team)                             │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Member A │  │ Member B │  │ Member C │  │ Member D │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       │             │             │             │                   │
│       ▼             ▼             ▼             ▼                   │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   (no app)                │
│  │ GitHub  │   │ GitHub  │   │ GitHub  │                           │
│  │ App for │   │ App for │   │ App for │                           │
│  │ acme-co │   │ widgets │   │ acme-co │                           │
│  └─────────┘   └─────────┘   └─────────┘                           │
│                                                                     │
│  Team's access = Union of all member installations                  │
│  Sync tries members sequentially until one works                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Identified Gaps & Issues

### Gap 1: No Team-Level GitHub App Installation

**Issue**: System relies entirely on individual member installations

**Consequence**: If the member who installed the GitHub App leaves the plexus or revokes access, the team loses access to repositories they synced via that member's installation

**Evidence**: `repo-sync.ts` lines 19-48 search through member installations

**Recommendation**: Implement org-level or team-owned GitHub App installation that persists independently of individual members

---

### Gap 2: Installation Discovery is Sequential & Single-Match

**Issue**: Loop stops at first member with access (line 42-44)

```typescript
if (installation) {
  return installation.installationId  // ← Returns immediately
}
```

**Consequences**:
- No load balancing across members with same org access
- No failover if first member's rate limit is hit
- No preference for "best" installation (e.g., one with higher rate limit remaining)

---

### Gap 3: No Audit Trail for Data Access

**Issue**: Sync jobs don't log which member's installation was used

**Missing**: Security/compliance logging for "who's credentials accessed what"

**Location**: `repo-sync.ts` logs `installationId` but not the corresponding `userId`

---

### Gap 4: No Auto-Discovery of GitHub Team Members

**Issue**: Must manually add plexus members; no integration with GitHub org membership

**Missing**:
- Endpoint to fetch GitHub org members
- Logic to suggest/auto-add org members to plexus
- Sync between GitHub org and plexus membership

---

### Gap 5: Rate Limiting Not Member-Aware

**Model**: `GitHubRateLimit` keyed by `installationId` only

**Missing**: No distribution of requests across multiple member installations that have access to the same org

---

### Gap 6: Opaque Installation Dependency in UI

**Issue**: When sync fails due to "no installation found", UI doesn't indicate:
- Which org/owner needs installation
- Which members could install it
- How to resolve the issue

**Evidence**: Generic error message at `repo-sync.ts` line 84

---

## 6. Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Plexus API | `apps/web/src/app/api/plexus/route.ts` |
| Members API | `apps/web/src/app/api/plexus/[id]/members/route.ts` |
| Repos API | `apps/web/src/app/api/plexus/[id]/repositories/route.ts` |
| Sync Trigger API | `apps/web/src/app/api/plexus/[id]/repositories/[repoId]/sync/route.ts` |
| Embed Trigger API | `apps/web/src/app/api/plexus/[id]/repositories/[repoId]/embed/route.ts` |
| **Sync Engine** | `apps/engine/src/sync/repo-sync.ts` |
| **Embed Engine** | `apps/engine/src/embed/embed-sync.ts` |
| Queue Processor | `apps/engine/src/queue/processor.ts` |
| Weave Discovery | `apps/engine/src/weave/finder-v2.ts` |
| Engine CLI | `apps/engine/src/cli/index.ts` |
| Database Schema | `packages/db/prisma/schema.prisma` |

---

## 7. Database Models

### Core Plexus Models

```prisma
model Plexus {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique

  members       PlexusMember[]
  repos         Repo[]
  weaves        Weave[]
  discoveryRuns WeaveDiscoveryRun[]
}

model PlexusMember {
  userId   String
  plexusId String
  role     String @default("MEMBER")  // OWNER, ADMIN, MEMBER

  @@id([userId, plexusId])
}
```

### GitHub Installation (Per User)

```prisma
model GitHubAppInstallation {
  id              String   @id @default(cuid())
  installationId  Int      @unique
  userId          String
  accountLogin    String   // GitHub org/user name
  accountType     String   // "Organization" or "User"
  suspended       Boolean  @default(false)

  // No plexusId - installations belong to users, not teams
}
```

### Sync Jobs

```prisma
model RepoSyncJob {
  id       String @id @default(cuid())
  repoId   String
  status   String @default("PENDING")
  // PENDING → FETCHING_TREE → PROCESSING_FILES → COMPLETED/FAILED
}

model ChunkSyncJob {
  id       String @id @default(cuid())
  repoId   String
  status   String @default("PENDING")
  // PENDING → CHUNKING → EMBEDDING → COMPLETED
}
```

---

## 8. Potential Solutions to Explore

### Solution A: Team-Owned GitHub App Installation

Store `plexusId` on `GitHubAppInstallation` to create team-owned installations:

```prisma
model GitHubAppInstallation {
  // ... existing fields
  plexusId String?  // NEW: Optional team ownership

  plexus Plexus? @relation(fields: [plexusId], references: [id])
}
```

Sync would prioritize plexus-owned installations over member installations.

### Solution B: GitHub Org Member Sync

Add endpoint to fetch org members and sync with plexus:

```typescript
// Pseudocode for new endpoint
POST /api/plexus/[id]/sync-org-members
{
  org: "acme-corp",
  autoInvite: true,  // or just "suggest"
}
```

### Solution C: Installation Load Balancing

Modify `findInstallationForRepo` to:
1. Find ALL members with valid installations
2. Select one based on rate limit remaining
3. Log which member's installation was used

### Solution D: Improved Error UX

When no installation found, return structured error:

```typescript
throw new InstallationRequiredError({
  owner: "acme-corp",
  plexusId: repo.plexusId,
  suggestedAction: "Ask a team member to install GitHub App for acme-corp",
})
```

---

## 9. Summary

The current system is **functional but fragile**:

- ✅ Works when at least one member has the right GitHub App installation
- ⚠️ No team-level installation ownership
- ⚠️ Relies on first-match sequential search through members
- ❌ No automatic sync of GitHub org members to plexus
- ❌ No audit trail of which member's credentials were used
- ❌ Poor error messaging when no installation is available

The core architectural decision is whether to:
1. Keep per-user installations but make them more robust (load balancing, failover, audit)
2. Introduce team-owned installations that persist independently of members
3. Both

---

*Document generated: 2024-12-07*
*For ChatGPT/other LLMs: This document describes the Symploke codebase architecture for plexus data fetching and sync processes. The key insight is that GitHub API access is obtained through individual user installations, not team-level installations, creating fragility when members leave.*
