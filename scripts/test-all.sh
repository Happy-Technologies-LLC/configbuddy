#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "CMDB Platform - Run All Tests"
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
RUN_UNIT=true
RUN_INTEGRATION=true
RUN_E2E=false
GENERATE_COVERAGE=true
WATCH_MODE=false
PACKAGE_FILTER=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --unit-only)
            RUN_UNIT=true
            RUN_INTEGRATION=false
            RUN_E2E=false
            shift
            ;;
        --integration-only)
            RUN_UNIT=false
            RUN_INTEGRATION=true
            RUN_E2E=false
            shift
            ;;
        --e2e)
            RUN_E2E=true
            shift
            ;;
        --no-coverage)
            GENERATE_COVERAGE=false
            shift
            ;;
        --watch)
            WATCH_MODE=true
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
            echo "  --unit-only       Run only unit tests"
            echo "  --integration-only Run only integration tests"
            echo "  --e2e             Include E2E tests"
            echo "  --no-coverage     Skip coverage report generation"
            echo "  --watch           Run tests in watch mode"
            echo "  --package <name>  Run tests for specific package only"
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

# Test configuration
echo "Test configuration:"
echo "  Unit tests: $([ "$RUN_UNIT" = true ] && echo "YES" || echo "NO")"
echo "  Integration tests: $([ "$RUN_INTEGRATION" = true ] && echo "YES" || echo "NO")"
echo "  E2E tests: $([ "$RUN_E2E" = true ] && echo "YES" || echo "NO")"
echo "  Coverage: $([ "$GENERATE_COVERAGE" = true ] && echo "YES" || echo "NO")"
echo "  Watch mode: $([ "$WATCH_MODE" = true ] && echo "YES" || echo "NO")"
[ -n "$PACKAGE_FILTER" ] && echo "  Package filter: $PACKAGE_FILTER"
echo ""

# Check if services are running for integration tests
if [ "$RUN_INTEGRATION" = true ] || [ "$RUN_E2E" = true ]; then
    echo "========================================"
    echo "Checking services..."
    echo "========================================"
    echo ""

    # Check Docker services
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Integration tests require Docker services."
        exit 1
    fi
    print_success "Docker is running"

    # Check PostgreSQL
    if docker ps | grep -q postgres; then
        print_success "PostgreSQL container is running"
    else
        print_warning "PostgreSQL container is not running"
        print_info "Starting Docker services..."
        if [ -f docker-compose.yml ]; then
            if docker compose version >/dev/null 2>&1; then
                docker compose up -d
            else
                docker-compose up -d
            fi
            sleep 5
            print_success "Docker services started"
        fi
    fi

    echo ""
fi

# Build coverage flags
COVERAGE_FLAGS=""
if [ "$GENERATE_COVERAGE" = true ]; then
    COVERAGE_FLAGS="--coverage"
fi

# Build watch flag
WATCH_FLAG=""
if [ "$WATCH_MODE" = true ]; then
    WATCH_FLAG="--watch"
fi

# Track test results
UNIT_RESULT=0
INTEGRATION_RESULT=0
E2E_RESULT=0

# Run unit tests
if [ "$RUN_UNIT" = true ]; then
    echo "========================================"
    echo "Running Unit Tests..."
    echo "========================================"
    echo ""

    if pnpm test:unit $PACKAGE_FILTER $COVERAGE_FLAGS $WATCH_FLAG; then
        print_success "Unit tests passed"
    else
        UNIT_RESULT=$?
        print_error "Unit tests failed"
    fi
    echo ""
fi

# Run integration tests
if [ "$RUN_INTEGRATION" = true ]; then
    echo "========================================"
    echo "Running Integration Tests..."
    echo "========================================"
    echo ""

    if pnpm test:integration $PACKAGE_FILTER $COVERAGE_FLAGS $WATCH_FLAG; then
        print_success "Integration tests passed"
    else
        INTEGRATION_RESULT=$?
        print_error "Integration tests failed"
    fi
    echo ""
fi

# Run E2E tests
if [ "$RUN_E2E" = true ]; then
    echo "========================================"
    echo "Running E2E Tests..."
    echo "========================================"
    echo ""

    if pnpm test:e2e $PACKAGE_FILTER $COVERAGE_FLAGS $WATCH_FLAG; then
        print_success "E2E tests passed"
    else
        E2E_RESULT=$?
        print_error "E2E tests failed"
    fi
    echo ""
fi

# Generate coverage report
if [ "$GENERATE_COVERAGE" = true ] && [ "$WATCH_MODE" = false ]; then
    echo "========================================"
    echo "Generating Coverage Report..."
    echo "========================================"
    echo ""

    # Merge coverage from all packages
    print_info "Merging coverage reports..."

    # Check if nyc is available
    if command -v nyc >/dev/null 2>&1; then
        # Find all coverage directories
        COVERAGE_DIRS=$(find packages -name "coverage" -type d 2>/dev/null | tr '\n' ' ')

        if [ -n "$COVERAGE_DIRS" ]; then
            # Create combined coverage directory
            mkdir -p coverage

            # Merge coverage reports
            nyc merge $COVERAGE_DIRS coverage/coverage.json 2>/dev/null || true
            nyc report --reporter=html --reporter=text --reporter=lcov --report-dir=coverage 2>/dev/null || true

            print_success "Coverage report generated"
            print_info "Open coverage/index.html to view the report"
        else
            print_info "No coverage data found"
        fi
    else
        print_info "nyc not found, checking for individual package coverage..."

        # List coverage reports from packages
        for pkg in packages/*/coverage/index.html; do
            if [ -f "$pkg" ]; then
                PKG_NAME=$(echo "$pkg" | cut -d'/' -f2)
                print_info "Coverage report available: packages/$PKG_NAME/coverage/index.html"
            fi
        done
    fi

    echo ""
fi

# Summary
echo "========================================"
echo "Test Summary"
echo "========================================"
echo ""

TOTAL_FAILURES=0

if [ "$RUN_UNIT" = true ]; then
    if [ $UNIT_RESULT -eq 0 ]; then
        print_success "Unit tests: PASSED"
    else
        print_error "Unit tests: FAILED"
        TOTAL_FAILURES=$((TOTAL_FAILURES + 1))
    fi
fi

if [ "$RUN_INTEGRATION" = true ]; then
    if [ $INTEGRATION_RESULT -eq 0 ]; then
        print_success "Integration tests: PASSED"
    else
        print_error "Integration tests: FAILED"
        TOTAL_FAILURES=$((TOTAL_FAILURES + 1))
    fi
fi

if [ "$RUN_E2E" = true ]; then
    if [ $E2E_RESULT -eq 0 ]; then
        print_success "E2E tests: PASSED"
    else
        print_error "E2E tests: FAILED"
        TOTAL_FAILURES=$((TOTAL_FAILURES + 1))
    fi
fi

echo ""

if [ $TOTAL_FAILURES -eq 0 ]; then
    print_success "All tests passed!"
    exit 0
else
    print_error "$TOTAL_FAILURES test suite(s) failed"
    exit 1
fi
