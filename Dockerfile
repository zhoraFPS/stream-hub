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

# Install runtime dependencies including openssl for SSL TLS
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --only=production

# Copy built frontend assets & server files
COPY --from=builder /app/dist ./dist
COPY server ./server

# Pre-generate valid SSL certificates for HTTPS
RUN mkdir -p server/certs && \
    openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout server/certs/server.key \
    -out server/certs/server.crt \
    -days 3650 -subj "/CN=StreamHub"

# Expose HTTP and HTTPS ports
EXPOSE 5000
EXPOSE 5443

ENV PORT=5000
ENV HTTPS_PORT=5443
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/system/info || exit 1

CMD ["node", "server/index.js"]
