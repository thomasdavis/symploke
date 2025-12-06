# Railway Engine Deployment Debug

## Current Problem

The `@symploke/engine` service fails to start on Railway with the error:

```
Fatal error: Unknown file extension ".ts" for /app/packages/logger/src/index.ts
```

The health check server starts successfully (port 8080), but when the app tries to dynamically import `@symploke/logger`, it fails because Node.js is trying to load the TypeScript source file instead of the compiled JavaScript.

## Root Cause

The `@symploke/logger` package's `package.json` has its `main` or `exports` field pointing to the TypeScript source (`src/index.ts`) instead of the compiled JavaScript output (`dist/index.js`).

When the engine runs `await import('@symploke/logger')`, Node.js resolves it to the `.ts` file, which it can't execute without a TypeScript runtime like `tsx`.

## Architecture

```
symploke/
├── apps/
│   └── engine/           # The service we're deploying
│       ├── src/
│       │   └── index.ts  # Entry point
│       ├── dist/         # Compiled JS output
│       │   └── index.js
│       ├── package.json
│       └── Dockerfile
├── packages/
│   ├── logger/           # Workspace package
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── dist/         # Should contain compiled JS
│   │   │   └── index.js
│   │   └── package.json  # <-- Problem likely here
│   ├── db/               # Prisma database package
│   └── tsconfig/         # Shared TypeScript config
├── package.json          # Root workspace config
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

## Dockerfile (Current)

```dockerfile
FROM node:20-slim

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all package.json files for workspace
COPY apps/engine/package.json ./apps/engine/
COPY packages/db/package.json ./packages/db/
COPY packages/logger/package.json ./packages/logger/
COPY packages/tsconfig/package.json ./packages/tsconfig/

# Copy Prisma schema before install (needed for postinstall script)
COPY packages/db/prisma ./packages/db/prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/tsconfig ./packages/tsconfig
COPY packages/logger ./packages/logger
COPY packages/db ./packages/db
COPY apps/engine ./apps/engine

# Generate Prisma client
RUN pnpm --filter @symploke/db db:generate

# Build the packages and engine
RUN pnpm --filter @symploke/logger build
RUN pnpm --filter @symploke/db build
RUN pnpm --filter @symploke/engine build

ENV NODE_ENV=production

WORKDIR /app/apps/engine

CMD ["node", "dist/index.js"]
```

## What We Need to Fix

1. **Check `packages/logger/package.json`** - Ensure the `main`, `module`, and/or `exports` fields point to `dist/index.js` not `src/index.ts`

2. **Check `packages/db/package.json`** - Same issue may exist here

3. **Verify the build output** - Ensure `pnpm --filter @symploke/logger build` actually produces `dist/index.js`

## Expected package.json Structure

The `packages/logger/package.json` should look something like:

```json
{
  "name": "@symploke/logger",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "scripts": {
    "build": "tsc"
  }
}
```

**NOT** like this (which would cause the error):

```json
{
  "name": "@symploke/logger",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

## Build Logs Show Success

The Dockerfile runs these commands which appear to succeed:
- `pnpm --filter @symploke/logger build`
- `pnpm --filter @symploke/db build`
- `pnpm --filter @symploke/engine build`

But at runtime, Node.js is still resolving to `.ts` files.

## Engine Entry Point

The engine's `src/index.ts` starts a health check server immediately, then dynamically imports dependencies:

```typescript
import http from 'node:http'

// Health server starts first (works!)
const healthServer = http.createServer(...)
healthServer.listen(PORT)

async function main() {
  // These dynamic imports fail because they resolve to .ts files
  const { logger } = await import('@symploke/logger')
  const { getQueueProcessor } = await import('./queue/processor.js')
  // ...
}

main().catch((error) => {
  // This is where "Fatal error: Unknown file extension .ts" gets logged
})
```

## Questions to Answer

1. What does `packages/logger/package.json` look like? Specifically the `main`, `module`, and `exports` fields?

2. Does `packages/logger/dist/index.js` exist after the build step in Docker?

3. Is there a `tsconfig.json` in `packages/logger/` that specifies the output directory?

4. Are there any conditional exports that might be selecting `.ts` over `.js` based on environment?

## Possible Solutions

### Solution 1: Fix package.json exports
Update `packages/logger/package.json` to point to compiled output:
```json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  }
}
```

### Solution 2: Add explicit file extensions
If using TypeScript project references or custom resolution, ensure imports resolve to `.js` files.

### Solution 3: Bundle the engine
Use a bundler (esbuild, tsup) to bundle all dependencies into a single file, eliminating the need for workspace package resolution at runtime.

### Solution 4: Use tsx in production
Install `tsx` and run `tsx dist/index.js` instead of `node dist/index.js` (not recommended for production).

## Environment

- Node.js: v20.19.6
- pnpm: 9.14.2
- TypeScript: (check version)
- Deployment: Railway
- Package type: ESM (`"type": "module"`)
