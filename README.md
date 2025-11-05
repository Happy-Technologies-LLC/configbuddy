# CMDB Platform

> Enterprise-grade Configuration Management Database (CMDB) built with Node.js, TypeScript, and Neo4j

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

ConfigBuddy is an open-source CMDB platform that provides comprehensive infrastructure discovery, relationship mapping, and change management across multi-cloud and on-premise environments.

### Key Features (v2.0)

- **37 Integration Connectors**: 17 TypeScript + 20 JSON-only declarative connectors for ServiceNow, Jira, SCCM, cloud providers, and more
- **Unified Credential System**: Protocol-based authentication with encrypted storage in PostgreSQL
- **Discovery Agents**: Smart routing for network protocols (NMAP, SSH, SNMP, Active Directory)
- **Graph Database**: Neo4j-powered relationship modeling and impact analysis
- **Data Mart**: PostgreSQL with TimescaleDB for analytics and reporting
- **AI/ML Engines**: Anomaly detection, drift detection, and impact analysis
- **Identity Resolution**: Cross-source entity matching and deduplication
- **Dynamic Metadata**: Schema-less custom attributes with indexed search
- **Event Streaming**: Kafka-based event pipeline for real-time processing
- **REST & GraphQL APIs**: Comprehensive API layer (18+ endpoints)
- **React Web UI**: Modern dashboard with advanced visualization components
- **CLI Tool**: Command-line interface for operations

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐    │
│  │  React UI  │  │  CLI Tool  │  │  External Systems  │    │
│  └────────────┘  └────────────┘  └────────────────────┘    │
└────────────┬───────────────┬──────────────────┬─────────────┘
             │               │                  │
┌────────────▼───────────────▼──────────────────▼─────────────┐
│              REST API + GraphQL (Express + Apollo)           │
└────────────┬──────────────────────────────────┬──────────────┘
             │                                  │
┌────────────▼──────────────────────────────────▼──────────────┐
│   Discovery Workers │  ETL Processors  │  Change Detection   │
└────────────┬──────────────────────────────────┬──────────────┘
             │                                  │
┌────────────▼──────────────────────────────────▼──────────────┐
│  Neo4j (Graph)  │  PostgreSQL (Mart)  │  Redis (Cache)       │
└───────────────────────────────────────────────────────────────┘
```

## Quick Start

**Deploy the entire platform with one command:**

```bash
# Full deployment (builds TypeScript + Docker images + starts all services)
./deploy.sh

# Quick deployment (uses existing builds)
./deploy.sh --skip-build

# Clean deployment with test data
./deploy.sh --clean --seed
```

**Then access:**
- **Web UI**: http://localhost:3001
- **API Server**: http://localhost:3000
- **GraphQL Playground**: http://localhost:3000/graphql
- **Neo4j Browser**: http://localhost:7474
  - Credentials: `neo4j` / `cmdb_password_dev`
- **Admin Login** (with --seed): `admin@configbuddy.local` / `Admin123!`

### Deployment Options

```bash
./deploy.sh --help                 # Show all options
./deploy.sh --clean                # Clean Docker volumes and rebuild from scratch
./deploy.sh --skip-build           # Skip TypeScript build (use existing dist/)
./deploy.sh --seed                 # Seed database with test data
```

📖 **Full documentation**: http://localhost:8080 (after deployment)

### Prerequisites

- **Docker** >= 20.10
- **Docker Compose** >= 2.0
- **Node.js** >= 20.0.0
- **npm** or **pnpm** >= 8.0.0

### Installation

```bash
# Clone repository
git clone <repository-url>
cd configbuddy

# Run setup script (installs dependencies, starts Docker services, initializes databases)
./scripts/setup-dev.sh

# Start development
pnpm dev
```

### Manual Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start infrastructure (Neo4j, PostgreSQL, Redis, Kafka)
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# Initialize databases
./scripts/db-init.sh

# Build all packages
pnpm build

# Start API server
pnpm dev:api
```

## Project Structure

```
cmdb-platform/
├── packages/
│   ├── common/              # Shared types and utilities
│   ├── database/            # Database clients (Neo4j, PostgreSQL, Redis)
│   ├── api-server/          # REST + GraphQL API
│   ├── discovery-engine/    # Multi-cloud discovery workers
│   ├── etl-processor/       # ETL jobs and transformers
│   ├── agent/              # Lightweight discovery agent
│   └── cli/                # Command-line interface
├── web-ui/                 # React dashboard with advanced UI components
├── doc-site/              # VitePress documentation site
├── infrastructure/         # Docker, Kubernetes, Terraform
│   ├── docker/            # Docker compose files and Dockerfiles
│   ├── config/            # Configuration templates
│   └── scripts/           # Database initialization
├── scripts/               # Development and deployment scripts
└── docs/                  # Archived documentation
```

## Development

### Available Scripts

```bash
# Development
pnpm dev                    # Start all services in development mode
pnpm dev:api                # Start API server only

# Building
pnpm build                  # Build all packages
./scripts/build-all.sh      # Build with options (--clean, --skip-lint)

# Testing
pnpm test                   # Run all tests
./scripts/test-all.sh       # Run with options (--unit-only, --integration-only)

# Database
./scripts/db-init.sh        # Initialize databases
./scripts/db-migrate.sh     # Run PostgreSQL migrations

# Cleanup
./scripts/clean.sh          # Clean build artifacts
./scripts/clean.sh --docker # Also clean Docker volumes
```

### Running Discovery

```bash
# Using CLI
pnpm --filter @cmdb/cli start discovery scan --provider aws --region us-east-1

# Using API
curl -X POST http://localhost:3000/api/v1/discovery/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "aws",
    "config": {
      "region": "us-east-1"
    }
  }'
```

## Configuration

All configuration is via environment variables. Copy `.env.example` to `.env` and update:

```bash
# Application Configuration
NODE_ENV=development
LOG_LEVEL=info
API_PORT=3000

# Authentication & Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ENCRYPTION_KEY=your-encryption-key-for-sensitive-data-minimum-32-characters

# Neo4j Graph Database
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-neo4j-password

# PostgreSQL (Connector Registry, Credentials, Metadata)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=cmdb
POSTGRES_USER=cmdb_user
POSTGRES_PASSWORD=your-postgres-password

# Redis (Cache & Job Queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# AI/ML Features (v2.0)
AI_ANOMALY_DETECTION_ENABLED=true
AI_DRIFT_DETECTION_ENABLED=true
AI_IMPACT_ANALYSIS_ENABLED=true
```

### v2.0 Credential Management

**IMPORTANT**: ConfigBuddy v2.0 uses a **unified credential system** stored in PostgreSQL.

Connector credentials (AWS, Azure, GCP, ServiceNow, etc.) are **NOT** configured via environment variables. Instead:

1. Create credential records via Web UI or API
2. Associate credentials with discovery definitions
3. Credentials support multiple auth methods per provider

See documentation: http://localhost:8080/components/credentials

## API Documentation

### REST API

Base URL: `http://localhost:3000/api/v1`

#### Configuration Items (CIs)

- `GET /cis` - List all CIs (supports filtering)
- `GET /cis/:id` - Get CI by ID
- `POST /cis` - Create new CI
- `PUT /cis/:id` - Update CI
- `DELETE /cis/:id` - Delete CI
- `GET /cis/:id/relationships` - Get CI relationships
- `GET /cis/:id/dependencies` - Get dependency tree
- `GET /cis/:id/impact` - Get impact analysis
- `POST /cis/search` - Full-text search

#### Discovery

- `POST /discovery/schedule` - Schedule discovery job
- `GET /discovery/jobs/:id` - Get job status
- `GET /discovery/jobs` - List all jobs

### GraphQL API

Endpoint: `http://localhost:3000/graphql`

```graphql
query {
  getCIs(type: "virtual-machine", status: "active") {
    id
    name
    type
    status
    environment
    metadata
  }
}

mutation {
  createCI(input: {
    id: "vm-001"
    name: "web-server-01"
    type: "virtual-machine"
    status: "active"
    environment: "production"
  }) {
    id
    name
  }
}
```

## Testing

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test -- --watch
```

## Docker Support

### Development Environment

```bash
# Start all infrastructure services
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# View logs
docker-compose -f infrastructure/docker/docker-compose.yml logs -f

# Stop services
docker-compose -f infrastructure/docker/docker-compose.yml down

# Clean everything (including volumes)
docker-compose -f infrastructure/docker/docker-compose.yml down -v
```

### Building Application Images

```bash
# Build API server
docker build -f infrastructure/docker/Dockerfile.api -t cmdb-api:latest .

# Build discovery engine
docker build -f infrastructure/docker/Dockerfile.discovery -t cmdb-discovery:latest .

# Build ETL processor
docker build -f infrastructure/docker/Dockerfile.etl -t cmdb-etl:latest .

# Build agent
docker build -f infrastructure/docker/Dockerfile.agent -t cmdb-agent:latest .
```

## Packages

### @cmdb/common

Shared TypeScript types, utilities, and logging.

```typescript
import { CI, logger, validators } from '@cmdb/common';
```

### @cmdb/database

Database clients for Neo4j, PostgreSQL, Redis, and BullMQ queue manager.

```typescript
import { getNeo4jClient, getPostgresClient, getRedisClient } from '@cmdb/database';
```

### @cmdb/api-server

REST and GraphQL API servers.

```typescript
import { RestAPIServer } from '@cmdb/api-server';

const server = new RestAPIServer(3000);
server.start();
```

### @cmdb/discovery-engine

Multi-cloud discovery workers (AWS, Azure, GCP, SSH, Nmap).

```typescript
import { DiscoveryOrchestrator } from '@cmdb/discovery-engine';

const orchestrator = new DiscoveryOrchestrator();
orchestrator.registerWorkers();
```

### @cmdb/etl-processor

ETL jobs for syncing Neo4j to PostgreSQL data mart.

```typescript
import { Neo4jToPostgresJob } from '@cmdb/etl-processor';
```

### @cmdb/agent

Lightweight agent for server-based discovery.

```typescript
import { Agent } from '@cmdb/agent';

const agent = new Agent({ schedule: '0 */6 * * *' });
agent.start();
```

### @cmdb/cli

Command-line interface for CMDB operations.

```bash
cmdb-cli discovery scan --provider aws
cmdb-cli ci list --type virtual-machine
cmdb-cli query impact --id vm-001
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Roadmap

### v2.0 Complete ✅
- [x] 37 Integration Connectors (ServiceNow, Jira, SCCM, cloud providers, etc.)
- [x] Unified Credential System with protocol-based authentication
- [x] Discovery Agents with smart routing
- [x] Identity Resolution Engine
- [x] AI/ML Engines (anomaly, drift, impact analysis)
- [x] Dynamic Metadata System
- [x] Event Streaming (Kafka)
- [x] React Web UI with advanced components
- [x] Comprehensive API (18+ endpoints)
- [x] VitePress Documentation Site

### v3.0 Planned
- [ ] Real-time collaboration features
- [ ] Advanced compliance reporting
- [ ] Custom workflow automation
- [ ] Plugin marketplace
- [ ] Multi-tenancy support
- [ ] Advanced visualization (3D topology maps)
- [ ] Mobile application

## Documentation

### Official Documentation Site

**Primary Documentation**: http://localhost:8080 (VitePress site)

The comprehensive documentation site includes:

- **Getting Started** - Quick start guides and installation
- **Architecture** - System design, connector framework, version history
- **Components** - Credentials, discovery agents, connector registry, API server
- **Configuration** - Environment variables, security, service configuration
- **Deployment** - Docker and Kubernetes deployment guides
- **Operations** - Daily operations, monitoring, troubleshooting
- **API Reference** - REST and GraphQL API documentation
- **Development** - Building custom connectors, contributing

To start the documentation site:
```bash
./deploy.sh  # Automatically builds and starts docs at port 8080
```

### Archived Documentation

Historical development documentation:
- Phase reports and technical design documents in `/docs/archive/`
- v1.0 to v2.0 migration information

## Production Status

✅ **Production Ready** - v2.0 Complete

ConfigBuddy CMDB v2.0 is a production-ready enterprise platform with advanced features:

- ✅ **37 Integration Connectors** - ServiceNow, Jira, SCCM, cloud providers, and more
- ✅ **AI/ML Capabilities** - Anomaly detection, drift detection, impact analysis
- ✅ **Identity Resolution** - Cross-source entity matching and deduplication
- ✅ **Event Streaming** - Kafka-based real-time event pipeline
- ✅ **Unified Credentials** - Encrypted credential storage with protocol-based authentication
- ✅ **Docker & Kubernetes Ready** - Production-grade deployment configurations
- ✅ **Comprehensive Documentation** - 30+ documentation pages with full-text search
- ✅ **Security Hardened** - JWT authentication, role-based access, encrypted secrets
- ✅ **Performance Optimized** - Connection pooling, caching, batch processing

See documentation site (http://localhost:8080) for complete details.

## Support

- **Documentation**: http://localhost:8080 (comprehensive VitePress site)
- **Quick Start**: Run `./deploy.sh` to get started in minutes
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Architecture**: See `/doc-site/docs/architecture/` for technical details

---

Built with ❤️ using Node.js, TypeScript, Neo4j, and modern cloud-native technologies.
