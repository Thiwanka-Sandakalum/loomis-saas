### --- Builder Stage ---
FROM node:22-alpine AS builder
WORKDIR /app

# Install all dependencies (including dev) for build
COPY package.json package-lock.json ./
RUN npm install

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build || npx tsc


### --- Production Stage ---
FROM node:22-alpine AS production
WORKDIR /app

# Only copy production node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

# Copy built output and required files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.example ./
# Optionally copy .env if present (uncomment if you want to bake in envs)
# COPY --from=builder /app/.env ./
COPY --from=builder /app/openapi.yaml ./

# Use non-root user for security
RUN addgroup -g 1001 appgroup && adduser -D -u 1001 -G appgroup appuser
USER appuser


# Start API server (Cloud Run sets $PORT)
CMD ["npm", "run", "api"]
