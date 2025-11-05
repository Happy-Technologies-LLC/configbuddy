#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "CMDB Platform - Development Setup"
echo "========================================"
echo ""

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js
echo "Checking prerequisites..."
echo ""

if command_exists node; then
    NODE_VERSION=$(node --version)
    print_success "Node.js is installed: $NODE_VERSION"

    # Check if Node version is >= 18
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -lt 18 ]; then
        print_error "Node.js version must be >= 18.x"
        exit 1
    fi
else
    print_error "Node.js is not installed. Please install Node.js >= 18.x"
    exit 1
fi

# Check pnpm
if command_exists pnpm; then
    PNPM_VERSION=$(pnpm --version)
    print_success "pnpm is installed: $PNPM_VERSION"
else
    print_error "pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
    print_success "pnpm installed successfully"
fi

# Check Docker
if command_exists docker; then
    DOCKER_VERSION=$(docker --version)
    print_success "Docker is installed: $DOCKER_VERSION"

    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    print_success "Docker daemon is running"
else
    print_error "Docker is not installed. Please install Docker Desktop"
    exit 1
fi

# Check Docker Compose
if command_exists docker-compose; then
    COMPOSE_VERSION=$(docker-compose --version)
    print_success "Docker Compose is installed: $COMPOSE_VERSION"
elif docker compose version >/dev/null 2>&1; then
    COMPOSE_VERSION=$(docker compose version)
    print_success "Docker Compose (plugin) is installed: $COMPOSE_VERSION"
else
    print_error "Docker Compose is not installed"
    exit 1
fi

echo ""
echo "========================================"
echo "Installing dependencies..."
echo "========================================"
echo ""

# Install dependencies
pnpm install
print_success "Dependencies installed"

echo ""
echo "========================================"
echo "Setting up environment..."
echo "========================================"
echo ""

# Copy .env.example to .env if it doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        print_success "Created .env file from .env.example"
        print_info "Please review and update .env with your configuration"
    else
        print_info ".env.example not found, skipping .env creation"
    fi
else
    print_info ".env file already exists, skipping"
fi

echo ""
echo "========================================"
echo "Starting Docker services..."
echo "========================================"
echo ""

# Start Docker services
if [ -f docker-compose.yml ]; then
    # Use docker compose (v2) if available, otherwise docker-compose (v1)
    if docker compose version >/dev/null 2>&1; then
        docker compose up -d
    else
        docker-compose up -d
    fi
    print_success "Docker services started"
else
    print_info "docker-compose.yml not found, skipping Docker services"
fi

echo ""
echo "========================================"
echo "Waiting for services to be ready..."
echo "========================================"
echo ""

# Wait for PostgreSQL
print_info "Waiting for PostgreSQL..."
POSTGRES_READY=0
for i in {1..30}; do
    if docker exec -it $(docker ps -qf "name=postgres") pg_isready -U postgres >/dev/null 2>&1; then
        POSTGRES_READY=1
        break
    fi
    sleep 1
done

if [ $POSTGRES_READY -eq 1 ]; then
    print_success "PostgreSQL is ready"
else
    print_error "PostgreSQL failed to start"
fi

# Wait for Neo4j
print_info "Waiting for Neo4j..."
NEO4J_READY=0
for i in {1..30}; do
    if curl -s http://localhost:7474 >/dev/null 2>&1; then
        NEO4J_READY=1
        break
    fi
    sleep 1
done

if [ $NEO4J_READY -eq 1 ]; then
    print_success "Neo4j is ready"
else
    print_error "Neo4j failed to start"
fi

# Wait for Redis
print_info "Waiting for Redis..."
REDIS_READY=0
for i in {1..30}; do
    if docker exec -it $(docker ps -qf "name=redis") redis-cli ping >/dev/null 2>&1; then
        REDIS_READY=1
        break
    fi
    sleep 1
done

if [ $REDIS_READY -eq 1 ]; then
    print_success "Redis is ready"
else
    print_error "Redis failed to start"
fi

echo ""
echo "========================================"
echo "Initializing databases..."
echo "========================================"
echo ""

# Run database initialization
if [ -f scripts/db-init.sh ]; then
    bash scripts/db-init.sh
else
    print_info "db-init.sh not found, skipping database initialization"
fi

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
print_success "Development environment is ready"
echo ""
echo "Next steps:"
echo "  1. Review and update .env file if needed"
echo "  2. Run 'pnpm dev' to start development servers"
echo "  3. Run 'pnpm test' to run tests"
echo ""
echo "Service URLs:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Neo4j Browser: http://localhost:7474"
echo "  - Redis: localhost:6379"
echo ""
