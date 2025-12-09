# Weave System Tutorial

This guide explains how Symploke's weave discovery system works and how to create new weave types.

## Table of Contents

1. [What is a Weave?](#what-is-a-weave)
2. [Architecture Overview](#architecture-overview)
3. [Core Types and Interfaces](#core-types-and-interfaces)
4. [Discovery Flow](#discovery-flow)
5. [Creating a New Weave Type](#creating-a-new-weave-type)
6. [CLI Commands](#cli-commands)
7. [Database Schema](#database-schema)
8. [Best Practices](#best-practices)

---

## What is a Weave?

A **Weave** is a discovered connection between two repositories in a plexus. Unlike simple code similarity, weaves represent **actionable integration opportunities** - ways repositories could work together, share code, or complement each other.

Examples of weaves:
- "Repo A's PDF generation could power Repo B's resume export"
- "Both repos implement auth - they could share a common module"
- "Repo A outputs JSON that Repo B could consume"

Each weave has:
- A **type** (glossary_alignment, integration_opportunity, etc.)
- A **score** (0.0 - 1.0 indicating strength of connection)
- A **title** and **description** (AI-generated explanation)
- **Metadata** (type-specific details like file pairs, integration opportunities)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLI Commands                                 │
│  (find-weaves, find-weaves-v2, find-actionable-weaves)             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Discovery Orchestrator                          │
│  (finder.ts, finder-v2.ts, finder-actionable.ts)                    │
│                                                                      │
│  1. Creates WeaveDiscoveryRun                                       │
│  2. Fetches repos in plexus                                         │
│  3. Generates repo pairs (N choose 2)                               │
│  4. Calls each WeaveTypeHandler                                     │
│  5. Filters candidates                                              │
│  6. Saves to database                                               │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      WeaveTypeHandler                                │
│  (implements: findWeaves())                                         │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ GlossaryAlignment │  │ IntegrationOpp   │  │ YourNewType      │  │
│  │                   │  │                   │  │                   │  │
│  │ - Compare glossary│  │ - Vector search   │  │ - Your logic     │  │
│  │ - AI narrative    │  │ - File aggregation│  │ - Returns        │  │
│  │ - Score alignment │  │ - LLM validation  │  │   WeaveCandidate │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Supporting Systems                              │
│                                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │ similarity │  │  glossary  │  │  profiler  │  │  ontology  │   │
│  │            │  │            │  │            │  │            │   │
│  │ pgvector   │  │ README     │  │ Functional │  │ Capability │   │
│  │ search     │  │ extraction │  │ profiles   │  │ vocabulary │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Database                                     │
│                                                                      │
│  Weave              WeaveDiscoveryRun       RepoGlossary            │
│  - sourceRepoId     - status                - provides[]            │
│  - targetRepoId     - repoPairsChecked      - consumes[]            │
│  - type             - candidatesFound       - gaps[]                │
│  - score            - weavesSaved           - values[]              │
│  - metadata         - logs                  - summary               │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `apps/engine/src/weave/types/base.ts` | Core interfaces (`WeaveTypeHandler`, `WeaveCandidate`) |
| `apps/engine/src/weave/types/glossary-alignment.ts` | Glossary-based weave type |
| `apps/engine/src/weave/finder.ts` | Discovery orchestrator |
| `apps/engine/src/weave/glossary.ts` | README extraction for glossaries |
| `apps/engine/src/weave/similarity.ts` | pgvector similarity search |
| `packages/db/prisma/schema.prisma` | Database models |

---

## Core Types and Interfaces

### WeaveTypeHandler

Every weave type implements this interface:

```typescript
// apps/engine/src/weave/types/base.ts

interface WeaveTypeHandler {
  id: WeaveType           // Prisma enum: glossary_alignment, integration_opportunity, etc.
  name: string            // Human-readable name
  description: string     // What this type discovers

  findWeaves(
    plexusId: string,
    sourceRepoId: string,
    targetRepoId: string,
    options?: WeaveOptions
  ): Promise<WeaveCandidate[]>
}
```

### WeaveCandidate

The output of a weave type's discovery:

```typescript
interface WeaveCandidate {
  sourceRepoId: string
  targetRepoId: string
  type: WeaveType
  score: number                          // 0.0 - 1.0
  title: string                          // AI-generated title
  description: string                    // AI-generated explanation
  filePairs: FilePairMatch[]            // Code similarity details (can be synthetic)
  metadata?: Record<string, unknown>     // Type-specific data
}
```

### WeaveOptions

Configuration passed to discovery:

```typescript
interface WeaveOptions {
  similarityThreshold?: number      // Default: 0.85 - minimum vector similarity
  maxChunkPairs?: number            // Default: 200 - max pairs to consider
  minMatchingChunks?: number        // Default: 3 - chunks needed per file pair
  minFilePairSimilarity?: number    // Default: 0.83 - file pair avg similarity
  maxFilePairsToLLM?: number        // Default: 7 - top N pairs for LLM
  llmScoreThreshold?: number        // Default: 0.75 - minimum LLM score
}

const DEFAULT_WEAVE_OPTIONS: Required<WeaveOptions> = {
  similarityThreshold: 0.85,
  maxChunkPairs: 200,
  minMatchingChunks: 3,
  minFilePairSimilarity: 0.83,
  maxFilePairsToLLM: 7,
  llmScoreThreshold: 0.75,
}
```

### FilePairMatch

Details about similar files between repos:

```typescript
interface FilePairMatch {
  sourceFile: string
  targetFile: string
  avgSimilarity: number
  maxSimilarity: number
  chunkCount: number
  matches: ChunkMatch[]
}

interface ChunkMatch {
  sourceChunkId: string
  targetChunkId: string
  sourceContent: string
  targetContent: string
  similarity: number
}
```

---

## Discovery Flow

### Step 1: CLI Triggers Discovery

```bash
cd apps/engine
npx tsx src/cli/index.ts find-weaves --plexus-id <id> --verbose
```

### Step 2: Create Discovery Run

```typescript
// finder.ts
const run = await db.weaveDiscoveryRun.create({
  data: {
    plexusId,
    status: 'RUNNING',
    config: { ...options },
  }
})
```

### Step 3: Generate Repo Pairs

```typescript
// Get all repos with embeddings
const repos = await db.repo.findMany({
  where: { plexusId },
  include: { files: { include: { chunks: true } } }
})

// Generate unique pairs (A→B only, not B→A)
const pairs: RepoPair[] = []
for (let i = 0; i < repos.length; i++) {
  for (let j = i + 1; j < repos.length; j++) {
    pairs.push({ source: repos[i], target: repos[j] })
  }
}
```

### Step 4: Run Each Weave Type

```typescript
const WEAVE_TYPES: WeaveTypeHandler[] = [
  GlossaryAlignmentWeave,
  // Add your types here
]

for (const pair of pairs) {
  for (const weaveType of WEAVE_TYPES) {
    const candidates = await weaveType.findWeaves(
      plexusId,
      pair.source.id,
      pair.target.id,
      options
    )

    // Filter and save candidates...
  }
}
```

### Step 5: Save Weaves to Database

```typescript
for (const candidate of candidates) {
  if (candidate.score >= threshold) {
    await db.weave.create({
      data: {
        plexusId,
        sourceRepoId: candidate.sourceRepoId,
        targetRepoId: candidate.targetRepoId,
        discoveryRunId: run.id,
        type: candidate.type,
        title: candidate.title,
        description: candidate.description,
        score: candidate.score,
        metadata: candidate.metadata,
      }
    })
  }
}
```

---

## Creating a New Weave Type

### Step 1: Add to WeaveType Enum

Edit `packages/db/prisma/schema.prisma`:

```prisma
enum WeaveType {
  shared_module
  integration_opportunity
  shared_dependency
  api_compatibility
  refactor_candidate
  philosophical_alignment
  glossary_alignment
  my_new_type              // Add your type here
}
```

Run migration:
```bash
cd packages/db
pnpm prisma generate
```

### Step 2: Create Type Implementation

Create `apps/engine/src/weave/types/my-new-type.ts`:

```typescript
import { db, WeaveType as PrismaWeaveType } from '@symploke/db'
import { logger } from '@symploke/logger'
import type { WeaveCandidate, WeaveOptions, WeaveTypeHandler, FilePairMatch } from './base.js'

/**
 * My New Weave Type
 *
 * Describe what this weave type discovers and why it's useful.
 */
export const MyNewWeave: WeaveTypeHandler = {
  id: PrismaWeaveType.my_new_type,
  name: 'My New Type',
  description: 'Discovers X opportunities between repositories',

  async findWeaves(
    plexusId: string,
    sourceRepoId: string,
    targetRepoId: string,
    options: WeaveOptions = {},
  ): Promise<WeaveCandidate[]> {
    logger.info({ plexusId, sourceRepoId, targetRepoId }, 'Finding my new type weaves')

    // 1. Fetch data you need
    const [sourceRepo, targetRepo] = await Promise.all([
      db.repo.findUnique({ where: { id: sourceRepoId } }),
      db.repo.findUnique({ where: { id: targetRepoId } }),
    ])

    if (!sourceRepo || !targetRepo) {
      logger.warn({ sourceRepoId, targetRepoId }, 'One or both repos not found')
      return []
    }

    // 2. Your discovery logic
    // - Vector similarity search
    // - Glossary comparison
    // - File analysis
    // - LLM assessment

    const score = await calculateScore(sourceRepo, targetRepo)

    // 3. Check threshold
    const threshold = options.llmScoreThreshold ?? 0.25
    if (score < threshold) {
      logger.debug({ sourceRepoId, targetRepoId, score, threshold }, 'Below threshold')
      return []
    }

    // 4. Generate title and description
    const title = `${sourceRepo.name} + ${targetRepo.name}: Your title`
    const description = 'AI-generated or computed description'

    // 5. Build file pairs (can be synthetic for non-similarity weaves)
    const filePairs: FilePairMatch[] = [
      {
        sourceFile: 'synthetic',
        targetFile: 'synthetic',
        avgSimilarity: score,
        maxSimilarity: score,
        chunkCount: 1,
        matches: [],
      },
    ]

    // 6. Build metadata (type-specific)
    const metadata = {
      // Your custom fields
      myField: 'value',
      opportunities: ['opportunity 1', 'opportunity 2'],
    }

    // 7. Return candidate(s)
    const candidate: WeaveCandidate = {
      sourceRepoId,
      targetRepoId,
      type: PrismaWeaveType.my_new_type,
      score,
      title,
      description,
      filePairs,
      metadata,
    }

    return [candidate]
  },
}

async function calculateScore(sourceRepo: any, targetRepo: any): Promise<number> {
  // Your scoring logic
  return 0.5
}
```

### Step 3: Export from Index

Edit `apps/engine/src/weave/types/index.ts`:

```typescript
export * from './base.js'
export * from './glossary-alignment.js'
export * from './integration-opportunity.js'
export * from './my-new-type.js'  // Add export
```

### Step 4: Register in Finder

Edit `apps/engine/src/weave/finder.ts`:

```typescript
import { MyNewWeave } from './types/my-new-type.js'

const WEAVE_TYPES: WeaveTypeHandler[] = [
  GlossaryAlignmentWeave,
  MyNewWeave,  // Add to registry
]
```

### Step 5: Add Metadata Interface (Optional)

If your weave type has specific metadata, add a typed interface:

```typescript
// apps/engine/src/weave/types/base.ts

export interface MyNewTypeMetadata {
  myField: string
  opportunities: string[]
  // ... your fields
}
```

### Step 6: Update UI (Optional)

If you want custom display for your weave type, update:
- `apps/web/src/app/plexus/[id]/weaves/[weaveId]/WeaveDetailClient.tsx`

---

## CLI Commands

### Discovery Commands

```bash
cd apps/engine

# Run discovery (v1 - glossary alignment)
npx tsx src/cli/index.ts find-weaves \
  --plexus-id <plexus-id> \
  --threshold 0.85 \
  --min-chunks 3 \
  --verbose \
  --dry-run

# View discovery runs
npx tsx src/cli/index.ts discovery-runs --plexus-id <id> --limit 10

# View specific run
npx tsx src/cli/index.ts discovery-run --run-id <run-id>

# List weaves
npx tsx src/cli/index.ts weaves --plexus-id <id>
```

### Glossary Commands

```bash
# Extract glossary for a repo
npx tsx src/cli/index.ts extract-glossary --repo-id <id>

# Extract glossaries for all repos in plexus
npx tsx src/cli/index.ts extract-glossaries --plexus-id <id>

# View a glossary
npx tsx src/cli/index.ts glossary --repo-id <id>
```

### Utility Commands

```bash
# Flush all weave data for a plexus (reset)
npx tsx src/cli/flush-data.ts <plexus-id>

# Daily pipeline (sync, embed, weave)
npx tsx src/cli/index.ts daily --plexus-id <id>
```

---

## Database Schema

### Weave Model

```prisma
model Weave {
  id              String      @id @default(cuid())
  plexusId        String
  sourceRepoId    String
  targetRepoId    String
  discoveryRunId  String?
  type            WeaveType
  title           String
  description     String      @db.Text
  score           Float
  metadata        Json?
  dismissed       Boolean     @default(false)
  createdAt       DateTime    @default(now())

  plexus          Plexus      @relation(fields: [plexusId], references: [id], onDelete: Cascade)
  sourceRepo      Repo        @relation("SourceRepo", fields: [sourceRepoId], references: [id], onDelete: Cascade)
  targetRepo      Repo        @relation("TargetRepo", fields: [targetRepoId], references: [id], onDelete: Cascade)
  discoveryRun    WeaveDiscoveryRun? @relation(fields: [discoveryRunId], references: [id], onDelete: SetNull)
  comments        Comment[]

  @@index([plexusId, createdAt])
  @@index([discoveryRunId])
}
```

### WeaveDiscoveryRun Model

```prisma
model WeaveDiscoveryRun {
  id               String               @id @default(cuid())
  plexusId         String
  status           WeaveDiscoveryStatus @default(RUNNING)
  config           Json?
  repoPairsTotal   Int                  @default(0)
  repoPairsChecked Int                  @default(0)
  candidatesFound  Int                  @default(0)
  weavesSaved      Int                  @default(0)
  weavesSkipped    Int                  @default(0)
  error            String?              @db.Text
  logs             Json?
  startedAt        DateTime             @default(now())
  completedAt      DateTime?

  plexus           Plexus               @relation(fields: [plexusId], references: [id], onDelete: Cascade)
  weaves           Weave[]

  @@index([plexusId, startedAt])
}

enum WeaveDiscoveryStatus {
  RUNNING
  COMPLETED
  FAILED
}

enum WeaveType {
  shared_module
  integration_opportunity
  shared_dependency
  api_compatibility
  refactor_candidate
  philosophical_alignment
  glossary_alignment
}
```

### RepoGlossary Model

```prisma
model RepoGlossary {
  id               String          @id @default(cuid())
  repoId           String          @unique
  status           GlossaryStatus  @default(PENDING)
  terms            String[]        @default([])
  empirics         Json            @default("{}")
  psychology       Json            @default("{}")
  poetics          Json            @default("{}")
  philosophy       Json            @default("{}")
  resentments      Json            @default("{}")
  futureVision     String?
  confidence       Float?
  unglossableReason String?
  extractedAt      DateTime?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  repo             Repo            @relation(fields: [repoId], references: [id], onDelete: Cascade)

  @@index([repoId])
}
```

---

## Best Practices

### 1. Use Thresholds Wisely

Don't return low-quality candidates - filter early:

```typescript
const threshold = options.llmScoreThreshold ?? 0.25
if (score < threshold) {
  logger.debug({ score, threshold }, 'Below threshold, skipping')
  return []
}
```

### 2. Include Rich Metadata

Metadata helps the UI display useful information:

```typescript
const metadata = {
  // Always include these for glossary types
  narrative: 'AI-generated explanation',
  relationshipType: 'supply_demand',

  // Integration details
  integrationOpportunities: ['specific', 'actionable', 'items'],
  supplyDemandMatches: ['A provides X, B needs X'],

  // Debugging info
  sourceGlossaryId: '...',
  confidence: 0.85,
}
```

### 3. Generate Actionable Titles

Bad: "Similarity detected"
Good: "blocks + carmack: Carmack can use Blocks' validation for type checking"

```typescript
const title = integrationOpportunities.length > 0
  ? `${sourceRepo.name} + ${targetRepo.name}: ${integrationOpportunities[0]}`
  : `${sourceRepo.name} & ${targetRepo.name}: ${relationshipTypeLabel}`
```

### 4. Log Appropriately

Use structured logging for debugging:

```typescript
logger.info({ sourceRepoId, targetRepoId, score }, 'Found candidate')
logger.debug({ filePairs: filePairs.length }, 'File pairs aggregated')
logger.warn({ error }, 'AI comparison failed')
```

### 5. Handle Errors Gracefully

Don't crash the whole discovery - return empty array on failure:

```typescript
try {
  const result = await compareWithAI(source, target)
  // ...
} catch (error) {
  logger.error({ error }, 'Comparison failed')
  return []  // Don't throw - let other pairs continue
}
```

### 6. Consider Both Directions

For symmetric relationships, you only need one direction (A→B). The finder generates pairs this way automatically. For asymmetric relationships (A provides to B), you might want to check both directions.

### 7. Use Synthetic File Pairs

For weave types that don't use code similarity (like glossary alignment), create synthetic file pairs:

```typescript
const filePairs: FilePairMatch[] = [
  {
    sourceFile: 'glossary',
    targetFile: 'glossary',
    avgSimilarity: score,
    maxSimilarity: score,
    chunkCount: 1,
    matches: [],
  },
]
```

---

## Example: Glossary Alignment Weave

The `GlossaryAlignmentWeave` is a good reference implementation:

1. **Data Source**: Repository glossaries (extracted from README)
2. **Comparison**: AI-powered narrative comparison
3. **Scoring**: 0-1 integration potential
4. **Metadata**: Relationship type, integration opportunities, tensions

Key features:
- Uses `getGlossary()` to fetch pre-extracted glossary data
- Uses OpenAI `generateObject()` for structured AI output
- Returns specific, actionable integration opportunities
- Includes relationship classification (supply_demand, pipeline, etc.)

See: `apps/engine/src/weave/types/glossary-alignment.ts`

---

## Summary

To create a new weave type:

1. Add enum value to `WeaveType` in Prisma schema
2. Create handler file implementing `WeaveTypeHandler`
3. Export from `types/index.ts`
4. Register in `WEAVE_TYPES` array in `finder.ts`
5. Run `pnpm prisma generate`
6. Test with `find-weaves --verbose --dry-run`

The system is designed to be extensible - each weave type is independent and can use any discovery strategy (vector similarity, glossary comparison, LLM analysis, ontology matching, etc.).
