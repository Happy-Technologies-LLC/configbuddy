# Production-Grade Rate Limiting - ConfigBuddy CMDB

## Overview

ConfigBuddy v2.0 implements production-grade rate limiting with:
- **Redis-backed distributed rate limiting** using sliding window algorithm
- **Tier-based rate limits** (anonymous, standard, premium, enterprise)
- **Per-endpoint configuration** with different limits for each API category
- **Internal service bypass** for service-to-service communication
- **Comprehensive monitoring** with metrics and logging
- **Graceful degradation** if Redis is unavailable

## Rate Limit Configuration

### Base Rate Limits (Anonymous Users)

| Endpoint | Requests/Hour | Window | Notes |
|----------|--------------|--------|-------|
| REST API (`/api/v1/*`) | 1,000 | 1 hour | General API endpoints |
| GraphQL (`/graphql`) | 500 | 1 hour | GraphQL queries and mutations |
| Health (`/health`, `/ready`) | Unlimited | N/A | Internal monitoring |
| Authentication (`/auth/*`) | 20 | 1 hour | Login, logout, token refresh |
| Discovery (`/api/v1/discovery/*`) | 100 | 1 hour | Discovery operations |
| Admin (`/api/v1/admin/*`) | 200 | 1 hour | Administrative operations |

### Tier Multipliers (Authenticated Users)

API key holders receive multiplied rate limits based on their tier:

| Tier | Multiplier | Example (REST API) | Example (GraphQL) |
|------|-----------|-------------------|-------------------|
| **Standard** | 5x | 5,000 req/hour | 2,500 req/hour |
| **Premium** | 10x | 10,000 req/hour | 5,000 req/hour |
| **Enterprise** | 20x | 20,000 req/hour | 10,000 req/hour |

**Examples:**
- Anonymous user: 1,000 REST API requests/hour
- Standard API key: 5,000 REST API requests/hour
- Premium API key: 10,000 REST API requests/hour
- Enterprise API key: 20,000 REST API requests/hour

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Rate Limiting
RATE_LIMIT_ENABLED=true

# Internal service bypass
RATE_LIMIT_BYPASS_HEADER=X-Internal-Service
RATE_LIMIT_BYPASS_SECRET=your-internal-service-secret-change-this

# Tier multipliers
RATE_LIMIT_TIER_STANDARD_MULTIPLIER=5
RATE_LIMIT_TIER_PREMIUM_MULTIPLIER=10
RATE_LIMIT_TIER_ENTERPRISE_MULTIPLIER=20

# REST API limits
RATE_LIMIT_REST_MAX=1000
RATE_LIMIT_REST_WINDOW_MS=3600000

# GraphQL limits
RATE_LIMIT_GRAPHQL_MAX=500
RATE_LIMIT_GRAPHQL_WINDOW_MS=3600000

# Health endpoints (0 = unlimited)
RATE_LIMIT_HEALTH_MAX=0
RATE_LIMIT_HEALTH_WINDOW_MS=60000

# Authentication limits
RATE_LIMIT_AUTH_MAX=20
RATE_LIMIT_AUTH_WINDOW_MS=3600000

# Discovery limits
RATE_LIMIT_DISCOVERY_MAX=100
RATE_LIMIT_DISCOVERY_WINDOW_MS=3600000

# Admin limits
RATE_LIMIT_ADMIN_MAX=200
RATE_LIMIT_ADMIN_WINDOW_MS=3600000

# Monitoring
RATE_LIMIT_MONITORING_ENABLED=true
RATE_LIMIT_LOG_HITS=true
```

### Configuration File

Alternatively, configure via JSON file (e.g., `infrastructure/config/templates/production.json`):

```json
{
  "rateLimit": {
    "enabled": true,
    "bypassHeader": "X-Internal-Service",
    "bypassSecret": "your-secret-here",
    "tierMultipliers": {
      "standard": 5,
      "premium": 10,
      "enterprise": 20
    },
    "endpoints": {
      "rest": { "max": 1000, "windowMs": 3600000 },
      "graphql": { "max": 500, "windowMs": 3600000 },
      "health": { "max": 0, "windowMs": 60000 },
      "auth": { "max": 20, "windowMs": 3600000 },
      "discovery": { "max": 100, "windowMs": 3600000 },
      "admin": { "max": 200, "windowMs": 3600000 }
    },
    "monitoring": {
      "enabled": true,
      "logRateLimitHits": true
    }
  }
}
```

## Response Headers

Every API response includes rate limit headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1698765432000
```

- **X-RateLimit-Limit**: Maximum requests allowed in window
- **X-RateLimit-Remaining**: Requests remaining in current window
- **X-RateLimit-Reset**: Unix timestamp (ms) when rate limit resets

## Rate Limit Exceeded Response

When rate limit is exceeded, API returns HTTP 429 with details:

```json
{
  "_error": "Too Many Requests",
  "_message": "Rate limit exceeded. Try again in 1847 seconds",
  "_retryAfter": 1847,
  "_limit": 1000,
  "_resetAt": "2024-10-31T14:30:32.000Z"
}
```

## Internal Service Bypass

For service-to-service communication, bypass rate limiting:

```bash
curl -H "X-Internal-Service: your-secret-here" \
  https://api.configbuddy.com/api/v1/cis
```

**Security Notes:**
- Set `RATE_LIMIT_BYPASS_SECRET` to a strong random value
- Only share with trusted internal services
- Rotate secret periodically
- Monitor bypass usage in logs

## API Key Tiers

### Creating API Keys with Tiers

When creating an API key, specify the tier:

```bash
POST /api/v1/auth/api-keys
{
  "_name": "Production Integration",
  "_tier": "premium",
  "expiresInDays": 365
}
```

**Response:**
```json
{
  "_apiKey": "cmdb_pk_abc123...",
  "_id": "550e8400-e29b-41d4-a716-446655440000",
  "_name": "Production Integration",
  "_tier": "premium",
  "expiresAt": "2025-10-31T00:00:00.000Z"
}
```

### Using API Keys

Include API key in request header:

```bash
curl -H "X-API-Key: cmdb_pk_abc123..." \
  https://api.configbuddy.com/api/v1/cis
```

Rate limits are automatically multiplied based on tier.

## Monitoring

### Metrics Endpoint

Monitor rate limiting statistics:

```bash
GET /api/v1/metrics/rate-limits
```

**Response:**
```json
{
  "_success": true,
  "_data": {
    "totalRateLimitHits": 145,
    "byEndpoint": {
      "rest": 98,
      "graphql": 32,
      "auth": 15
    },
    "byTier": {
      "anonymous": 87,
      "standard": 43,
      "premium": 15
    },
    "detailed": {
      "rest:anonymous": 56,
      "rest:standard": 32,
      "rest:premium": 10,
      "graphql:anonymous": 31,
      "graphql:standard": 1,
      "auth:anonymous": 15
    },
    "timestamp": "2024-10-31T12:45:30.000Z"
  }
}
```

### Configuration Summary

View rate limit configuration:

```bash
GET /api/v1/metrics/rate-limits/config
```

### Log Monitoring

Rate limit hits are logged with context:

```json
{
  "level": "warn",
  "message": "Rate limit exceeded",
  "endpoint": "rest",
  "identifier": "ip:192.168.1.100",
  "limit": 1000,
  "resetAt": "2024-10-31T14:30:32.000Z",
  "timestamp": "2024-10-31T13:15:20.000Z"
}
```

**Metrics logged every minute:**
```json
{
  "level": "info",
  "message": "Rate limit metrics",
  "metrics": {
    "rest:anonymous": 45,
    "graphql:premium": 12,
    "auth:anonymous": 8
  },
  "timestamp": "2024-10-31T13:16:00.000Z"
}
```

## Implementation Details

### Sliding Window Algorithm

Rate limiting uses Redis sorted sets with a sliding window algorithm:

1. **Remove old entries**: Delete requests outside current window
2. **Count requests**: Count requests in current window
3. **Add new request**: Record current request with timestamp
4. **Check limit**: Allow if count < limit
5. **Set expiration**: Auto-expire keys after window

**Benefits:**
- Accurate rate limiting (no burst at window boundaries)
- Distributed (works across multiple API servers)
- Memory efficient (auto-expiring keys)
- Atomic operations (Redis pipeline)

### Graceful Degradation

If Redis is unavailable:
- Request is **allowed** (fail-open strategy)
- Error is logged
- Rate limiting resumes when Redis recovers

**Rationale:** Service availability > rate limiting enforcement during Redis outages.

### Identifier Strategy

Rate limits are tracked per:
1. **User ID** (if authenticated via JWT or API key)
2. **IP address** (if anonymous)

This ensures:
- Authenticated users get consistent limits across IPs
- Anonymous users are limited per IP
- No cross-contamination between users

## Best Practices

### For API Consumers

1. **Monitor headers**: Check `X-RateLimit-Remaining` to avoid hitting limits
2. **Implement backoff**: Use exponential backoff when receiving 429 responses
3. **Cache responses**: Reduce unnecessary API calls
4. **Use API keys**: Get higher limits with authenticated access
5. **Upgrade tier**: Contact support for premium/enterprise tiers

### For Administrators

1. **Set appropriate limits**: Balance security vs. usability
2. **Monitor metrics**: Track rate limit hits by endpoint and tier
3. **Rotate bypass secret**: Change internal service secret periodically
4. **Review logs**: Investigate patterns of rate limit violations
5. **Adjust tiers**: Create custom tiers for high-volume integrations

### For Developers

1. **Test rate limits**: Ensure limits work as expected in staging
2. **Document limits**: Keep API documentation up-to-date
3. **Add alerting**: Alert on high rate limit hit rates
4. **Optimize endpoints**: Reduce need for high request volumes
5. **Batch operations**: Support bulk operations to reduce request count

## Troubleshooting

### High Rate Limit Hits

**Symptoms:**
- Many 429 responses in logs
- Users complaining about rate limiting

**Solutions:**
1. Check if legitimate traffic spike → Increase limits temporarily
2. Check if abuse → Block IP or disable API key
3. Check if inefficient integration → Work with consumer to optimize

### Rate Limits Not Working

**Symptoms:**
- No rate limiting enforced
- All requests succeed

**Checks:**
1. Verify `RATE_LIMIT_ENABLED=true` in config
2. Check Redis connectivity
3. Verify middleware is applied to routes
4. Check logs for errors

### Uneven Rate Limiting

**Symptoms:**
- Some users hit limits, others don't
- Inconsistent behavior

**Checks:**
1. Verify Redis is shared across API servers
2. Check if using internal bypass header
3. Verify tier configuration
4. Check identifier strategy (user ID vs. IP)

## Security Considerations

1. **DDoS Protection**: Rate limiting helps mitigate DDoS attacks
2. **Credential Stuffing**: Auth endpoint limits prevent brute force attacks
3. **API Abuse**: Prevents resource exhaustion from abusive clients
4. **Internal Bypass**: Secure internal service bypass secret
5. **Monitoring**: Track rate limit violations for security analysis

## Performance Impact

**Redis Operations per Request:**
- 4 Redis commands (via pipeline)
- ~1-2ms latency overhead
- Minimal memory footprint (auto-expiring keys)

**Scaling:**
- Linear scaling with Redis cluster
- Supports millions of requests/hour
- No significant API server CPU impact

## Migration Guide

### From v1.0 Rate Limiting

ConfigBuddy v2.0 introduces breaking changes to rate limiting:

**Changes:**
- ✅ Moved from memory-based to Redis-based
- ✅ Added tier-based rate limiting
- ✅ Added per-endpoint configuration
- ✅ Added monitoring and metrics
- ✅ Changed endpoint names (e.g., `query` → `rest`)

**Migration Steps:**

1. Update environment variables (see Configuration section)
2. Ensure Redis is configured and accessible
3. Test rate limiting in staging environment
4. Deploy to production
5. Monitor metrics for any issues

### Backward Compatibility

**Breaking Changes:**
- Old endpoint types (`query`, `admin`) renamed → Update code if using custom middleware
- Configuration schema changed → Update config files

**Non-Breaking:**
- Existing API keys continue to work (default to `standard` tier)
- JWT tokens work as before
- Response format unchanged (still returns 429 with JSON)

## Support

For questions or issues with rate limiting:
- Documentation: http://localhost:8080 (when services running)
- GitHub Issues: https://github.com/configbuddy/configbuddy/issues
- Contact: support@configbuddy.com
