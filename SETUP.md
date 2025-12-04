# Symploke Setup Guide

## ✅ Completed Setup

The entire Symploke monorepo has been successfully scaffolded and built with **~90 files** across:

### Root Configuration (8 files)
- `.gitignore` - Git ignore patterns
- `pnpm-workspace.yaml` - Workspace configuration
- `.npmrc` - pnpm configuration
- `package.json` - Root package with scripts
- `turbo.json` - Turborepo configuration
- `lefthook.yml` - Git hooks configuration
- `biome.json` - Root Biome config
- `.github/workflows/ci.yml` - CI/CD workflow
- `README.md` - Project documentation

### Configuration Packages (5 packages)
1. **@symploke/tsconfig** - TypeScript configurations (base, nextjs, react-library)
2. **@symploke/config** - Biome configuration
3. **@symploke/eslint-config** - ESLint with module boundary rules
4. **@symploke/tailwind-config** - Tailwind theme configuration
5. **@symploke/test** - Vitest configuration

### Core Packages (5 packages)
1. **@symploke/types** - Zod schemas and TypeScript types (with tests)
2. **@symploke/utils** - Utility functions (cn, format) (with tests)
3. **@symploke/env** - Environment validation with Zod
4. **@symploke/errors** - Custom error classes
5. **@symploke/logger** - Pino logger

### Application Packages (4 packages)
1. **@symploke/db** - Prisma client with complete schema (Users, Teams, Repos, Files, Embeddings)
2. **@symploke/ui** - Base UI components (Button, Card) (with tests and Storybook stories)
3. **@symploke/ai** - AI SDK embeddings integration
4. **@symploke/storybook** - Storybook configuration

### Applications (1 app)
1. **@symploke/web** - Next.js 16 App Router with:
   - NextAuth v5 integration
   - TanStack Query setup
   - Theme provider (dark mode)
   - Example homepage with UI components
   - API route for authentication

**Total: 15 packages + 1 app = 16 workspace projects**

## ✅ Installation Complete

All dependencies installed successfully (640 packages) with Node.js 22.21.1.

### Build Status
✅ All packages built successfully
✅ TypeScript compilation passed
✅ Storybook 10.1.4 configured
✅ Tailwind v4 with PostCSS plugin
✅ Next.js 16 with Turbopack
✅ Prisma 6.19.0 client generated

## 📋 Next Steps

### 1. Set Up Environment Variables
```bash
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env` with your actual values:
- `DATABASE_URL` - Neon Postgres connection string
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET` - From GitHub OAuth app
- `OPENAI_API_KEY` - From OpenAI dashboard

### 2. Push Database Schema
```bash
pnpm --filter @symploke/db db:push
```

### 3. Start Development
```bash
# Start Next.js dev server
pnpm --filter @symploke/web dev

# Or start all dev servers
pnpm dev
```

### 4. Run Storybook (Optional)
```bash
pnpm --filter @symploke/storybook storybook
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Type check all packages
pnpm type-check

# Lint all packages
pnpm lint

# Format all files
pnpm format
```

## 🏗️ Architecture Highlights

### No Barrel Exports
All imports are direct:
```typescript
// ✅ Correct
import { Button } from '@symploke/ui/Button/Button'
import { cn } from '@symploke/utils/cn'

// ❌ Not allowed (enforced by ESLint)
import { Button } from '@symploke/ui'
```

### Module Boundaries
ESLint enforces:
- Apps can only import from published packages
- Packages cannot import from apps
- UI package stays dependency-free (React + Base UI only)

### Testing First
- Vitest for unit tests
- Testing Library for React components
- Tests co-located with source files
- MSW for API mocking (configured in @symploke/mocks)

### Base UI Components
Using `@base-ui-components/react` instead of Radix UI for:
- Better accessibility
- Smaller bundle size
- Modern React patterns

## 📦 Package Scripts

```bash
# Development
pnpm dev              # Start all dev servers
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Lint all packages
pnpm type-check       # Type check all packages
pnpm format           # Format with Biome

# Database
pnpm --filter @symploke/db db:generate  # Generate Prisma client
pnpm --filter @symploke/db db:push      # Push schema to database
pnpm --filter @symploke/db db:studio    # Open Prisma Studio

# Changesets (versioning)
pnpm changeset                # Create changeset
pnpm version-packages         # Version packages
pnpm publish-packages         # Publish to npm

# Storybook
pnpm --filter @symploke/storybook storybook  # Start Storybook
```

## 🚀 External Services Required

### Neon Database
1. Create project at https://neon.tech
2. Enable pgvector extension
3. Copy connection string to `DATABASE_URL`

### GitHub OAuth
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create new OAuth app
3. Set callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy credentials to `.env`

### OpenAI API
1. Get API key from https://platform.openai.com
2. Add to `OPENAI_API_KEY` in `.env`

## 🎯 Success Criteria

Once installation completes:

✅ All packages build without errors
✅ All tests pass
✅ ESLint enforces module boundaries
✅ No barrel exports (verified by ESLint)
✅ Next.js dev server runs on localhost:3000
✅ Storybook runs on localhost:6006
✅ Lefthook pre-commit hooks work
✅ CI pipeline is configured

## 📚 Additional Resources

- [Turborepo Docs](https://turbo.build/repo/docs)
- [Base UI Docs](https://base-ui.com/react/overview/quick-start)
- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js 16 Docs](https://nextjs.org/docs)
- [NextAuth v5 Docs](https://authjs.dev)

## 🐛 Troubleshooting

### "Cannot find module '@prisma/client'"
Run: `pnpm --filter @symploke/db db:generate`

### "Module not found: Can't resolve '@symploke/...'"
Run: `pnpm build` to build all packages

### "Biome formatting errors"
Run: `pnpm format`

### "ESLint module boundary violations"
Check that imports follow the no-barrel-exports rule

### Lefthook not running
Run: `lefthook install` to set up git hooks
