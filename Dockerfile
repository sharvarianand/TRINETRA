# syntax=docker/dockerfile:1

# ================================
# Base stage - shared dependencies
# ================================
FROM node:20-alpine AS base

# Install libc6-compat for Alpine compatibility
RUN apk add --no-cache libc6-compat

WORKDIR /app

# ================================
# Dependencies stage
# ================================
FROM base AS deps

# Copy package files
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* bun.lock* ./

# Install dependencies based on lockfile
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  elif [ -f bun.lock ]; then npm install -g bun && bun install --frozen-lockfile; \
  else echo "No lockfile found." && npm install; \
  fi

# ================================
# Builder stage - build the app
# ================================
FROM base AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build arguments for environment variables needed at build time
ARG NEXT_PUBLIC_PYTHON_SERVER_URL
ENV NEXT_PUBLIC_PYTHON_SERVER_URL=$NEXT_PUBLIC_PYTHON_SERVER_URL

# Build the application
RUN npm run build

# ================================
# Production runner stage
# ================================
FROM base AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy the standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose the port Cloud Run expects
EXPOSE 8080

# Set the port environment variable for Cloud Run
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Start the server
CMD ["node", "server.js"]
