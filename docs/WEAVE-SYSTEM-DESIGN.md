# Symploke Weave System - Comprehensive Design Document

## Table of Contents

1. [Overview](#overview)
2. [Symploke Terminology](#symploke-terminology)
3. [System Architecture](#system-architecture)
4. [Complete Database Schema](#complete-database-schema)
5. [File Sync Pipeline](#file-sync-pipeline)
6. [Chunking System](#chunking-system)
7. [Embedding System](#embedding-system)
8. [Vector Storage & Similarity Search](#vector-storage--similarity-search)
9. [Weave Discovery System](#weave-discovery-system)
10. [Current Data Stats](#current-data-stats)
11. [Implementation Plan](#implementation-plan)
12. [Questions for Input](#questions-for-input)

---

## Overview

**Symploke** is a platform that helps engineering teams discover connections between their repositories. When multiple teams or projects in an organization build similar functionality independently, Symploke identifies these overlaps and surfaces them as "Weaves" - opportunities for collaboration, code sharing, or consolidation.

### The Core Problem

Large organizations often have:
- Multiple teams building similar utilities independently
- Duplicated authentication, logging, or API patterns across repos
- Opportunities for shared libraries that go unnoticed
- Integration possibilities between services
- Refactoring candidates where code evolved similarly

### The Solution

Symploke:
1. **Syncs** repository content from GitHub
2. **Chunks** files into semantic pieces
3. **Embeds** chunks using OpenAI's text-embedding-3-large model
4. **Discovers** connections between repos using vector similarity
5. **Presents** these "Weaves" to teams for action

---

## Symploke Terminology

| Term | Definition |
|------|------------|
| **Plexus** | A team workspace containing multiple repositories. Like a GitHub org but focused on discovering inter-repo connections. |
| **Weave** | A discovered connection between two repositories - could be similar code, shared patterns, integration opportunities, etc. |
| **Chunk** | A portion of a file (1500 chars by default) that gets embedded for semantic search. |
| **Embedding** | A 3072-dimension vector representation of a chunk's semantic meaning. |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYMPLOKE ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   Next.js    │    │   Engine     │    │   Pusher     │                  │
│  │   Web App    │◄──►│   (Railway)  │◄──►│  (Realtime)  │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│         │                   │                                               │
│         │                   │                                               │
│         ▼                   ▼                                               │
│  ┌─────────────────────────────────────┐    ┌──────────────┐               │
│  │         PostgreSQL + pgvector       │    │   OpenAI     │               │
│  │  ┌─────────┬─────────┬───────────┐  │    │   API        │               │
│  │  │ Plexus  │  Repos  │   Files   │  │    │              │               │
│  │  ├─────────┼─────────┼───────────┤  │    │ embeddings   │               │
│  │  │ Weaves  │  Chunks │ Embeddings│  │    │              │               │
│  │  └─────────┴─────────┴───────────┘  │    └──────────────┘               │
│  └─────────────────────────────────────┘                                    │
│         │                                                                   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────┐                                                          │
│  │   GitHub     │                                                          │
│  │   App API    │                                                          │
│  └──────────────┘                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Component | Technology |
|-----------|------------|
| Web App | Next.js 15 (App Router), React, TypeScript |
| Engine | Node.js, TypeScript, runs on Railway |
| Database | PostgreSQL with pgvector extension |
| ORM | Prisma |
| Embeddings | OpenAI text-embedding-3-large (3072 dimensions) |
| Realtime | Pusher (for job progress updates) |
| GitHub Integration | GitHub App (for repository access) |
| Monorepo | pnpm workspaces + Turborepo |

---

## Complete Database Schema

```prisma
// === PostgreSQL Extensions ===
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]  // pgvector for embedding similarity search
}

// === Auth (NextAuth.js) ===

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts               Account[]
  sessions               Session[]
  plexusMember           PlexusMember[]
  comments               Comment[]
  githubAppInstallations GitHubAppInstallation[]

  @@map("users")
}

model Account {
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model GitHubAppInstallation {
  installationId Int      @id
  userId         String
  accountLogin   String   // GitHub org or user login
  accountType    String   // "Organization" or "User"
  accountId      Int      // GitHub account ID
  suspended      Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("github_app_installations")
}

// === Plexus (Team Workspace) ===

model Plexus {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())

  members PlexusMember[]
  repos   Repo[]
  weaves  Weave[]

  @@map("plexuses")
}

model PlexusMember {
  userId   String
  plexusId String
  role     String @default("MEMBER")  // OWNER, ADMIN, MEMBER

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  plexus Plexus @relation(fields: [plexusId], references: [id], onDelete: Cascade)

  @@id([userId, plexusId])
  @@map("plexus_members")
}

// === Repositories ===

model Repo {
  id             String    @id @default(cuid())
  plexusId       String
  name           String                    // e.g., "blocks"
  fullName       String                    // e.g., "thomasdavis/blocks"
  url            String                    // GitHub URL
  defaultBranch  String    @default("main")
  lastIndexed    DateTime?                 // When last file sync completed
  lastCommitSha  String?                   // SHA of last processed commit (for delta sync)
  createdAt      DateTime  @default(now())

  plexus        Plexus         @relation(fields: [plexusId], references: [id], onDelete: Cascade)
  files         File[]
  syncJobs      RepoSyncJob[]
  chunkSyncJobs ChunkSyncJob[]
  sourceWeaves  Weave[]        @relation("SourceRepo")
  targetWeaves  Weave[]        @relation("TargetRepo")

  @@unique([plexusId, fullName])
  @@map("repos")
}

model File {
  id            String   @id @default(cuid())
  repoId        String
  path          String                    // e.g., "src/components/Button.tsx"
  content       String?                   // File content (null for binary/large files)
  sha           String                    // Git blob SHA
  size          Int                       // File size in bytes
  encoding      String?                   // "utf-8", "binary", etc.
  skippedReason String?                   // "too_large", "binary", etc.
  language      String?                   // Detected programming language
  loc           Int?                      // Lines of code
  updatedAt     DateTime @updatedAt

  repo   Repo    @relation(fields: [repoId], references: [id], onDelete: Cascade)
  chunks Chunk[]

  @@unique([repoId, path])
  @@map("files")
}

// === File Sync Jobs ===

model RepoSyncJob {
  id             String        @id @default(cuid())
  repoId         String
  status         SyncJobStatus @default(PENDING)
  totalFiles     Int?                      // Set after tree fetch
  processedFiles Int           @default(0)
  skippedFiles   Int           @default(0)
  failedFiles    Int           @default(0)
  error          String?                   // Error message if failed
  config         Json?                     // { maxFiles, skipContent, etc. }
  startedAt      DateTime?
  completedAt    DateTime?
  createdAt      DateTime      @default(now())

  repo     Repo          @relation(fields: [repoId], references: [id], onDelete: Cascade)
  fileJobs FileSyncJob[]

  @@index([status, createdAt])
  @@index([repoId, createdAt])
  @@map("repo_sync_jobs")
}

enum SyncJobStatus {
  PENDING
  FETCHING_TREE
  PROCESSING_FILES
  COMPLETED
  FAILED
  CANCELLED
}

model FileSyncJob {
  id          String        @id @default(cuid())
  syncJobId   String
  repoId      String
  path        String
  sha         String                      // Git blob SHA
  size        Int                         // File size in bytes
  status      FileJobStatus @default(PENDING)
  skipReason  String?                     // "binary", "too_large", etc.
  error       String?
  processedAt DateTime?
  createdAt   DateTime      @default(now())

  syncJob RepoSyncJob @relation(fields: [syncJobId], references: [id], onDelete: Cascade)

  @@index([syncJobId, status])
  @@index([repoId, path])
  @@map("file_sync_jobs")
}

enum FileJobStatus {
  PENDING
  PROCESSING
  COMPLETED
  SKIPPED
  FAILED
}

// === Chunks & Embeddings ===

model Chunk {
  id         String                       @id @default(cuid())
  fileId     String
  content    String                       // The chunk text content
  startChar  Int                          // Character offset from start of file
  endChar    Int                          // End character offset
  chunkIndex Int                          // 0-based index within file
  tokenCount Int?                         // Approximate token count (~4 chars/token)
  embedding  Unsupported("vector(3072)")? // OpenAI text-embedding-3-large
  embeddedAt DateTime?                    // When embedding was generated
  createdAt  DateTime                     @default(now())

  file File @relation(fields: [fileId], references: [id], onDelete: Cascade)

  @@index([fileId])
  // Note: pgvector index (ivfflat/hnsw) created via raw SQL - Prisma doesn't support
  @@map("chunks")
}

model ChunkSyncJob {
  id                  String          @id @default(cuid())
  repoId              String
  status              ChunkJobStatus  @default(PENDING)
  totalFiles          Int?                              // Files with content to process
  processedFiles      Int             @default(0)
  chunksCreated       Int             @default(0)
  embeddingsGenerated Int             @default(0)
  skippedFiles        Int             @default(0)
  failedFiles         Int             @default(0)
  error               String?
  config              Json?                             // { chunkSize, overlap }
  startedAt           DateTime?
  completedAt         DateTime?
  createdAt           DateTime        @default(now())

  repo Repo @relation(fields: [repoId], references: [id], onDelete: Cascade)

  @@index([status, createdAt])
  @@index([repoId, createdAt])
  @@map("chunk_sync_jobs")
}

enum ChunkJobStatus {
  PENDING
  CHUNKING
  EMBEDDING
  COMPLETED
  FAILED
  CANCELLED
}

// === Weaves (Discovered Connections) ===

model Weave {
  id           String    @id @default(cuid())
  plexusId     String
  sourceRepoId String
  targetRepoId String
  type         WeaveType
  title        String                    // e.g., "Shared auth implementation"
  description  String                    // AI-generated explanation
  score        Float                     // Similarity score (0.0 - 1.0)
  dismissed    Boolean   @default(false) // User can dismiss irrelevant weaves
  createdAt    DateTime  @default(now())

  plexus     Plexus    @relation(fields: [plexusId], references: [id], onDelete: Cascade)
  sourceRepo Repo      @relation("SourceRepo", fields: [sourceRepoId], references: [id], onDelete: Cascade)
  targetRepo Repo      @relation("TargetRepo", fields: [targetRepoId], references: [id], onDelete: Cascade)
  comments   Comment[]

  @@index([plexusId, createdAt])
  @@map("weaves")
}

enum WeaveType {
  shared_module             // Building the same thing separately
  integration_opportunity   // Services that could integrate
  shared_dependency         // Same external deps being wrapped similarly
  api_compatibility         // APIs that could be unified
  refactor_candidate        // Similar code that could be consolidated
}

model Comment {
  id        String   @id @default(cuid())
  weaveId   String
  userId    String
  content   String
  createdAt DateTime @default(now())

  weave Weave @relation(fields: [weaveId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id])

  @@index([weaveId, createdAt])
  @@map("comments")
}

// === GitHub Rate Limiting ===

model GitHubRateLimit {
  id             String   @id @default(cuid())
  installationId Int      @unique
  remaining      Int
  limit          Int
  resetAt        DateTime
  updatedAt      DateTime @updatedAt

  @@map("github_rate_limits")
}
```

---

## File Sync Pipeline

The first step is syncing repository content from GitHub.

### Sync Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FILE SYNC PIPELINE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User adds repo     Engine picks up job      Fetch GitHub tree             │
│  to Plexus          from queue               via App API                   │
│       │                    │                      │                         │
│       ▼                    ▼                      ▼                         │
│  ┌─────────┐        ┌─────────────┐        ┌─────────────┐                 │
│  │ Create  │───────►│  PENDING    │───────►│FETCHING_TREE│                 │
│  │SyncJob  │        │             │        │             │                 │
│  └─────────┘        └─────────────┘        └─────────────┘                 │
│                                                  │                          │
│                                                  ▼                          │
│                     For each file:         ┌─────────────┐                 │
│                     - Create FileSyncJob   │PROCESSING   │                 │
│                     - Fetch blob content   │   FILES     │                 │
│                     - Detect language      │             │                 │
│                     - Store in DB          └─────────────┘                 │
│                                                  │                          │
│                           Skip if:               │                          │
│                           - Binary file          ▼                          │
│                           - > 1MB            ┌─────────────┐                │
│                           - Image/media      │ COMPLETED   │                │
│                                              │             │                │
│                                              └─────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What Gets Synced

| File Type | Action | Reason |
|-----------|--------|--------|
| `.ts`, `.js`, `.tsx`, `.jsx` | Sync content | Code files |
| `.py`, `.go`, `.rs`, `.java` | Sync content | Code files |
| `.json`, `.yaml`, `.toml` | Sync content | Config files |
| `.md`, `.mdx` | Sync content | Documentation |
| `.png`, `.jpg`, `.gif` | Skip (binary) | Not useful for embedding |
| `.exe`, `.dll`, `.so` | Skip (binary) | Not useful for embedding |
| Files > 1MB | Skip (too large) | Too expensive to process |
| `node_modules/*` | Skip | Dependencies |
| `.git/*` | Skip | Git metadata |

### CLI Commands

```bash
# Trigger sync for a repo
pnpm engine sync --repo-id <id>

# Check sync status
pnpm engine status --job-id <id>

# List sync jobs
pnpm engine jobs

# List repos
pnpm engine repos
```

---

## Chunking System

After files are synced, we chunk them into smaller pieces for embedding.

### Why Chunk?

1. **Token Limits**: Embedding models have input limits (~8k tokens for text-embedding-3-large)
2. **Granularity**: Smaller chunks allow more precise similarity matching
3. **Cost**: Smaller chunks = cheaper embedding API calls
4. **Relevance**: A whole file might discuss many topics; chunks are more focused

### Chunking Algorithm

We use **naive character-count based chunking** with overlap:

```typescript
// apps/engine/src/embed/chunker.ts

export interface ChunkConfig {
  chunkSize: number   // Default: 1500 characters
  overlap: number     // Default: 200 characters
}

export interface ChunkResult {
  content: string     // The chunk text
  startChar: number   // Start position in original file
  endChar: number     // End position in original file
  chunkIndex: number  // 0-based index within file
}

export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  chunkSize: 1500,
  overlap: 200,
}

/**
 * Naive character-count based chunking
 * Splits content into overlapping chunks of specified size
 */
export function chunkContent(
  content: string,
  config: ChunkConfig = DEFAULT_CHUNK_CONFIG,
): ChunkResult[] {
  const chunks: ChunkResult[] = []
  let startChar = 0
  let chunkIndex = 0

  // Handle empty content
  if (!content || content.length === 0) {
    return []
  }

  // Handle content smaller than chunk size
  if (content.length <= config.chunkSize) {
    return [
      {
        content,
        startChar: 0,
        endChar: content.length,
        chunkIndex: 0,
      },
    ]
  }

  while (startChar < content.length) {
    const endChar = Math.min(startChar + config.chunkSize, content.length)
    const chunkContent = content.slice(startChar, endChar)

    chunks.push({
      content: chunkContent,
      startChar,
      endChar,
      chunkIndex,
    })

    // If we've reached the end, break
    if (endChar >= content.length) {
      break
    }

    // Move to next chunk position with overlap
    const nextStart = endChar - config.overlap

    // Prevent infinite loop if overlap >= chunkSize
    if (nextStart <= startChar) {
      break
    }

    startChar = nextStart
    chunkIndex++
  }

  return chunks
}

/**
 * Estimate token count for a text (rough approximation)
 * Uses ~4 characters per token as a heuristic
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}
```

### Chunking Example

Given a 4000 character file with chunkSize=1500 and overlap=200:

```
Original File (4000 chars):
┌────────────────────────────────────────────────────────────────────┐
│ [0 ─────────────────────────────────────────────────────── 4000]  │
└────────────────────────────────────────────────────────────────────┘

Chunk 0: chars 0-1500
┌──────────────────────────────┐
│ [0 ──────────────── 1500]    │
└──────────────────────────────┘

Chunk 1: chars 1300-2800 (starts 200 chars before end of chunk 0)
          ┌────────────────────────────────┐
          │ [1300 ────────────── 2800]     │
          └────────────────────────────────┘

Chunk 2: chars 2600-4000 (starts 200 chars before end of chunk 1)
                    ┌──────────────────────────────┐
                    │ [2600 ──────────── 4000]     │
                    └──────────────────────────────┘

Overlap ensures context continuity between chunks.
```

### Why 1500 Characters / 200 Overlap?

| Setting | Value | Rationale |
|---------|-------|-----------|
| Chunk Size | 1500 chars | ~375 tokens, leaves room for model overhead |
| Overlap | 200 chars | ~50 tokens, maintains context across boundaries |
| Token Estimate | length/4 | Rough approximation for code/text mix |

---

## Embedding System

After chunking, we generate embeddings for semantic search.

### Embedding Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EMBEDDING PIPELINE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ChunkSyncJob     Phase 1: CHUNKING         Phase 2: EMBEDDING             │
│  created          Create chunks             Generate embeddings            │
│       │                  │                         │                        │
│       ▼                  ▼                         ▼                        │
│  ┌─────────┐       ┌───────────┐            ┌───────────┐                  │
│  │ PENDING │──────►│ CHUNKING  │───────────►│ EMBEDDING │                  │
│  └─────────┘       └───────────┘            └───────────┘                  │
│                          │                         │                        │
│                          ▼                         ▼                        │
│                    For each file:            Batch 50 chunks:              │
│                    - Delete old chunks       - Send to OpenAI              │
│                    - Split by char count     - Get 3072-dim vectors        │
│                    - Insert new chunks       - Store in DB                 │
│                    - Track progress          - Rate limit 100ms            │
│                                                    │                        │
│                                                    ▼                        │
│                                              ┌───────────┐                  │
│                                              │ COMPLETED │                  │
│                                              └───────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Embedding Model

```typescript
// packages/ai/src/embeddings.ts

import { embedMany } from 'ai'
import { openai } from '@ai-sdk/openai'

// text-embedding-3-large has 3072 dimensions
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const model = openai.embedding('text-embedding-3-large')
  const { embeddings } = await embedMany({
    model,
    values: texts,
  })
  return embeddings
}
```

### Why text-embedding-3-large?

| Model | Dimensions | Quality | Cost |
|-------|------------|---------|------|
| text-embedding-3-small | 1536 | Good | $0.02/1M tokens |
| **text-embedding-3-large** | 3072 | Best | $0.13/1M tokens |
| text-embedding-ada-002 | 1536 | Legacy | $0.10/1M tokens |

We chose **text-embedding-3-large** for:
- Highest quality semantic understanding
- Better code comprehension
- More accurate similarity matching

### Embedding Orchestration

```typescript
// apps/engine/src/embed/embed-sync.ts (simplified)

export async function embedRepo(job: ChunkSyncJob): Promise<void> {
  // === Phase 1: CHUNKING ===

  // Get all files with content (skip binary/skipped)
  const files = await db.file.findMany({
    where: {
      repoId: job.repoId,
      content: { not: null },
      skippedReason: null,
    },
  })

  for (const file of files) {
    // Delete existing chunks for this file
    await db.chunk.deleteMany({ where: { fileId: file.id } })

    // Create new chunks using character-based splitter
    const chunks = chunkContent(file.content, config)

    // Insert chunks (raw SQL needed for vector type)
    for (const chunk of chunks) {
      await db.$executeRaw`
        INSERT INTO chunks (id, "fileId", content, "startChar", "endChar", "chunkIndex", "tokenCount", "createdAt")
        VALUES (
          gen_random_uuid()::text,
          ${file.id},
          ${chunk.content},
          ${chunk.startChar},
          ${chunk.endChar},
          ${chunk.chunkIndex},
          ${estimateTokenCount(chunk.content)},
          NOW()
        )
      `
    }
  }

  // === Phase 2: EMBEDDING ===

  // Get all chunks without embeddings
  const chunksToEmbed = await db.chunk.findMany({
    where: {
      file: { repoId: job.repoId },
      embeddedAt: null,
    },
  })

  const BATCH_SIZE = 50
  const DELAY_MS = 100

  for (let i = 0; i < chunksToEmbed.length; i += BATCH_SIZE) {
    const batch = chunksToEmbed.slice(i, i + BATCH_SIZE)

    // Call OpenAI embedding API
    const embeddings = await generateEmbeddings(batch.map(c => c.content))

    // Store embeddings (raw SQL for vector type)
    for (let j = 0; j < batch.length; j++) {
      const vectorStr = `[${embeddings[j].join(',')}]`

      await db.$executeRaw`
        UPDATE chunks
        SET embedding = ${vectorStr}::vector,
            "embeddedAt" = NOW()
        WHERE id = ${batch[j].id}
      `
    }

    // Rate limiting delay between batches
    await new Promise(resolve => setTimeout(resolve, DELAY_MS))
  }
}
```

### CLI Commands

```bash
# Trigger embedding for a repo
pnpm engine embed --repo-id <id>

# Check embedding job status
pnpm engine embed-status --job-id <id>

# List embedding jobs
pnpm engine embed-jobs

# Reset stuck jobs
pnpm engine embed-reset --all
```

---

## Vector Storage & Similarity Search

PostgreSQL with pgvector enables efficient vector similarity search.

### pgvector Setup

```sql
-- Enable the extension
CREATE EXTENSION IF NOT EXISTS vector;

-- The chunks table has a vector(3072) column
-- Prisma schema:
-- embedding  Unsupported("vector(3072)")?
```

### Similarity Operators

| Operator | Function | Use Case |
|----------|----------|----------|
| `<=>` | Cosine distance | Best for semantic similarity |
| `<->` | L2 (Euclidean) distance | Geometric distance |
| `<#>` | Inner product (negative) | Dot product similarity |

**Cosine similarity** is preferred for text embeddings because it measures the angle between vectors, not magnitude. Two chunks discussing the same topic will have similar directions even if one is longer.

### Basic Similarity Query

```sql
-- Find chunks most similar to a given embedding
SELECT
  id,
  content,
  1 - (embedding <=> $1) as similarity  -- Convert distance to similarity
FROM chunks
WHERE embedding IS NOT NULL
ORDER BY embedding <=> $1  -- Order by cosine distance (ascending = most similar)
LIMIT 10;
```

### Cross-Repository Similarity Query

This is the core query for finding weaves - chunks in repo B that are similar to chunks in repo A:

```sql
-- Find similar chunks between two repos
WITH source_chunks AS (
  SELECT
    c.id,
    c.content,
    c.embedding,
    f.path as file_path,
    f.id as file_id
  FROM chunks c
  JOIN files f ON c."fileId" = f.id
  WHERE f."repoId" = $sourceRepoId
  AND c.embedding IS NOT NULL
)
SELECT
  sc.id as source_chunk_id,
  sc.file_path as source_path,
  sc.content as source_content,
  tc.id as target_chunk_id,
  tf.path as target_path,
  tc.content as target_content,
  1 - (sc.embedding <=> tc.embedding) as similarity
FROM source_chunks sc
CROSS JOIN LATERAL (
  -- For each source chunk, find the top 5 most similar target chunks
  SELECT c.id, c.content, c.embedding, c."fileId"
  FROM chunks c
  JOIN files f ON c."fileId" = f.id
  WHERE f."repoId" = $targetRepoId
  AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> sc.embedding
  LIMIT 5
) tc
JOIN files tf ON tc."fileId" = tf.id
WHERE 1 - (sc.embedding <=> tc.embedding) > $threshold  -- e.g., 0.85
ORDER BY similarity DESC
LIMIT 100;
```

### Index Considerations

For large datasets, pgvector supports specialized indexes:

```sql
-- IVFFlat index (faster, approximate)
CREATE INDEX ON chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- HNSW index (best quality, more memory)
CREATE INDEX ON chunks
USING hnsw (embedding vector_cosine_ops);
```

**Note**: We removed the default btree index because 3072-dimension vectors exceed btree's row size limit (8191 bytes).

---

## Weave Discovery System

This is the system we need to build. It uses the embedding similarity to discover connections.

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WEAVE DISCOVERY SYSTEM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      findWeaves(plexusId)                            │  │
│  │                                                                      │  │
│  │  1. Get all repos in plexus                                          │  │
│  │  2. Generate all unique repo pairs: N*(N-1)/2                        │  │
│  │  3. For each WeaveType:                                              │  │
│  │     - Run type.findWeaves() on each pair                             │  │
│  │     - Collect candidates above threshold                             │  │
│  │  4. Deduplicate overlapping discoveries                              │  │
│  │  5. Optionally: Use LLM to generate title/description                │  │
│  │  6. Store new weaves, skip existing ones                             │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐               │
│  │ WeaveType:     │  │ WeaveType:     │  │ WeaveType:     │               │
│  │ Semantic       │  │ Shared         │  │ API            │   ...         │
│  │ Similarity     │  │ Dependency     │  │ Compatibility  │               │
│  └────────────────┘  └────────────────┘  └────────────────┘               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### WeaveType Interface

```typescript
// apps/engine/src/weave/types/base.ts

export interface WeaveType {
  id: string                    // e.g., "semantic_similarity"
  name: string                  // Human-readable name
  description: string           // What this weave type finds

  // Main discovery function
  findWeaves(
    plexusId: string,
    sourceRepoId: string,
    targetRepoId: string,
    options?: WeaveOptions
  ): Promise<WeaveCandidate[]>
}

export interface WeaveOptions {
  threshold?: number           // Minimum similarity score (default: 0.85)
  maxResults?: number          // Max candidates per pair (default: 50)
  includeChunks?: boolean      // Include matching chunk content
}

export interface WeaveCandidate {
  sourceRepoId: string
  targetRepoId: string
  type: string                 // WeaveType.id
  score: number                // 0.0 - 1.0
  title: string                // Short description
  description: string          // Detailed explanation
  metadata: {
    sourceChunks: ChunkMatch[]
    targetChunks: ChunkMatch[]
    [key: string]: any         // Type-specific data
  }
}

export interface ChunkMatch {
  chunkId: string
  filePath: string
  content: string
  startChar: number
  endChar: number
  similarity: number
}
```

### Proposed Directory Structure

```
apps/engine/src/weave/
├── types/
│   ├── index.ts                   # Export all weave types
│   ├── base.ts                    # WeaveType interface
│   ├── semantic-similarity.ts     # Basic embedding similarity
│   ├── shared-dependency.ts       # package.json overlap
│   ├── api-compatibility.ts       # Similar API patterns
│   └── ...                        # More weave types
├── finder.ts                      # Main findWeaves orchestration
├── scorer.ts                      # Scoring utilities
├── deduplicator.ts               # Merge overlapping discoveries
└── describer.ts                  # LLM-based title/description generation
```

### Repo Pair Iteration

For N repos, we examine N*(N-1)/2 unique pairs:

| Repos | Pairs | Example |
|-------|-------|---------|
| 2 | 1 | A↔B |
| 3 | 3 | A↔B, A↔C, B↔C |
| 5 | 10 | Current test plexus |
| 10 | 45 | Medium org |
| 20 | 190 | Large org |

---

## Current Data Stats

### Test Plexus: "Blah"

| Repository | Files | Chunks | Embeddings | Status |
|------------|-------|--------|------------|--------|
| DavinciDreams/carmack | 311 | 2,851 | 2,851 | Complete |
| DavinciDreams/evolving-ai | 8 | 499 | 499 | Complete |
| thomasdavis/blocks | 133 | 394 | 394 | Complete |
| thomasdavis/kaleistyleguide | 74 | 248 | 248 | Complete |
| thomasdavis/jQuery-Social-Sidebar | 2 | 2 | 2 | Complete |
| **Total** | **528** | **3,994** | **3,994** | **100%** |

### Embedding Configuration

| Setting | Value |
|---------|-------|
| Model | OpenAI text-embedding-3-large |
| Dimensions | 3072 |
| Chunk Size | 1500 characters |
| Chunk Overlap | 200 characters |
| Batch Size | 50 chunks |
| Rate Limit Delay | 100ms between batches |

---

## Implementation Plan

### Phase 1: Basic Semantic Similarity Weave

1. Create `WeaveType` interface
2. Implement `semantic-similarity` weave type
3. Create `findWeaves` orchestrator
4. Add CLI command: `pnpm engine find-weaves --plexus-id <id>`
5. Test on current plexus

### Phase 2: Weave Storage & Deduplication

1. Store discovered weaves in database
2. Skip weaves that already exist
3. Add weave metadata (matching chunks, scores)
4. Implement deduplication for overlapping discoveries

### Phase 3: LLM Enhancement

1. Use GPT-4 to generate better titles/descriptions
2. Validate discovered connections are meaningful
3. Classify the type of connection found

### Phase 4: Additional Weave Types

1. Shared dependency detection
2. API compatibility analysis
3. Configuration similarity
4. Test pattern matching
5. Documentation gap detection

### Phase 5: UI Integration

1. Weaves page in web app
2. Show matching code snippets
3. Allow dismissing irrelevant weaves
4. Comment system for discussion

---

## Questions for Input

### 1. Basic Weave Type Design

What would be the simplest, most valuable weave type to start with?

Our initial thought is **"semantic similarity"** - finding code chunks that do similar things across repos. Questions:

- What similarity threshold should we use? (0.8? 0.85? 0.9?)
- Should we require multiple matching chunks, or is one enough?
- How do we group related matches into a single weave?
- Should certain file types be weighted differently?

### 2. Suggested Weave Types

What other weave types would be valuable? Ideas to consider:

| Type | Description | Detection Method |
|------|-------------|------------------|
| Semantic Similarity | Similar code doing the same thing | Embedding cosine similarity |
| Shared Dependency | Both repos wrap the same npm package | Parse package.json |
| API Surface Overlap | Similar REST/GraphQL endpoints | Pattern match on routes |
| Duplicate Utilities | Same helper functions | High embedding similarity |
| Config Compatibility | Similar config patterns | Compare config files |
| Test Pattern Match | Similar test structures | Compare test files |
| Documentation Gap | One repo has docs another lacks | Check for README/docs |
| Migration Opportunity | Old pattern vs new pattern | Compare implementation ages |

### 3. Scoring Methodology

How should we calculate the final weave score?

Options:
1. **Pure embedding similarity** - Just cosine distance
2. **Weighted combination**:
   - 0.7 × embedding similarity
   - 0.2 × file path similarity
   - 0.1 × language match bonus
3. **Multiple signals**:
   - Must have >= 3 matching chunks
   - Average similarity >= 0.85
   - At least one match >= 0.90

### 4. Threshold Recommendations

What thresholds produce good results?

| Threshold | Expected Behavior |
|-----------|-------------------|
| 0.95+ | Near-exact duplicates only |
| 0.90 | Very similar code |
| 0.85 | Similar patterns/logic |
| 0.80 | Related concepts |
| 0.75 | Vaguely similar |
| < 0.75 | Likely noise |

### 5. LLM Enhancement

After finding candidates via embeddings, should we:

1. **Validate with LLM**: "Is this a meaningful connection?"
2. **Generate descriptions**: "Explain why these code sections are related"
3. **Classify type**: "What kind of connection is this?"
4. **Suggest action**: "What should the team do about this?"

Example LLM prompt:
```
Given these two code chunks from different repositories:

CHUNK A (from repo: thomasdavis/blocks, file: src/auth/login.ts):
[chunk content]

CHUNK B (from repo: thomasdavis/kaleistyleguide, file: lib/authentication.ts):
[chunk content]

1. Are these chunks doing similar things? (yes/no)
2. If yes, describe the connection in one sentence
3. What type of connection is this? (duplicate code / similar pattern / shared concept / unrelated)
4. Suggested action for the team
```

### 6. Metadata to Capture

What metadata should each weave store?

```typescript
interface WeaveMetadata {
  // Core matching info
  sourceChunks: ChunkMatch[]
  targetChunks: ChunkMatch[]

  // Scoring details
  avgSimilarity: number
  maxSimilarity: number
  matchCount: number

  // Context
  sourceLanguage: string
  targetLanguage: string
  sourceFilePaths: string[]
  targetFilePaths: string[]

  // Type-specific
  sharedDependencies?: string[]    // For shared_dependency type
  apiEndpoints?: string[]          // For api_compatibility type
  patterns?: string[]              // For refactor_candidate type
}
```

---

## Appendix: Code Locations

| Purpose | File Path |
|---------|-----------|
| Prisma Schema | `packages/db/prisma/schema.prisma` |
| Chunker | `apps/engine/src/embed/chunker.ts` |
| Embed Sync | `apps/engine/src/embed/embed-sync.ts` |
| Embeddings API | `packages/ai/src/embeddings.ts` |
| Engine Config | `apps/engine/src/config.ts` |
| Queue Processor | `apps/engine/src/queue/processor.ts` |
| CLI Commands | `apps/engine/src/cli/index.ts` |
| Pusher Service | `apps/engine/src/pusher/service.ts` |
| **Weave Types (TODO)** | `apps/engine/src/weave/types/` |
| **Weave Finder (TODO)** | `apps/engine/src/weave/finder.ts` |

---

## Summary

We have a complete pipeline for:
1. ✅ Syncing GitHub repositories
2. ✅ Chunking files (1500 chars, 200 overlap)
3. ✅ Generating embeddings (text-embedding-3-large, 3072 dims)
4. ✅ Storing in PostgreSQL with pgvector
5. 🔲 **Discovering weaves between repos** ← This is what we need to build

The foundation is ready. We need help designing:
- The basic weave type to start with
- Scoring and threshold methodology
- Additional valuable weave types
- Whether/how to use LLM for enhancement
