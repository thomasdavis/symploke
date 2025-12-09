# Symploke

AI-powered tool that finds connections between team projects.

> *συμπλοκή (symplokē)* — Greek for "interweaving, entanglement"

## How It Works

Symploke automatically keeps your repositories in sync and discovers connections (Weaves) between them.

### Automatic Sync Pipeline

```
Add Repo → File Sync → Chunking → Embeddings → Weave Discovery
```

**1. Repository Added**
- When you add a repo to a Plexus, a sync job is automatically created
- The engine fetches the file tree from GitHub and downloads all text files
- Binary files and common non-code directories (node_modules, .git, etc.) are skipped

**2. Hourly Incremental Sync**
- Every hour, all repos are checked for changes
- Only new or modified files are fetched (compared by SHA)
- Deleted files are removed from the database
- No action needed - this happens automatically in the background

**3. Automatic Embedding**
- After each sync completes, the system checks if files need embedding
- New/modified files are split into semantic chunks
- Each chunk gets a vector embedding via OpenAI
- Embeddings enable semantic search and Weave discovery

**4. Weave Discovery**
- Can be triggered manually via the Dashboard or Weaves page
- Compares all repo pairs using vector similarity
- AI analyzes high-scoring matches to identify integration opportunities
- Discovered Weaves show shared concepts, APIs, and collaboration potential

### What to Expect

| Event | What Happens | Notification |
|-------|--------------|--------------|
| Add a repo | Sync starts immediately | Discord notification when complete |
| Hourly sync (no changes) | Files checked, all skipped | No notification (silent) |
| Hourly sync (changes found) | Only changed files synced + embedded | Discord notification |
| Sync failure | Job marked failed | Discord notification with error |
| Run Weave Discovery | All repo pairs analyzed | Discord notification with results |

### Discord Notifications

Notifications are sent only when something meaningful happens:
- New files synced (not when all files unchanged)
- New embeddings generated
- New Weaves discovered
- Errors or failures

## Tech Stack

- **Monorepo**: Turborepo + pnpm + Changesets
- **Framework**: Next.js 16 App Router
- **Database**: Neon Postgres with Prisma + pgvector
- **Auth**: NextAuth v5 (GitHub OAuth)
- **AI**: Vercel AI SDK
- **Styling**: Tailwind CSS with dark mode
- **UI**: Base UI components
- **Testing**: Vitest + Testing Library
- **Linting**: Biome + ESLint
- **Documentation**: Storybook
- **Git Hooks**: Lefthook

## Getting Started

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm --filter @symploke/db db:generate

# Push database schema (requires DATABASE_URL)
pnpm --filter @symploke/db db:push

# Start development server
pnpm dev
```

## Deployment

**Production URL**: https://symploke.dev

- Deployed on Vercel with automatic deployments from `main` branch
- Environment variables configured in Vercel dashboard
- Database hosted on Neon Postgres

### CLI Access

- **Vercel CLI**: Available for deployment management
- **GitHub CLI**: Available for repository operations

## Project Structure

```
symploke/
├── apps/
│   ├── web/              # Next.js application (Vercel)
│   └── engine/           # Background sync engine (Railway)
├── packages/
│   ├── ai/               # AI SDK integration
│   ├── config/           # Shared Biome config
│   ├── db/               # Prisma schema & client
│   ├── env/              # Environment validation
│   ├── errors/           # Error utilities
│   ├── eslint-config/    # ESLint config
│   ├── logger/           # Logging utilities
│   ├── storybook/        # Component documentation
│   ├── tailwind-config/  # Shared Tailwind config
│   ├── test/             # Vitest config
│   ├── tsconfig/         # Shared TypeScript configs
│   ├── types/            # Shared TypeScript types
│   ├── ui/               # UI components
│   └── utils/            # Utility functions
└── turbo.json
```

### Engine Service

The engine (`apps/engine`) runs as a separate service that handles:
- File sync queue processing
- Chunking and embedding generation
- Hourly sync scheduling
- Discord notifications

It exposes HTTP endpoints for triggering syncs and checking status.

## Scripts

- `pnpm dev` - Start development servers
- `pnpm build` - Build all packages and apps
- `pnpm test` - Run tests
- `pnpm lint` - Lint all packages
- `pnpm format` - Format all files
- `pnpm type-check` - Type check all packages

## Architecture Principles

### No Barrel Exports

Components are imported directly:

```typescript
// ✅ Correct
import { Button } from '@symploke/ui/Button/Button'

// ❌ Not allowed
import { Button } from '@symploke/ui'
```

### Module Boundaries

ESLint enforces strict module boundaries:
- Apps can only import from published packages
- Packages cannot import from apps
- UI package stays dependency-free

## License

MIT
