#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "PostgreSQL Database Migrations"
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

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    print_info "Loaded environment variables from .env"
fi

# Default values
POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
POSTGRES_DB=${POSTGRES_DB:-cmdb}

# Migration directory
MIGRATIONS_DIR=${MIGRATIONS_DIR:-packages/db/migrations}

echo "Database Configuration:"
echo "  Host: $POSTGRES_HOST:$POSTGRES_PORT"
echo "  Database: $POSTGRES_DB"
echo "  User: $POSTGRES_USER"
echo "  Migrations: $MIGRATIONS_DIR"
echo ""

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    print_info "Migrations directory not found at $MIGRATIONS_DIR"
    print_info "Creating migrations directory..."
    mkdir -p "$MIGRATIONS_DIR"
    print_success "Migrations directory created"

    # Create initial migration file
    cat > "$MIGRATIONS_DIR/001_initial_schema.sql" << 'EOF'
-- Initial database schema
-- Created by db-migrate.sh

-- Create migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    changes JSONB,
    user_id VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);

-- Create configuration table
CREATE TABLE IF NOT EXISTS config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table (for future use)
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    data JSONB,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
EOF
    print_success "Created initial migration file"
fi

# Create migrations tracking table
print_info "Creating migrations tracking table..."
export PGPASSWORD="$POSTGRES_PASSWORD"
psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" << EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);
EOF
print_success "Migrations tracking table ready"

# Get list of applied migrations
print_info "Checking applied migrations..."
APPLIED_MIGRATIONS=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT version FROM schema_migrations ORDER BY version" | tr -d ' ')

echo ""
echo "========================================"
echo "Running migrations..."
echo "========================================"
echo ""

# Run each migration file
MIGRATION_COUNT=0
for migration_file in $(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
    MIGRATION_NAME=$(basename "$migration_file" .sql)

    # Check if migration has already been applied
    if echo "$APPLIED_MIGRATIONS" | grep -q "^$MIGRATION_NAME$"; then
        print_info "Skipping $MIGRATION_NAME (already applied)"
        continue
    fi

    print_info "Applying migration: $MIGRATION_NAME"

    # Run the migration
    if psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$migration_file"; then
        # Record the migration
        DESCRIPTION=$(head -n 5 "$migration_file" | grep -E '^--' | head -n 1 | sed 's/^-- //')
        psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" << EOF
INSERT INTO schema_migrations (version, description)
VALUES ('$MIGRATION_NAME', '$DESCRIPTION');
EOF
        print_success "Applied migration: $MIGRATION_NAME"
        MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
    else
        print_error "Failed to apply migration: $MIGRATION_NAME"
        exit 1
    fi
done

# Unset password
unset PGPASSWORD

echo ""
echo "========================================"
echo "Migration Complete!"
echo "========================================"
echo ""

if [ $MIGRATION_COUNT -eq 0 ]; then
    print_info "No new migrations to apply"
else
    print_success "Applied $MIGRATION_COUNT migration(s)"
fi

# Show migration status
echo ""
echo "Migration History:"
export PGPASSWORD="$POSTGRES_PASSWORD"
psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT version, description, applied_at FROM schema_migrations ORDER BY applied_at DESC LIMIT 10"
unset PGPASSWORD

echo ""
