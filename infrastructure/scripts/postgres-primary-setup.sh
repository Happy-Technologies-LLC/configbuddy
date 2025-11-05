#!/bin/bash
# PostgreSQL Primary Server Setup for Replication
# Configures PostgreSQL for streaming replication

set -e

echo "Configuring PostgreSQL for replication..."

# Create replication user
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE ROLE ${POSTGRES_REPLICATION_USER:-replicator} WITH REPLICATION LOGIN PASSWORD '${POSTGRES_REPLICATION_PASSWORD:-replicator_password}';
EOSQL

# Update pg_hba.conf for replication
cat >> "$PGDATA/pg_hba.conf" <<-EOF
# Replication connections
host replication ${POSTGRES_REPLICATION_USER:-replicator} 0.0.0.0/0 md5
EOF

# Reload PostgreSQL configuration
pg_ctl reload -D "$PGDATA"

echo "PostgreSQL replication setup complete!"
