#!/bin/bash
# Test Runner Scripts
# Provides convenient commands for running different test suites

set -e # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function for colored output
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to run unit tests
run_unit_tests() {
    log_info "Running unit tests..."
    npm run test:unit "$@"
}

# Function to run integration tests
run_integration_tests() {
    log_info "Running integration tests..."
    log_warn "Integration tests require Docker to be running"

    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi

    npm run test:integration "$@"
}

# Function to run E2E tests
run_e2e_tests() {
    log_info "Running E2E tests..."
    log_warn "E2E tests require Docker to be running"

    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi

    npm run test:e2e "$@"
}

# Function to run all tests
run_all_tests() {
    log_info "Running all tests..."

    log_info "Step 1/3: Unit tests"
    run_unit_tests

    log_info "Step 2/3: Integration tests"
    run_integration_tests

    log_info "Step 3/3: E2E tests"
    run_e2e_tests

    log_info "All tests passed!"
}

# Function to run tests with coverage
run_coverage() {
    log_info "Running tests with coverage..."
    npm run test:coverage

    log_info "Coverage report generated at: coverage/lcov-report/index.html"
}

# Function to run tests in watch mode
run_watch() {
    log_info "Running tests in watch mode..."
    jest --watch --config jest.config.unit.js
}

# Main script
case "${1:-}" in
    unit)
        run_unit_tests "${@:2}"
        ;;
    integration)
        run_integration_tests "${@:2}"
        ;;
    e2e)
        run_e2e_tests "${@:2}"
        ;;
    all)
        run_all_tests
        ;;
    coverage)
        run_coverage
        ;;
    watch)
        run_watch
        ;;
    *)
        log_info "Test Runner Usage:"
        echo ""
        echo "  ./scripts/test.sh unit              Run unit tests (fast, mocked)"
        echo "  ./scripts/test.sh integration       Run integration tests (with test containers)"
        echo "  ./scripts/test.sh e2e               Run end-to-end tests"
        echo "  ./scripts/test.sh all               Run all test suites"
        echo "  ./scripts/test.sh coverage          Run tests with coverage report"
        echo "  ./scripts/test.sh watch             Run unit tests in watch mode"
        echo ""
        echo "Examples:"
        echo "  ./scripts/test.sh unit --verbose           Run unit tests with verbose output"
        echo "  ./scripts/test.sh unit --testPathPattern   Run specific unit test file"
        echo ""
        exit 1
        ;;
esac
