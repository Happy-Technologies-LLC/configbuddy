// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Unit Tests for Configuration Drift Detector
 */

import { ConfigurationDriftDetector } from '../../src/engines/configuration-drift-detector';

describe('ConfigurationDriftDetector', () => {
  let detector: ConfigurationDriftDetector;

  beforeEach(() => {
    detector = new ConfigurationDriftDetector();
  });

  describe('detectDrift', () => {
    it('should detect configuration drift from baseline', async () => {
      const baseline = {
        ci_id: 'ci-001',
        config: {
          hostname: 'web-server-01',
          cpu_cores: 8,
          memory_gb: 32,
          os_version: 'Ubuntu 22.04',
          packages: ['nginx', 'nodejs', 'postgresql'],
        },
        captured_at: new Date('2024-01-01'),
      };

      const current = {
        ci_id: 'ci-001',
        config: {
          hostname: 'web-server-01',
          cpu_cores: 8,
          memory_gb: 32,
          os_version: 'Ubuntu 24.04', // CHANGED
          packages: ['nginx', 'nodejs', 'postgresql', 'redis'], // ADDED redis
        },
        captured_at: new Date('2024-01-15'),
      };

      const result = await detector.detectDrift(baseline, current);

      expect(result.driftDetected).toBe(true);
      expect(result.driftScore).toBeGreaterThan(0);
      expect(result.changedFields.length).toBeGreaterThan(0);
      expect(result.changedFields).toContain('os_version');
      expect(result.changedFields).toContain('packages');
    });

    it('should not detect drift when configurations are identical', async () => {
      const config = {
        ci_id: 'ci-002',
        config: {
          hostname: 'db-server-01',
          cpu_cores: 16,
          memory_gb: 64,
          version: '15.4',
        },
        captured_at: new Date('2024-01-01'),
      };

      const result = await detector.detectDrift(config, config);

      expect(result.driftDetected).toBe(false);
      expect(result.driftScore).toBe(0);
      expect(result.changedFields).toHaveLength(0);
    });

    it('should classify drift severity', async () => {
      const baseline = {
        ci_id: 'ci-003',
        config: {
          security_patch_level: '2024-01',
          firewall_enabled: true,
          encryption_enabled: true,
        },
        captured_at: new Date('2024-01-01'),
      };

      const current = {
        ci_id: 'ci-003',
        config: {
          security_patch_level: '2023-06', // Out of date - CRITICAL
          firewall_enabled: false, // Disabled - CRITICAL
          encryption_enabled: false, // Disabled - CRITICAL
        },
        captured_at: new Date('2024-01-15'),
      };

      const result = await detector.detectDrift(baseline, current);

      expect(result.driftDetected).toBe(true);
      expect(result.severity).toBe('critical');
      expect(result.driftScore).toBeGreaterThan(0.7);
    });

    it('should detect added fields', async () => {
      const baseline = {
        ci_id: 'ci-004',
        config: {
          app_name: 'web-app',
          version: '1.0.0',
        },
        captured_at: new Date('2024-01-01'),
      };

      const current = {
        ci_id: 'ci-004',
        config: {
          app_name: 'web-app',
          version: '1.0.0',
          debug_mode: true, // NEW FIELD
          log_level: 'debug', // NEW FIELD
        },
        captured_at: new Date('2024-01-15'),
      };

      const result = await detector.detectDrift(baseline, current);

      expect(result.driftDetected).toBe(true);
      expect(result.addedFields).toContain('debug_mode');
      expect(result.addedFields).toContain('log_level');
    });

    it('should detect removed fields', async () => {
      const baseline = {
        ci_id: 'ci-005',
        config: {
          app_name: 'api-service',
          version: '2.0.0',
          rate_limit: 1000,
          cache_enabled: true,
        },
        captured_at: new Date('2024-01-01'),
      };

      const current = {
        ci_id: 'ci-005',
        config: {
          app_name: 'api-service',
          version: '2.0.0',
          // rate_limit and cache_enabled removed
        },
        captured_at: new Date('2024-01-15'),
      };

      const result = await detector.detectDrift(baseline, current);

      expect(result.driftDetected).toBe(true);
      expect(result.removedFields).toContain('rate_limit');
      expect(result.removedFields).toContain('cache_enabled');
    });

    it('should calculate drift percentage', async () => {
      const baseline = {
        ci_id: 'ci-006',
        config: {
          field1: 'value1',
          field2: 'value2',
          field3: 'value3',
          field4: 'value4',
          field5: 'value5',
        },
        captured_at: new Date('2024-01-01'),
      };

      const current = {
        ci_id: 'ci-006',
        config: {
          field1: 'value1',
          field2: 'CHANGED', // 1 changed
          field3: 'value3',
          field4: 'value4',
          field5: 'value5',
        },
        captured_at: new Date('2024-01-15'),
      };

      const result = await detector.detectDrift(baseline, current);

      expect(result.driftPercentage).toBeCloseTo(20, 0); // 1/5 = 20%
    });

    it('should include recommendations for drift remediation', async () => {
      const baseline = {
        ci_id: 'ci-007',
        config: {
          firewall_enabled: true,
          antivirus_enabled: true,
        },
        captured_at: new Date('2024-01-01'),
      };

      const current = {
        ci_id: 'ci-007',
        config: {
          firewall_enabled: false,
          antivirus_enabled: false,
        },
        captured_at: new Date('2024-01-15'),
      };

      const result = await detector.detectDrift(baseline, current);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some((r) => r.includes('security') || r.includes('firewall'))).toBe(true);
    });
  });

  describe('detectDriftAcrossEnvironments', () => {
    it('should detect configuration drift between environments', async () => {
      const production = {
        ci_id: 'app-prod',
        config: {
          debug_mode: false,
          log_level: 'error',
          rate_limit: 10000,
        },
        captured_at: new Date(),
      };

      const staging = {
        ci_id: 'app-staging',
        config: {
          debug_mode: true, // Different
          log_level: 'debug', // Different
          rate_limit: 10000,
        },
        captured_at: new Date(),
      };

      const result = await detector.detectDriftAcrossEnvironments(production, staging);

      expect(result.driftDetected).toBe(true);
      expect(result.changedFields).toContain('debug_mode');
      expect(result.changedFields).toContain('log_level');
    });

    it('should allow expected environment-specific differences', async () => {
      const production = {
        ci_id: 'app-prod',
        config: {
          db_host: 'prod-db.example.com',
          cache_host: 'prod-cache.example.com',
          log_level: 'error',
        },
        captured_at: new Date(),
      };

      const staging = {
        ci_id: 'app-staging',
        config: {
          db_host: 'staging-db.example.com',
          cache_host: 'staging-cache.example.com',
          log_level: 'error',
        },
        captured_at: new Date(),
      };

      const result = await detector.detectDriftAcrossEnvironments(production, staging, {
        ignoreFields: ['db_host', 'cache_host'],
      });

      expect(result.driftDetected).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle deeply nested configurations', async () => {
      const baseline = {
        ci_id: 'ci-008',
        config: {
          server: {
            network: {
              interfaces: {
                eth0: { ip: '10.0.0.1', mask: '255.255.255.0' },
              },
            },
          },
        },
        captured_at: new Date('2024-01-01'),
      };

      const current = {
        ci_id: 'ci-008',
        config: {
          server: {
            network: {
              interfaces: {
                eth0: { ip: '10.0.0.2', mask: '255.255.255.0' }, // Changed
              },
            },
          },
        },
        captured_at: new Date('2024-01-15'),
      };

      const result = await detector.detectDrift(baseline, current);

      expect(result.driftDetected).toBe(true);
    });

    it('should handle array differences', async () => {
      const baseline = {
        ci_id: 'ci-009',
        config: {
          allowed_ips: ['10.0.0.1', '10.0.0.2', '10.0.0.3'],
        },
        captured_at: new Date('2024-01-01'),
      };

      const current = {
        ci_id: 'ci-009',
        config: {
          allowed_ips: ['10.0.0.1', '10.0.0.2', '10.0.0.4'], // Changed one IP
        },
        captured_at: new Date('2024-01-15'),
      };

      const result = await detector.detectDrift(baseline, current);

      expect(result.driftDetected).toBe(true);
    });

    it('should handle null and undefined values', async () => {
      const baseline = {
        ci_id: 'ci-010',
        config: {
          value1: null,
          value2: undefined,
          value3: 'exists',
        },
        captured_at: new Date('2024-01-01'),
      };

      const current = {
        ci_id: 'ci-010',
        config: {
          value1: 'now-set',
          value2: 'now-set',
          value3: 'exists',
        },
        captured_at: new Date('2024-01-15'),
      };

      const result = await detector.detectDrift(baseline, current);

      expect(result.driftDetected).toBe(true);
    });
  });
});
