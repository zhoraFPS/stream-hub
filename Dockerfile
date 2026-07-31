# Multi-stage build for StreamHub
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production image
FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --only=production

# Copy built frontend assets & server files
COPY --from=builder /app/dist ./dist
COPY server ./server

# Expose HTTP (5000), HTTPS (5443)
EXPOSE 5000
EXPOSE 5443

ENV PORT=5000
ENV HTTPS_PORT=5443
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/system/info || exit 1

CMD ["node", "server/index.js"]
