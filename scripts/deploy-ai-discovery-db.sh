#!/bin/bash
# AI Discovery Database Schema Deployment Script
# Run this when your PostgreSQL database is running

set -e  # Exit on error

echo "🚀 Deploying AI Discovery Database Schema..."

# Database connection details (from .env or override here)
POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_DATABASE=${POSTGRES_DATABASE:-cmdb}
POSTGRES_USER=${POSTGRES_USER:-cmdb_user}

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Database: ${POSTGRES_DATABASE}@${POSTGRES_HOST}:${POSTGRES_PORT}${NC}"

# Check if running in Docker
if command -v docker &> /dev/null; then
    CONTAINER=$(docker ps --filter "name=postgres" --format "{{.Names}}" | head -1)
    if [ ! -z "$CONTAINER" ]; then
        echo -e "${BLUE}🐳 Using Docker container: ${CONTAINER}${NC}"

        # Deploy schema via Docker
        echo -e "${YELLOW}Step 1/3: Deploying AI Discovery schema...${NC}"
        docker exec -i $CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DATABASE < packages/ai-discovery/schema.sql

        echo -e "${YELLOW}Step 2/3: Loading industry patterns...${NC}"
        docker exec -i $CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DATABASE < packages/ai-discovery/patterns/industry-patterns.sql

        echo -e "${YELLOW}Step 3/4: Updating discovery definitions schema...${NC}"
        docker exec -i $CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DATABASE < packages/database/migrations/002_ai_discovery_definitions.sql

        echo -e "${YELLOW}Step 4/4: Adding performance indexes...${NC}"
        docker exec -i $CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DATABASE < packages/database/migrations/003_ai_discovery_performance_indexes.sql

        echo -e "${GREEN}✅ Database schema deployed successfully!${NC}"

        # Verify tables
        echo -e "${BLUE}📋 Verifying tables...${NC}"
        docker exec -i $CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DATABASE -c "\dt ai_*"

        # Show pattern count
        echo -e "${BLUE}📦 Pattern count:${NC}"
        docker exec -i $CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DATABASE -c "SELECT COUNT(*) as pattern_count FROM ai_discovery_patterns;"

        exit 0
    fi
fi

# Fallback to local psql
if command -v psql &> /dev/null; then
    echo -e "${BLUE}💻 Using local psql client${NC}"

    echo -e "${YELLOW}Step 1/3: Deploying AI Discovery schema...${NC}"
    PGPASSWORD=${POSTGRES_PASSWORD} psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DATABASE -f packages/ai-discovery/schema.sql

    echo -e "${YELLOW}Step 2/3: Loading industry patterns...${NC}"
    PGPASSWORD=${POSTGRES_PASSWORD} psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DATABASE -f packages/ai-discovery/patterns/industry-patterns.sql

    echo -e "${YELLOW}Step 3/4: Updating discovery definitions schema...${NC}"
    PGPASSWORD=${POSTGRES_PASSWORD} psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DATABASE -f packages/database/migrations/002_ai_discovery_definitions.sql

    echo -e "${YELLOW}Step 4/4: Adding performance indexes...${NC}"
    PGPASSWORD=${POSTGRES_PASSWORD} psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DATABASE -f packages/database/migrations/003_ai_discovery_performance_indexes.sql

    echo -e "${GREEN}✅ Database schema deployed successfully!${NC}"

    # Verify tables
    echo -e "${BLUE}📋 Verifying tables...${NC}"
    PGPASSWORD=${POSTGRES_PASSWORD} psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DATABASE -c "\dt ai_*"

    # Show pattern count
    echo -e "${BLUE}📦 Pattern count:${NC}"
    PGPASSWORD=${POSTGRES_PASSWORD} psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DATABASE -c "SELECT COUNT(*) as pattern_count FROM ai_discovery_patterns;"

else
    echo -e "${YELLOW}⚠️  Neither Docker nor psql found.${NC}"
    echo ""
    echo "Please run the SQL files manually:"
    echo "  1. packages/ai-discovery/schema.sql"
    echo "  2. packages/ai-discovery/patterns/industry-patterns.sql"
    echo "  3. packages/database/migrations/002_ai_discovery_definitions.sql"
    echo "  4. packages/database/migrations/003_ai_discovery_performance_indexes.sql"
    echo ""
    echo "Example using Docker:"
    echo "  docker exec -i cmdb-postgres psql -U cmdb_user -d cmdb < packages/ai-discovery/schema.sql"
    echo "  docker exec -i cmdb-postgres psql -U cmdb_user -d cmdb < packages/ai-discovery/patterns/industry-patterns.sql"
    echo "  docker exec -i cmdb-postgres psql -U cmdb_user -d cmdb < packages/database/migrations/002_ai_discovery_definitions.sql"
    echo "  docker exec -i cmdb-postgres psql -U cmdb_user -d cmdb < packages/database/migrations/003_ai_discovery_performance_indexes.sql"
    exit 1
fi
