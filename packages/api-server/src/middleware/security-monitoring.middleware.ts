/**
 * Security Monitoring and Alerting Middleware
 *
 * Monitors security-critical events and triggers alerts:
 * - Failed authentication attempts (brute force detection)
 * - Rate limit violations (DoS detection)
 * - Unauthorized access attempts (privilege escalation)
 * - Configuration changes (audit trail)
 * - Credential access patterns (anomaly detection)
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@cmdb/common';
import { getRedisClient } from '@cmdb/database';

export interface SecurityEvent {
  type: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export enum SecurityEventType {
  FAILED_AUTHENTICATION = 'FAILED_AUTHENTICATION',
  SUCCESSFUL_AUTHENTICATION = 'SUCCESSFUL_AUTHENTICATION',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  RATE_LIMIT_VIOLATION = 'RATE_LIMIT_VIOLATION',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  CREDENTIAL_ACCESS = 'CREDENTIAL_ACCESS',
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  PRIVILEGE_ESCALATION_ATTEMPT = 'PRIVILEGE_ESCALATION_ATTEMPT',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

export enum SecuritySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface AlertThreshold {
  eventType: SecurityEventType;
  count: number;
  windowSeconds: number;
  severity: SecuritySeverity;
  action: AlertAction;
}

export enum AlertAction {
  LOG = 'LOG',
  NOTIFY = 'NOTIFY',
  BLOCK = 'BLOCK',
  LOCKOUT = 'LOCKOUT',
}

/**
 * Default alert thresholds
 */
const DEFAULT_THRESHOLDS: AlertThreshold[] = [
  {
    eventType: SecurityEventType.FAILED_AUTHENTICATION,
    count: 10,
    windowSeconds: 300, // 5 minutes
    severity: SecuritySeverity.HIGH,
    action: AlertAction.BLOCK,
  },
  {
    eventType: SecurityEventType.FAILED_AUTHENTICATION,
    count: 5,
    windowSeconds: 60, // 1 minute
    severity: SecuritySeverity.MEDIUM,
    action: AlertAction.LOCKOUT,
  },
  {
    eventType: SecurityEventType.RATE_LIMIT_VIOLATION,
    count: 100,
    windowSeconds: 60, // 1 minute
    severity: SecuritySeverity.HIGH,
    action: AlertAction.BLOCK,
  },
  {
    eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
    count: 5,
    windowSeconds: 300, // 5 minutes
    severity: SecuritySeverity.CRITICAL,
    action: AlertAction.NOTIFY,
  },
  {
    eventType: SecurityEventType.CONFIGURATION_CHANGE,
    count: 1,
    windowSeconds: 1,
    severity: SecuritySeverity.MEDIUM,
    action: AlertAction.NOTIFY,
  },
  {
    eventType: SecurityEventType.CREDENTIAL_ACCESS,
    count: 50,
    windowSeconds: 3600, // 1 hour
    severity: SecuritySeverity.HIGH,
    action: AlertAction.NOTIFY,
  },
];

/**
 * Security monitoring class
 */
export class SecurityMonitor {
  private redis: any;
  private thresholds: AlertThreshold[];
  private blockedIPs: Set<string>;
  private lockedAccounts: Set<string>;

  constructor(thresholds: AlertThreshold[] = DEFAULT_THRESHOLDS) {
    this.thresholds = thresholds;
    this.blockedIPs = new Set();
    this.lockedAccounts = new Set();
  }

  async initialize(): Promise<void> {
    this.redis = await getRedisClient();

    // Load blocked IPs from Redis
    const blockedIPs = await this.redis.smembers('security:blocked_ips');
    this.blockedIPs = new Set(blockedIPs);

    // Load locked accounts from Redis
    const lockedAccounts = await this.redis.smembers('security:locked_accounts');
    this.lockedAccounts = new Set(lockedAccounts);

    logger.info('Security monitor initialized', {
      blockedIPs: this.blockedIPs.size,
      lockedAccounts: this.lockedAccounts.size,
    });
  }

  /**
   * Record security event
   */
  async recordEvent(event: SecurityEvent): Promise<void> {
    const key = this.getEventKey(event.type, event.ipAddress, event.userId);

    // Store event in Redis with expiration
    await this.redis.lpush(key, JSON.stringify(event));
    await this.redis.expire(key, 86400); // 24 hours

    // Log security event
    logger.warn('Security event recorded', {
      type: event.type,
      severity: event.severity,
      ipAddress: event.ipAddress,
      userId: event.userId,
      resource: event.resource,
      action: event.action,
      metadata: event.metadata,
    });

    // Check thresholds and trigger alerts
    await this.checkThresholds(event);
  }

  /**
   * Check if thresholds are exceeded
   */
  private async checkThresholds(event: SecurityEvent): Promise<void> {
    const relevantThresholds = this.thresholds.filter(
      (t) => t.eventType === event.type
    );

    for (const threshold of relevantThresholds) {
      const count = await this.getEventCount(
        event.type,
        event.ipAddress,
        event.userId,
        threshold.windowSeconds
      );

      if (count >= threshold.count) {
        await this.triggerAlert(event, threshold, count);
      }
    }
  }

  /**
   * Get event count within time window
   */
  private async getEventCount(
    eventType: SecurityEventType,
    ipAddress: string,
    userId?: string,
    windowSeconds?: number
  ): Promise<number> {
    const key = this.getEventKey(eventType, ipAddress, userId);
    const events = await this.redis.lrange(key, 0, -1);

    if (!windowSeconds) {
      return events.length;
    }

    const now = Date.now();
    const cutoff = now - windowSeconds * 1000;

    const recentEvents = events.filter((eventStr: string) => {
      const e = JSON.parse(eventStr);
      return new Date(e.timestamp).getTime() >= cutoff;
    });

    return recentEvents.length;
  }

  /**
   * Trigger alert based on threshold
   */
  private async triggerAlert(
    event: SecurityEvent,
    threshold: AlertThreshold,
    count: number
  ): Promise<void> {
    logger.error('Security threshold exceeded', {
      eventType: event.type,
      threshold: threshold.count,
      actual: count,
      windowSeconds: threshold.windowSeconds,
      severity: threshold.severity,
      action: threshold.action,
      ipAddress: event.ipAddress,
      userId: event.userId,
    });

    // Execute action
    switch (threshold.action) {
      case AlertAction.BLOCK:
        await this.blockIP(event.ipAddress, 3600); // 1 hour
        break;

      case AlertAction.LOCKOUT:
        if (event.userId) {
          await this.lockAccount(event.userId, 900); // 15 minutes
        }
        break;

      case AlertAction.NOTIFY:
        await this.sendAlert(event, threshold, count);
        break;

      case AlertAction.LOG:
        // Already logged above
        break;
    }

    // Increment alert counter
    const alertKey = `security:alerts:${event.type}`;
    await this.redis.incr(alertKey);
    await this.redis.expire(alertKey, 86400); // 24 hours
  }

  /**
   * Block IP address
   */
  async blockIP(ipAddress: string, durationSeconds: number): Promise<void> {
    this.blockedIPs.add(ipAddress);

    await this.redis.sadd('security:blocked_ips', ipAddress);
    await this.redis.setex(`security:blocked_ip:${ipAddress}`, durationSeconds, '1');

    logger.warn('IP address blocked', { ipAddress, durationSeconds });

    // Schedule unblock
    setTimeout(() => {
      this.unblockIP(ipAddress);
    }, durationSeconds * 1000);
  }

  /**
   * Unblock IP address
   */
  async unblockIP(ipAddress: string): Promise<void> {
    this.blockedIPs.delete(ipAddress);
    await this.redis.srem('security:blocked_ips', ipAddress);
    await this.redis.del(`security:blocked_ip:${ipAddress}`);

    logger.info('IP address unblocked', { ipAddress });
  }

  /**
   * Lock user account
   */
  async lockAccount(userId: string, durationSeconds: number): Promise<void> {
    this.lockedAccounts.add(userId);

    await this.redis.sadd('security:locked_accounts', userId);
    await this.redis.setex(`security:locked_account:${userId}`, durationSeconds, '1');

    logger.warn('Account locked', { userId, durationSeconds });

    // Schedule unlock
    setTimeout(() => {
      this.unlockAccount(userId);
    }, durationSeconds * 1000);
  }

  /**
   * Unlock user account
   */
  async unlockAccount(userId: string): Promise<void> {
    this.lockedAccounts.delete(userId);
    await this.redis.srem('security:locked_accounts', userId);
    await this.redis.del(`security:locked_account:${userId}`);

    logger.info('Account unlocked', { userId });
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ipAddress: string): boolean {
    return this.blockedIPs.has(ipAddress);
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(userId: string): boolean {
    return this.lockedAccounts.has(userId);
  }

  /**
   * Send alert notification
   */
  private async sendAlert(
    event: SecurityEvent,
    threshold: AlertThreshold,
    count: number
  ): Promise<void> {
    // TODO: Integrate with PagerDuty, Slack, or email
    // For now, just log
    logger.error('SECURITY ALERT', {
      message: `Security threshold exceeded: ${event.type}`,
      severity: threshold.severity,
      count: count,
      threshold: threshold.count,
      ipAddress: event.ipAddress,
      userId: event.userId,
      resource: event.resource,
    });

    // Store alert in Redis for dashboard
    const alertData = {
      eventType: event.type,
      severity: threshold.severity,
      count: count,
      threshold: threshold.count,
      ipAddress: event.ipAddress,
      userId: event.userId,
      timestamp: new Date().toISOString(),
    };

    await this.redis.lpush('security:active_alerts', JSON.stringify(alertData));
    await this.redis.ltrim('security:active_alerts', 0, 99); // Keep last 100 alerts
  }

  /**
   * Get event key for Redis
   */
  private getEventKey(
    eventType: SecurityEventType,
    ipAddress: string,
    userId?: string
  ): string {
    if (userId) {
      return `security:events:${eventType}:user:${userId}`;
    }
    return `security:events:${eventType}:ip:${ipAddress}`;
  }

  /**
   * Get security metrics
   */
  async getMetrics(): Promise<any> {
    const metrics: any = {
      blockedIPs: this.blockedIPs.size,
      lockedAccounts: this.lockedAccounts.size,
      events: {},
      alerts: {},
    };

    // Get event counts
    for (const eventType of Object.values(SecurityEventType)) {
      const key = `security:events:${eventType}:*`;
      const keys = await this.redis.keys(key);
      metrics.events[eventType] = keys.length;
    }

    // Get alert counts
    for (const eventType of Object.values(SecurityEventType)) {
      const key = `security:alerts:${eventType}`;
      const count = await this.redis.get(key);
      metrics.alerts[eventType] = parseInt(count || '0', 10);
    }

    return metrics;
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<any[]> {
    const alerts = await this.redis.lrange('security:active_alerts', 0, -1);
    return alerts.map((alert: string) => JSON.parse(alert));
  }
}

/**
 * Global security monitor instance
 */
let securityMonitor: SecurityMonitor | null = null;

export async function getSecurityMonitor(): Promise<SecurityMonitor> {
  if (!securityMonitor) {
    securityMonitor = new SecurityMonitor();
    await securityMonitor.initialize();
  }
  return securityMonitor;
}

/**
 * Middleware to check if IP is blocked
 */
export function blockIPMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const monitor = await getSecurityMonitor();
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

    if (monitor.isIPBlocked(ipAddress)) {
      logger.warn('Blocked IP attempted access', { ipAddress, path: req.path });

      res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address has been temporarily blocked due to suspicious activity',
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to record authentication events
 */
export function recordAuthenticationEvent(success: boolean) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const monitor = await getSecurityMonitor();
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req as any).user?.id;

    const event: SecurityEvent = {
      type: success
        ? SecurityEventType.SUCCESSFUL_AUTHENTICATION
        : SecurityEventType.FAILED_AUTHENTICATION,
      severity: success ? SecuritySeverity.LOW : SecuritySeverity.MEDIUM,
      userId: userId,
      ipAddress: ipAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
    };

    await monitor.recordEvent(event);
    next();
  };
}

/**
 * Middleware to record unauthorized access attempts
 */
export function recordUnauthorizedAccess() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const monitor = await getSecurityMonitor();
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req as any).user?.id;

    const event: SecurityEvent = {
      type: SecurityEventType.UNAUTHORIZED_ACCESS,
      severity: SecuritySeverity.HIGH,
      userId: userId,
      ipAddress: ipAddress,
      userAgent: req.headers['user-agent'],
      resource: req.path,
      action: req.method,
      timestamp: new Date(),
    };

    await monitor.recordEvent(event);
    next();
  };
}

/**
 * Middleware to record configuration changes
 */
export function recordConfigurationChange() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const monitor = await getSecurityMonitor();
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req as any).user?.id;

    const event: SecurityEvent = {
      type: SecurityEventType.CONFIGURATION_CHANGE,
      severity: SecuritySeverity.MEDIUM,
      userId: userId,
      ipAddress: ipAddress,
      userAgent: req.headers['user-agent'],
      resource: req.path,
      action: req.method,
      metadata: {
        body: req.body,
      },
      timestamp: new Date(),
    };

    await monitor.recordEvent(event);
    next();
  };
}

/**
 * Middleware to record credential access
 */
export function recordCredentialAccess() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const monitor = await getSecurityMonitor();
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req as any).user?.id;

    const event: SecurityEvent = {
      type: SecurityEventType.CREDENTIAL_ACCESS,
      severity: SecuritySeverity.MEDIUM,
      userId: userId,
      ipAddress: ipAddress,
      userAgent: req.headers['user-agent'],
      resource: req.path,
      action: req.method,
      timestamp: new Date(),
    };

    await monitor.recordEvent(event);
    next();
  };
}

/**
 * Middleware to record rate limit violations
 */
export function recordRateLimitViolation() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const monitor = await getSecurityMonitor();
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req as any).user?.id;

    const event: SecurityEvent = {
      type: SecurityEventType.RATE_LIMIT_VIOLATION,
      severity: SecuritySeverity.MEDIUM,
      userId: userId,
      ipAddress: ipAddress,
      userAgent: req.headers['user-agent'],
      resource: req.path,
      action: req.method,
      timestamp: new Date(),
    };

    await monitor.recordEvent(event);
    next();
  };
}
