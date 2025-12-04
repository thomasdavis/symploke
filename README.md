# Symploke

AI-powered tool that finds connections between team projects.

> *συμπλοκή (symplokē)* — Greek for "interweaving, entanglement"

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

# Start development server
pnpm dev
```

## Project Structure

```
symploke/
├── apps/
│   └── web/              # Next.js application
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
