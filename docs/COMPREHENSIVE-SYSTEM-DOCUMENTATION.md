# Symploke: Comprehensive System Documentation

> **Symploke** (Greek: *συμπλοκή* - "interweaving, entanglement") - An AI-powered platform that discovers meaningful connections between repositories through semantic analysis, ontology matching, and philosophical alignment.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [Web Application](#4-web-application)
5. [Engine Service](#5-engine-service)
6. [Core Features](#6-core-features)
7. [Data Flow Pipeline](#7-data-flow-pipeline)
8. [Key Algorithms](#8-key-algorithms)
9. [API Reference](#9-api-reference)
10. [CLI Reference](#10-cli-reference)
11. [Packages](#11-packages)
12. [Deployment](#12-deployment)

---

## 1. Project Overview

### Problem Statement

Teams maintain multiple related repositories that could benefit from:
- Shared code and utilities
- Integration opportunities
- Philosophical alignment in approach

But they lack visibility into these connections across codebases.

### Solution

Symploke automatically:
1. **Indexes repositories** from GitHub
2. **Generates semantic embeddings** for code chunks
3. **Discovers "Weaves"** - meaningful connections through multiple methods:
   - **Functional matches**: Code similarity using vector search (pgvector)
   - **Ontology-based matching**: Capability-need alignment
   - **Philosophical alignment**: Shared epistemology, beliefs, and conceptual enemies
   - **Glossary alignment**: Shared vocabulary, beliefs, and resentments (the "soul" of a codebase)

### Terminology (Branded)

| Term | Description |
|------|-------------|
| **Plexus** | A team/workspace containing related repositories |
| **Weave** | A discovered connection between two repositories |
| **Glossary** | A repository's extracted "soul" - its vocabulary, beliefs, resentments |

---

## 2. Architecture

### 2.1 Monorepo Structure

```
symploke/
├── apps/
│   ├── web/              # Next.js 16 - UI & API routes
│   └── engine/           # File sync engine - workers & CLI
├── packages/
│   ├── ai/               # OpenAI embeddings & completions
│   ├── db/               # Prisma schema & client
│   ├── api/              # Shared API schemas
│   ├── types/            # TypeScript types
│   ├── ui/               # Base UI components (unstyled)
│   ├── logger/           # Structured logging
│   ├── env/              # Environment validation
│   ├── errors/           # Error handling
│   ├── utils/            # Helper functions
│   ├── config/           # Biome config
│   ├── tailwind-config/  # Tailwind setup
│   ├── tsconfig/         # TypeScript configs
│   └── test/             # Test utilities
```

### 2.2 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 with App Router |
| **Language** | TypeScript (strict) |
| **Database** | Neon Postgres + pgvector |
| **ORM** | Prisma |
| **Auth** | NextAuth v5 (GitHub OAuth) |
| **AI** | Vercel AI SDK + OpenAI |
| **Embeddings** | text-embedding-3-large (3072 dims) |
| **LLM** | GPT-4o-mini |
| **Styling** | Tailwind CSS + dark mode |
| **UI** | Base UI (unstyled, composable) |
| **Real-time** | Pusher Channels |
| **Monorepo** | Turborepo + pnpm |
| **Linting** | Biome + ESLint |
| **Testing** | Vitest |

### 2.3 Key Principles

- **No barrel exports** - Direct imports only
- **Strict module boundaries** - Apps can't import from other apps
- **UI stays dependency-free** - Base components only
- **Delta sync** - Only process changed files

---

## 3. Database Schema

### 3.1 Core Entities

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER & AUTH                               │
├─────────────────────────────────────────────────────────────────┤
│ User                                                             │
│   ├── id, email, name, image                                    │
│   ├── accounts[] (OAuth providers)                              │
│   ├── sessions[]                                                │
│   ├── plexusMember[] (team memberships)                         │
│   └── gitHubAppInstallations[]                                  │
│                                                                  │
│ GitHubAppInstallation                                           │
│   ├── installationId (unique)                                   │
│   ├── userId, accountLogin, accountType                         │
│   └── suspended flag                                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         PLEXUS (TEAM)                           │
├─────────────────────────────────────────────────────────────────┤
│ Plexus                                                          │
│   ├── id, name, slug                                            │
│   ├── members[] (PlexusMember)                                  │
│   ├── repos[]                                                   │
│   ├── weaves[]                                                  │
│   └── discoveryRuns[]                                           │
│                                                                  │
│ PlexusMember                                                    │
│   ├── userId, plexusId                                          │
│   └── role (OWNER, MEMBER)                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         REPOSITORY                               │
├─────────────────────────────────────────────────────────────────┤
│ Repo                                                            │
│   ├── id, name, fullName, url, defaultBranch                   │
│   ├── plexusId                                                  │
│   ├── lastIndexed, lastCommitSha (for delta sync)              │
│   ├── source (MANUAL, AUTO)                                     │
│   ├── files[]                                                   │
│   ├── syncJobs[], chunkSyncJobs[]                              │
│   ├── sourceWeaves[], targetWeaves[]                           │
│   └── glossary (RepoGlossary)                                   │
│                                                                  │
│ File                                                            │
│   ├── id, repoId, path, sha, size                              │
│   ├── content (nullable for binary)                            │
│   ├── language, loc (lines of code)                            │
│   ├── skippedReason                                            │
│   ├── lastChunkedSha (skip re-chunking)                        │
│   └── chunks[]                                                  │
│                                                                  │
│ Chunk                                                           │
│   ├── id, fileId, content                                      │
│   ├── startChar, endChar, chunkIndex                           │
│   ├── tokenCount (estimated)                                   │
│   ├── embedding vector(3072)                                   │
│   └── embeddedAt                                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      SYNC & EMBED JOBS                          │
├─────────────────────────────────────────────────────────────────┤
│ RepoSyncJob                                                     │
│   ├── id, repoId                                                │
│   ├── status: PENDING | FETCHING_TREE | PROCESSING_FILES |     │
│   │           COMPLETED | FAILED | CANCELLED                   │
│   ├── totalFiles, processedFiles, skippedFiles, failedFiles    │
│   ├── config (maxFiles, skipContent, etc.)                     │
│   ├── error, startedAt, completedAt                            │
│   └── fileJobs[] (FileSyncJob)                                 │
│                                                                  │
│ ChunkSyncJob                                                    │
│   ├── id, repoId                                                │
│   ├── status: PENDING | CHUNKING | EMBEDDING |                 │
│   │           COMPLETED | FAILED | CANCELLED                   │
│   ├── totalFiles, processedFiles                               │
│   ├── chunksCreated, embeddingsGenerated                       │
│   ├── config (chunkSize, overlap)                              │
│   └── error, startedAt, completedAt                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      WEAVES & DISCOVERY                         │
├─────────────────────────────────────────────────────────────────┤
│ Weave                                                           │
│   ├── id, plexusId                                              │
│   ├── sourceRepoId, targetRepoId                               │
│   ├── discoveryRunId                                            │
│   ├── type: WeaveType (see below)                              │
│   ├── title, description                                        │
│   ├── score (0.0 - 1.0)                                        │
│   ├── metadata (file pairs, chunks, details)                   │
│   ├── dismissed (boolean)                                       │
│   └── comments[]                                                │
│                                                                  │
│ WeaveType (enum):                                               │
│   • shared_module                                               │
│   • integration_opportunity                                     │
│   • shared_dependency                                           │
│   • api_compatibility                                           │
│   • refactor_candidate                                          │
│   • philosophical_alignment                                     │
│   • glossary_alignment                                          │
│                                                                  │
│ WeaveDiscoveryRun                                               │
│   ├── id, plexusId                                              │
│   ├── status: RUNNING | COMPLETED | FAILED                     │
│   ├── repoPairsTotal, repoPairsChecked                         │
│   ├── candidatesFound, weavesSaved, weavesSkipped              │
│   ├── config, logs, error                                       │
│   └── startedAt, completedAt                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      GLOSSARY (REPO SOUL)                       │
├─────────────────────────────────────────────────────────────────┤
│ RepoGlossary                                                    │
│   ├── id, repoId (unique)                                      │
│   ├── terms[] (vocabulary with emotional valence)              │
│   ├── empirics (measures, evidence, truth claims)              │
│   ├── psychology (fears, confidences, defenses, blind spots)   │
│   ├── poetics (metaphors, naming, aesthetic, voice)            │
│   ├── philosophy (beliefs, virtues, epistemology, teleology)   │
│   ├── resentments (hates, enemies, allergies, warnings)        │
│   ├── futureVision (historian's view from 2500)                │
│   ├── status: PENDING | EXTRACTING | COMPLETE |                │
│   │           UNGLOSSABLE | FAILED                              │
│   ├── confidence (0.0 - 1.0)                                   │
│   └── extractedAt                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Web Application

### 4.1 Pages Structure

```
/                           # Landing / auth page
/plexus/create             # Create new plexus
/plexus/[id]/
  ├── dashboard            # Overview with flow graph
  ├── repos                # Repository list
  ├── repos/[repoId]       # Repo details & file browser
  ├── discovery            # Weave discovery interface
  ├── weave-logs           # Discovery run history
  ├── weaves               # Discovered weaves list
  ├── chunks               # Raw chunk/embedding browser
  ├── logs                 # Sync job logs
  ├── members              # Team management
  └── files                # File search
```

### 4.2 Key Components

**Dashboard** (`/plexus/[id]/dashboard`)
- Repository cards with sync/embed status
- Weave summary by type
- Discovery run history
- Quick actions (sync, embed, discover)

**Weaves View** (`/plexus/[id]/weaves`)
- Filter by type (integration_opportunity, philosophical_alignment, etc.)
- Sort by score
- Dismiss/undismiss weaves
- View weave details with file pair samples

**Weave Logs** (`/plexus/[id]/weave-logs`)
- Recent discovery runs
- Focus on specific repo pairs (blocks ↔ carmack)
- Detailed logs for debugging

---

## 5. Engine Service

### 5.1 Components

**Queue Processor** (`queue/processor.ts`)
- Polls database for pending jobs
- Processes sync and embed jobs
- Recovers interrupted jobs on startup
- 5-second poll interval

**File Sync** (`sync/repo-sync.ts`)
1. Find GitHub App installation
2. Fetch repository tree
3. Process files (skip binary/large)
4. Store content in database

**Embedding Pipeline** (`embed/embed-sync.ts`)
1. **Phase 1: Chunking**
   - Split files into overlapping chunks
   - Default: 1500 chars, 200 char overlap
   - Skip unchanged files
2. **Phase 2: Embedding**
   - Generate OpenAI embeddings (3072 dims)
   - Batch process for efficiency
   - Store vectors in pgvector

**Weave Discovery**
- **V1** (`weave/finder.ts`): Vector similarity search
- **V2** (`weave/finder-v2.ts`): Ontology-first approach
- **Profiler** (`weave/profiler.ts`): Repository profiling
- **Philosophy** (`weave/philosophy.ts`): Schizosophy matching
- **Glossary** (`weave/glossary.ts`): Soul extraction

### 5.2 Key Files

```
apps/engine/src/
├── cli/
│   ├── index.ts           # All CLI commands
│   └── weave-pair.ts      # Focused pair analysis
├── queue/
│   └── processor.ts       # Job queue worker
├── sync/
│   └── repo-sync.ts       # File sync logic
├── embed/
│   ├── embed-sync.ts      # Embedding pipeline
│   └── chunker.ts         # Chunking algorithm
├── weave/
│   ├── finder.ts          # V1 similarity-based
│   ├── finder-v2.ts       # V2 ontology-first
│   ├── profiler.ts        # Repo profiling
│   ├── matcher.ts         # Capability matching
│   ├── philosophy.ts      # Philosophical profiles
│   ├── glossary.ts        # Glossary extraction
│   ├── similarity.ts      # Vector search
│   └── types/             # Type definitions
└── discord/
    └── service.ts         # Discord notifications
```

---

## 6. Core Features

### 6.1 Repository Sync

**Process:**
1. Authenticate with GitHub App
2. Fetch repository tree (file list + SHAs)
3. For each file:
   - Skip if SHA unchanged (delta sync)
   - Skip if binary, too large, or excluded path
   - Fetch content from GitHub
   - Detect language, count lines
   - Store in database

**Skip Reasons:**
- `binary` - Non-text file
- `too_large` - Exceeds size limit
- `excluded_path` - node_modules, .git, etc.
- `generated` - Auto-generated files

### 6.2 Chunking & Embeddings

**Chunking Strategy:**
- Character-based (not token-based)
- 1500 char chunks with 200 char overlap
- Prevents re-chunking if file unchanged
- Estimates token count (~4 chars/token)

**Embedding:**
- Model: `text-embedding-3-large`
- Dimensions: 3072
- Stored in pgvector for similarity search
- Batch processing for efficiency

### 6.3 Weave Types

| Type | Description | Discovery Method |
|------|-------------|------------------|
| `integration_opportunity` | Similar code that could be shared | Vector similarity + LLM |
| `shared_module` | Same thing built separately | Vector similarity |
| `philosophical_alignment` | Shared worldview/approach | Philosophical profiling |
| `glossary_alignment` | Shared vocabulary & beliefs | Glossary extraction |
| `shared_dependency` | Common dependencies | Package analysis |
| `api_compatibility` | Compatible APIs | Schema analysis |
| `refactor_candidate` | Code needing consolidation | Similarity analysis |

### 6.4 Glossary Extraction

Extracts a repository's "soul" using LLM analysis:

**Dimensions:**
1. **Terms** - Vocabulary with emotional valence (positive, negative, neutral, sacred, profane)
2. **Empirics** - What it measures, considers evidence, claims as truth
3. **Psychology** - Fears, confidences, defenses, attachments, blind spots
4. **Poetics** - Metaphors, naming patterns, aesthetic, rhythm, voice
5. **Philosophy** - Beliefs, assumptions, virtues, epistemology, ontology, teleology
6. **Resentments** - What it hates, defines against, allergies, warnings, enemies
7. **Future Vision** - Historian's prediction from year 2500

### 6.5 Philosophical Matching (Schizosophy)

Matches repositories at the worldview level:

| Dimension | Options |
|-----------|---------|
| Epistemology | empirical, formal, pragmatic, constructive |
| Antagonist | complexity, inconsistency, ambiguity, rigidity, entropy |
| Cognitive Transform | reveals, enforces, generates, validates, measures |
| Temporality | prevents, detects, corrects, documents |
| Abstraction Level | data, pattern, architecture, philosophy |

**Match Types:**
- Same antagonist + different approach = "vertical alignment"
- Same cognitive transform = complementary tools
- Same epistemology = kindred spirits

---

## 7. Data Flow Pipeline

```
┌─────────────────┐
│ GitHub Repository │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                        SYNC JOB                              │
│  1. Fetch tree (file list with SHAs)                        │
│  2. Delta sync (skip unchanged files)                       │
│  3. Fetch content (skip binary/large)                       │
│  4. Detect language, count LOC                              │
│  5. Store File records                                       │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                   CHUNK JOB - Phase 1                        │
│  1. Get all files with content                              │
│  2. Split into overlapping chunks (1500 chars, 200 overlap) │
│  3. Skip re-chunking if SHA unchanged                       │
│  4. Store Chunk records                                      │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                   CHUNK JOB - Phase 2                        │
│  1. Batch chunks to OpenAI                                  │
│  2. Get 3072-dimensional vectors                            │
│  3. Store in pgvector                                       │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    WEAVE DISCOVERY                           │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ V1: Similarity-Based                                 │    │
│  │  1. Vector search across repo pairs                 │    │
│  │  2. Find similar chunks (cosine distance)           │    │
│  │  3. Aggregate by file pairs                         │    │
│  │  4. LLM validates integration opportunities         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ V2: Ontology-First                                   │    │
│  │  1. Profile repos (capabilities, artifacts, roles)  │    │
│  │  2. Capability-need matching                        │    │
│  │  3. LLM validates opportunities                     │    │
│  │  4. Extract philosophical profiles                  │    │
│  │  5. Schizosophy matching                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Glossary-Based                                       │    │
│  │  1. Extract glossary for each repo                  │    │
│  │  2. Compare vocabulary, beliefs, resentments        │    │
│  │  3. Score alignment                                 │    │
│  └─────────────────────────────────────────────────────┘    │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                      WEAVES IN DB                            │
│  • Type: integration_opportunity, philosophical_alignment    │
│  • Score: similarity or confidence (0.0 - 1.0)              │
│  • Metadata: file pairs, chunk matches, profiles            │
│  • Can be dismissed or commented                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Key Algorithms

### 8.1 Vector Similarity Search (pgvector)

```sql
WITH source_chunks AS (
  SELECT c.id, c.embedding, c.content, f.path
  FROM chunks c
  JOIN files f ON c."fileId" = f.id
  WHERE f."repoId" = $sourceRepoId
    AND c.embedding IS NOT NULL
)
SELECT
  sc.id as source_chunk_id,
  sc.path as source_path,
  tc.id as target_chunk_id,
  tf.path as target_path,
  1 - (sc.embedding <=> tc.embedding) as similarity
FROM source_chunks sc
CROSS JOIN LATERAL (
  SELECT c.id, c.embedding, c."fileId"
  FROM chunks c
  JOIN files f ON c."fileId" = f.id
  WHERE f."repoId" = $targetRepoId
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> sc.embedding
  LIMIT 5
) tc
JOIN files tf ON tc."fileId" = tf.id
WHERE 1 - (sc.embedding <=> tc.embedding) > $threshold
ORDER BY similarity DESC
LIMIT $maxPairs
```

**Key Points:**
- `<=>` is pgvector's cosine distance operator
- LATERAL JOIN for efficient top-k per source chunk
- Similarity = 1 - distance

### 8.2 File Pair Aggregation

```typescript
function aggregateByFilePairs(chunks: ChunkMatch[]): FilePair[] {
  // Group by (sourcePath, targetPath)
  const pairs = groupBy(chunks, c => `${c.sourcePath}|${c.targetPath}`)

  return pairs
    .map(group => ({
      sourcePath: group[0].sourcePath,
      targetPath: group[0].targetPath,
      matchCount: group.length,
      avgSimilarity: mean(group.map(c => c.similarity)),
      samples: group.slice(0, 3)
    }))
    .filter(p => p.matchCount >= minMatchingChunks)
    .filter(p => p.avgSimilarity >= minFilePairSimilarity)
    .sort((a, b) => b.avgSimilarity - a.avgSimilarity)
    .slice(0, maxFilePairs)
}
```

### 8.3 Repository Profiling

```typescript
interface RepoProfile {
  repoId: string
  name: string
  fullName: string
  purpose: string                    // What it does
  capabilities: Capability[]         // analyzes, generates, validates...
  artifacts: {
    produces: Artifact[]             // components, schemas, reports...
    consumes: Artifact[]
  }
  domains: Domain[]                  // llm_tooling, web_apps, ci_cd...
  roles: Role[]                      // producer, consumer, orchestrator...
  keywords: string[]
  problemsSolved: string[]
  targetUsers: string[]
  confidence: number
}
```

### 8.4 Philosophical Matching

```typescript
interface PhilosophicalProfile {
  repoId: string
  epistemology: 'empirical' | 'formal' | 'pragmatic' | 'constructive'
  antagonist: 'complexity' | 'inconsistency' | 'ambiguity' | 'rigidity' | 'entropy'
  cognitiveTransform: 'reveals' | 'enforces' | 'generates' | 'validates' | 'measures'
  temporality: 'prevents' | 'detects' | 'corrects' | 'documents'
  abstractionLevel: 'data' | 'pattern' | 'architecture' | 'philosophy'
  philosophyStatement: string
  coreVirtue: string
  confidence: number
}

function matchPhilosophies(a: PhilosophicalProfile, b: PhilosophicalProfile): number {
  let score = 0
  if (a.epistemology === b.epistemology) score += 0.2
  if (a.antagonist === b.antagonist) score += 0.3      // Same enemy = strong match
  if (a.cognitiveTransform === b.cognitiveTransform) score += 0.2
  if (a.abstractionLevel !== b.abstractionLevel) score += 0.2  // Different levels = complementary
  return score
}
```

### 8.5 Glossary Alignment Scoring

```typescript
function scoreGlossaryAlignment(a: Glossary, b: Glossary): number {
  const vocabularyScore = jaccardSimilarity(a.terms, b.terms) * 0.3
  const resentmentScore = jaccardSimilarity(a.resentments.hates, b.resentments.hates) * 0.2
  const philosophyScore = comparePhilosophies(a.philosophy, b.philosophy) * 0.25
  const poeticsScore = comparePoetics(a.poetics, b.poetics) * 0.15
  const psychologyScore = comparePsychology(a.psychology, b.psychology) * 0.1

  return vocabularyScore + resentmentScore + philosophyScore + poeticsScore + psychologyScore
}
```

---

## 9. API Reference

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/[...nextauth]` | ALL | NextAuth handler |
| `/api/github/app-callback` | POST | GitHub App installation callback |
| `/api/github/organizations` | GET | List user's GitHub orgs |
| `/api/github/repositories` | GET | List available repos |

### Plexus Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/plexus` | POST | Create new plexus |
| `/api/plexus/[id]/repositories` | GET | List repos in plexus |
| `/api/plexus/[id]/repositories` | POST | Add repo to plexus |
| `/api/plexus/[id]/repositories/[repoId]` | GET | Get repo details |
| `/api/plexus/[id]/repositories/[repoId]` | DELETE | Remove repo |
| `/api/plexus/[id]/repositories/[repoId]/sync` | POST | Trigger file sync |
| `/api/plexus/[id]/repositories/[repoId]/sync` | GET | Get sync status |
| `/api/plexus/[id]/repositories/[repoId]/embed` | POST | Trigger embedding |
| `/api/plexus/[id]/members` | GET/POST | Manage members |

### Utilities

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pusher/auth` | POST | Pusher channel auth |
| `/api/users/search` | GET | Search users |

---

## 10. CLI Reference

Run from `apps/engine`:

### Sync Commands

```bash
# Trigger sync
npx tsx src/cli/index.ts sync --repo-id <id>
npx tsx src/cli/index.ts sync --repo-id <id> --immediate
npx tsx src/cli/index.ts sync --repo-id <id> --wait

# Check status
npx tsx src/cli/index.ts status --job-id <id>
npx tsx src/cli/index.ts jobs --status PENDING
npx tsx src/cli/index.ts jobs --repo-id <id>

# Reset stuck jobs
npx tsx src/cli/index.ts reset --all
npx tsx src/cli/index.ts reset --repo-id <id>
```

### Embed Commands

```bash
# Generate embeddings
npx tsx src/cli/index.ts embed --repo-id <id>
npx tsx src/cli/index.ts embed-status --job-id <id>
npx tsx src/cli/index.ts embed-jobs --status EMBEDDING
npx tsx src/cli/index.ts embed-reset --all
```

### Weave Discovery

```bash
# Find weaves (v1 - similarity)
npx tsx src/cli/index.ts find-weaves --plexus-id <id> --threshold 0.85

# Find weaves (v2 - ontology)
npx tsx src/cli/index.ts find-weaves-v2 --plexus-id <id> --min-confidence 0.6

# Profile repo
npx tsx src/cli/index.ts profile-repo --repo-id <id>

# View results
npx tsx src/cli/index.ts weaves --plexus-id <id>
npx tsx src/cli/index.ts discovery-runs --plexus-id <id>
npx tsx src/cli/index.ts discovery-run --run-id <id>
```

### Glossary

```bash
# Extract glossary
npx tsx src/cli/index.ts extract-glossary --repo-id <id>
npx tsx src/cli/index.ts extract-glossary --plexus-id <id>

# View glossary
npx tsx src/cli/index.ts glossary --repo-id <id>
```

### Utilities

```bash
npx tsx src/cli/index.ts worker          # Start queue worker
npx tsx src/cli/index.ts repos           # List all repos
npx tsx src/cli/index.ts plexuses        # List all plexuses
npx tsx src/cli/index.ts daily --plexus-id <id>  # Full pipeline
```

---

## 11. Packages

| Package | Purpose |
|---------|---------|
| `@symploke/ai` | OpenAI embeddings & completions |
| `@symploke/db` | Prisma schema & client |
| `@symploke/api` | Shared API schemas & helpers |
| `@symploke/types` | TypeScript type definitions |
| `@symploke/ui` | Base UI components (unstyled) |
| `@symploke/logger` | Structured JSON logging |
| `@symploke/env` | Environment variable validation |
| `@symploke/errors` | Error handling utilities |
| `@symploke/utils` | Helper functions (cn, etc.) |
| `@symploke/config` | Biome configuration |
| `@symploke/tailwind-config` | Tailwind setup |
| `@symploke/tsconfig` | TypeScript configs |
| `@symploke/test` | Test utilities |

---

## 12. Deployment

### Web Application (Vercel)

- Deployed from `main` branch
- Environment variables in Vercel dashboard
- Database: Neon Postgres
- Production URL: symploke.dev

### Engine Service (Railway)

- Separate deployment
- Continuous worker process
- Recovers stuck jobs on startup
- Health check: `/health`

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
AUTH_SECRET=...
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...

# GitHub App
GITHUB_APP_ID=...
GITHUB_APP_PRIVATE_KEY=...
GITHUB_APP_CLIENT_ID=...
GITHUB_APP_CLIENT_SECRET=...

# OpenAI
OPENAI_API_KEY=...

# Pusher
PUSHER_APP_ID=...
PUSHER_KEY=...
PUSHER_SECRET=...
PUSHER_CLUSTER=...
```

---

## Summary

Symploke is a sophisticated multi-layer discovery engine that finds meaningful connections between repositories through:

1. **Functional Analysis** - Vector similarity on code embeddings
2. **Ontology Matching** - Capability-need alignment
3. **Philosophical Alignment** - Shared worldview and conceptual enemies
4. **Glossary Alignment** - Shared vocabulary, beliefs, and resentments

The system transforms raw code into semantic understanding, enabling teams to discover integration opportunities they never knew existed.

---

*Generated: December 2024*
