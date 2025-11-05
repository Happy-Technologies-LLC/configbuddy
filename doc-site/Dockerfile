# Multi-stage Dockerfile for VitePress documentation site
# Stage 1: Build the static site
FROM node:20-alpine AS builder

# Install git (needed for VitePress last updated timestamps)
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (need dev deps for VitePress build)
RUN npm ci

# Copy source files
COPY docs ./docs

# Build the static site
RUN npm run docs:build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from builder stage
COPY --from=builder /app/docs/.vitepress/dist /usr/share/nginx/html

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Expose port 80
EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
