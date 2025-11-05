#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "CMDB Platform - Clean Build Artifacts"
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

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Parse command line arguments
CLEAN_DOCKER=false
CLEAN_NODE_MODULES=false
DEEP_CLEAN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --docker)
            CLEAN_DOCKER=true
            shift
            ;;
        --node-modules)
            CLEAN_NODE_MODULES=true
            shift
            ;;
        --deep)
            DEEP_CLEAN=true
            CLEAN_DOCKER=true
            CLEAN_NODE_MODULES=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --docker          Clean Docker volumes and containers"
            echo "  --node-modules    Remove all node_modules directories"
            echo "  --deep            Deep clean (includes --docker and --node-modules)"
            echo "  -h, --help        Show this help message"
            echo ""
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Show what will be cleaned
echo "Cleaning configuration:"
if [ "$DEEP_CLEAN" = true ]; then
    echo "  Mode: DEEP CLEAN (everything)"
else
    echo "  Build artifacts: YES"
    echo "  node_modules: $([ "$CLEAN_NODE_MODULES" = true ] && echo "YES" || echo "NO")"
    echo "  Docker: $([ "$CLEAN_DOCKER" = true ] && echo "YES" || echo "NO")"
fi
echo ""

if [ "$CLEAN_DOCKER" = true ]; then
    print_warning "Docker volumes will be cleaned - all database data will be lost!"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cleaning cancelled"
        exit 0
    fi
fi

echo "========================================"
echo "Cleaning build artifacts..."
echo "========================================"
echo ""

# Find and remove dist directories
print_info "Removing dist directories..."
find . -name "dist" -type d -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
print_success "Removed dist directories"

# Find and remove build directories
print_info "Removing build directories..."
find . -name "build" -type d -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
print_success "Removed build directories"

# Find and remove .turbo cache
print_info "Removing Turbo cache..."
find . -name ".turbo" -type d -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
print_success "Removed Turbo cache"

# Remove .next directories
print_info "Removing Next.js cache..."
find . -name ".next" -type d -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
print_success "Removed Next.js cache"

# Remove coverage directories
print_info "Removing coverage reports..."
find . -name "coverage" -type d -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
find . -name ".nyc_output" -type d -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
print_success "Removed coverage reports"

# Remove TypeScript build info
print_info "Removing TypeScript build info..."
find . -name "*.tsbuildinfo" -type f -not -path "*/node_modules/*" -delete 2>/dev/null || true
print_success "Removed TypeScript build info"

# Remove log files
print_info "Removing log files..."
find . -name "*.log" -type f -not -path "*/node_modules/*" -delete 2>/dev/null || true
print_success "Removed log files"

# Clean node_modules if requested
if [ "$CLEAN_NODE_MODULES" = true ]; then
    echo ""
    echo "========================================"
    echo "Cleaning node_modules..."
    echo "========================================"
    echo ""

    print_info "Removing node_modules directories..."
    find . -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true
    print_success "Removed node_modules directories"

    print_info "Removing pnpm lock file..."
    rm -f pnpm-lock.yaml
    print_success "Removed pnpm lock file"
fi

# Clean Docker if requested
if [ "$CLEAN_DOCKER" = true ]; then
    echo ""
    echo "========================================"
    echo "Cleaning Docker resources..."
    echo "========================================"
    echo ""

    if command -v docker >/dev/null 2>&1; then
        # Stop containers
        if [ -f docker-compose.yml ]; then
            print_info "Stopping Docker containers..."
            if docker compose version >/dev/null 2>&1; then
                docker compose down
            else
                docker-compose down
            fi
            print_success "Stopped Docker containers"
        fi

        # Remove volumes
        print_info "Removing Docker volumes..."
        if docker compose version >/dev/null 2>&1; then
            docker compose down -v 2>/dev/null || true
        else
            docker-compose down -v 2>/dev/null || true
        fi
        print_success "Removed Docker volumes"

        # Prune system (optional, be careful)
        print_info "Pruning Docker system..."
        docker system prune -f >/dev/null 2>&1 || true
        print_success "Pruned Docker system"
    else
        print_info "Docker not found, skipping Docker cleanup"
    fi
fi

echo ""
echo "========================================"
echo "Clean Complete!"
echo "========================================"
echo ""
print_success "All specified artifacts have been cleaned"

if [ "$CLEAN_NODE_MODULES" = true ]; then
    echo ""
    print_info "Run 'pnpm install' to reinstall dependencies"
fi

if [ "$CLEAN_DOCKER" = true ]; then
    echo ""
    print_info "Run 'scripts/setup-dev.sh' to reinitialize Docker services"
fi

echo ""
