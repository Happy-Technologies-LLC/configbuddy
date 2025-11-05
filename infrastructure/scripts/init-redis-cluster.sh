#!/bin/bash
# Redis Cluster Initialization Script
# This script creates a Redis cluster from individual Redis instances

set -e

REDIS_PASSWORD="${REDIS_PASSWORD:-redis_prod_password}"
REDIS_NODES="${REDIS_NODES:-redis-1:6379 redis-2:6379 redis-3:6379 redis-4:6379 redis-5:6379 redis-6:6379}"

echo "Waiting for Redis instances to be ready..."
sleep 30

# Convert space-separated list to comma-separated for redis-cli
NODES_COMMA=$(echo $REDIS_NODES | tr ' ' ',')

echo "Creating Redis cluster with nodes: $NODES_COMMA"

redis-cli -a "$REDIS_PASSWORD" --cluster create $REDIS_NODES \
  --cluster-replicas 1 \
  --cluster-yes

echo "Redis cluster created successfully!"

# Verify cluster status
echo "Checking cluster status..."
redis-cli -a "$REDIS_PASSWORD" -h redis-1 -p 6379 cluster info

echo "Cluster nodes:"
redis-cli -a "$REDIS_PASSWORD" -h redis-1 -p 6379 cluster nodes

echo "Redis cluster initialization complete!"
