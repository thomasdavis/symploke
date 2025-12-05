FROM node:20-slim AS base

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

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/tsconfig ./packages/tsconfig
COPY packages/logger ./packages/logger
COPY packages/db ./packages/db
COPY apps/engine ./apps/engine

# Generate Prisma client
RUN pnpm --filter @symploke/db db:generate

# Build the engine
RUN pnpm --filter @symploke/engine build

# Production stage
FROM node:20-slim AS production

RUN corepack enable && corepack prepare pnpm@9.14.2 --activate
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built artifacts and node_modules
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/engine/dist ./apps/engine/dist
COPY --from=base /app/apps/engine/package.json ./apps/engine/
COPY --from=base /app/packages ./packages
COPY --from=base /app/package.json ./
COPY --from=base /app/pnpm-workspace.yaml ./

ENV NODE_ENV=production

CMD ["node", "apps/engine/dist/index.js"]
