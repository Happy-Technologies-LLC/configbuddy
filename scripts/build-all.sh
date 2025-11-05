#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "CMDB Platform - Build All Packages"
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

# Parse command line arguments
CLEAN_BUILD=false
SKIP_LINT=false
SKIP_TYPECHECK=false
PARALLEL=true
PACKAGE_FILTER=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        --skip-lint)
            SKIP_LINT=true
            shift
            ;;
        --skip-typecheck)
            SKIP_TYPECHECK=true
            shift
            ;;
        --no-parallel)
            PARALLEL=false
            shift
            ;;
        --package)
            PACKAGE_FILTER="--filter=$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --clean           Clean before building"
            echo "  --skip-lint       Skip linting"
            echo "  --skip-typecheck  Skip type checking"
            echo "  --no-parallel     Build packages sequentially"
            echo "  --package <name>  Build specific package only"
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

# Build configuration
echo "Build configuration:"
echo "  Clean build: $([ "$CLEAN_BUILD" = true ] && echo "YES" || echo "NO")"
echo "  Linting: $([ "$SKIP_LINT" = false ] && echo "YES" || echo "NO")"
echo "  Type checking: $([ "$SKIP_TYPECHECK" = false ] && echo "YES" || echo "NO")"
echo "  Parallel: $([ "$PARALLEL" = true ] && echo "YES" || echo "NO")"
[ -n "$PACKAGE_FILTER" ] && echo "  Package filter: $PACKAGE_FILTER"
echo ""

# Clean build if requested
if [ "$CLEAN_BUILD" = true ]; then
    echo "========================================"
    echo "Cleaning build artifacts..."
    echo "========================================"
    echo ""

    if [ -f scripts/clean.sh ]; then
        bash scripts/clean.sh
    else
        print_info "Removing build artifacts manually..."
        find . -name "dist" -type d -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
        find . -name "build" -type d -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
        find . -name ".turbo" -type d -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
        print_success "Build artifacts cleaned"
    fi
    echo ""
fi

# Lint code
if [ "$SKIP_LINT" = false ]; then
    echo "========================================"
    echo "Linting code..."
    echo "========================================"
    echo ""

    if pnpm lint $PACKAGE_FILTER; then
        print_success "Linting passed"
    else
        print_error "Linting failed"
        exit 1
    fi
    echo ""
fi

# Type check
if [ "$SKIP_TYPECHECK" = false ]; then
    echo "========================================"
    echo "Type checking..."
    echo "========================================"
    echo ""

    if pnpm typecheck $PACKAGE_FILTER; then
        print_success "Type checking passed"
    else
        print_error "Type checking failed"
        exit 1
    fi
    echo ""
fi

# Build packages
echo "========================================"
echo "Building packages..."
echo "========================================"
echo ""

# Determine build command
BUILD_CMD="pnpm build"
[ -n "$PACKAGE_FILTER" ] && BUILD_CMD="$BUILD_CMD $PACKAGE_FILTER"

# Add parallel flag if using Turbo
if [ "$PARALLEL" = true ]; then
    print_info "Building packages in parallel..."
else
    print_info "Building packages sequentially..."
    BUILD_CMD="$BUILD_CMD --concurrency=1"
fi

# Run build
START_TIME=$(date +%s)

if $BUILD_CMD; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    print_success "Build completed in ${DURATION}s"
else
    print_error "Build failed"
    exit 1
fi

echo ""

# Show build output directories
echo "========================================"
echo "Build output:"
echo "========================================"
echo ""

# Find all dist directories
print_info "Build artifacts:"
for dist_dir in packages/*/dist; do
    if [ -d "$dist_dir" ]; then
        PKG_NAME=$(echo "$dist_dir" | cut -d'/' -f2)
        SIZE=$(du -sh "$dist_dir" 2>/dev/null | cut -f1)
        echo "  - packages/$PKG_NAME/dist ($SIZE)"
    fi
done

echo ""

# Show package sizes
if command -v du >/dev/null 2>&1; then
    echo "========================================"
    echo "Package sizes:"
    echo "========================================"
    echo ""

    for pkg_dir in packages/*; do
        if [ -d "$pkg_dir/dist" ]; then
            PKG_NAME=$(basename "$pkg_dir")
            SIZE=$(du -sh "$pkg_dir/dist" 2>/dev/null | cut -f1)
            echo "  $PKG_NAME: $SIZE"
        fi
    done

    echo ""
fi

# Summary
echo "========================================"
echo "Build Summary"
echo "========================================"
echo ""
print_success "All packages built successfully"

if [ "$SKIP_LINT" = false ]; then
    print_success "Linting: PASSED"
fi

if [ "$SKIP_TYPECHECK" = false ]; then
    print_success "Type checking: PASSED"
fi

print_success "Build: PASSED"

echo ""
print_info "Build artifacts are ready for deployment"
echo ""
