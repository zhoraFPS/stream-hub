# Multi-stage build for StreamHub
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production image
FROM node:20-alpine
WORKDIR /app

# Install runtime dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built frontend assets & server files
COPY --from=builder /app/dist ./dist
COPY server ./server

# Expose HTTP port
EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/system/info || exit 1

CMD ["node", "server/index.js"]
