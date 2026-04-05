// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Tests for ITILEnricher
 */

import { ITILEnricher } from '../../src/enrichment/itil-enricher';

describe('ITILEnricher', () => {
  let enricher: ITILEnricher;

  beforeEach(() => {
    enricher = new ITILEnricher();
  });

  describe('enrichWithITIL', () => {
    it('should enrich a single CI with ITIL attributes', async () => {
      const cis = [
        {
          _id: 'ci-server-001',
          name: 'Web Server 1',
          _type: 'server',
          status: 'active',
          environment: 'production',
          metadata: {
            os: 'Ubuntu 22.04',
            version: '1.2.3',
          },
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);

      expect(enriched).toHaveLength(1);
      expect(enriched[0]).toHaveProperty('itil_attributes');
      expect(enriched[0].itil_attributes).toMatchObject({
        ci_class: 'hardware',
        lifecycle_stage: 'operate',
        configuration_status: 'active',
        version: '1.2.3',
        audit_status: 'unknown',
      });
      expect(enriched[0].itil_attributes.last_audited).toBeInstanceOf(Date);
    });

    it('should enrich multiple CIs with ITIL attributes', async () => {
      const cis = [
        {
          _id: 'ci-server-001',
          name: 'Web Server 1',
          _type: 'server',
          status: 'active',
          metadata: {},
        },
        {
          _id: 'ci-vm-001',
          name: 'App VM 1',
          _type: 'virtual-machine',
          status: 'active',
          metadata: {},
        },
        {
          _id: 'ci-app-001',
          name: 'Web App',
          _type: 'application',
          status: 'active',
          metadata: {},
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);

      expect(enriched).toHaveLength(3);
      expect(enriched[0].itil_attributes.ci_class).toBe('hardware');
      expect(enriched[1].itil_attributes.ci_class).toBe('software');
      expect(enriched[2].itil_attributes.ci_class).toBe('software');
    });

    it('should handle CIs with type field instead of _type', async () => {
      const cis = [
        {
          id: 'ci-container-001',
          name: 'Web Container',
          type: 'container',
          status: 'active',
          metadata: {},
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);

      expect(enriched[0].itil_attributes.ci_class).toBe('software');
    });

    it('should preserve existing CI properties', async () => {
      const cis = [
        {
          _id: 'ci-server-001',
          name: 'Web Server 1',
          _type: 'server',
          status: 'active',
          owner: 'team-a',
          metadata: { custom: 'value' },
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);

      expect(enriched[0]._id).toBe('ci-server-001');
      expect(enriched[0].name).toBe('Web Server 1');
      expect(enriched[0].owner).toBe('team-a');
      expect(enriched[0].metadata.custom).toBe('value');
    });
  });

  describe('Configuration status determination', () => {
    it('should set configuration_status to active for active CIs', async () => {
      const cis = [
        {
          _id: 'ci-001',
          _type: 'server',
          status: 'active',
          metadata: {},
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);
      expect(enriched[0].itil_attributes.configuration_status).toBe('active');
    });

    it('should set configuration_status to retired for inactive CIs', async () => {
      const cis = [
        {
          _id: 'ci-001',
          _type: 'server',
          status: 'inactive',
          metadata: {},
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);
      expect(enriched[0].itil_attributes.configuration_status).toBe('retired');
    });

    it('should set configuration_status to maintenance for maintenance CIs', async () => {
      const cis = [
        {
          _id: 'ci-001',
          _type: 'server',
          status: 'maintenance',
          metadata: {},
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);
      expect(enriched[0].itil_attributes.configuration_status).toBe('maintenance');
    });

    it('should set configuration_status to in_development for creating CIs', async () => {
      const cis = [
        {
          _id: 'ci-001',
          _type: 'server',
          status: 'active',
          metadata: { provisioning_state: 'creating' },
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);
      expect(enriched[0].itil_attributes.configuration_status).toBe('in_development');
    });

    it('should set configuration_status to ordered for ordered CIs', async () => {
      const cis = [
        {
          _id: 'ci-001',
          _type: 'server',
          status: 'active',
          metadata: { order_status: 'ordered' },
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);
      expect(enriched[0].itil_attributes.configuration_status).toBe('ordered');
    });

    it('should set configuration_status to planned for planning CIs', async () => {
      const cis = [
        {
          _id: 'ci-001',
          _type: 'server',
          status: 'active',
          metadata: { lifecycle: 'planning' },
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);
      expect(enriched[0].itil_attributes.configuration_status).toBe('planned');
    });

    it('should set configuration_status to disposed for deleted CIs', async () => {
      const cis = [
        {
          _id: 'ci-001',
          _type: 'server',
          status: 'active',
          metadata: { state: 'deleted' },
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);
      expect(enriched[0].itil_attributes.configuration_status).toBe('disposed');
    });
  });

  describe('Version extraction', () => {
    it('should extract version from metadata.version', async () => {
      const cis = [
        {
          _id: 'ci-001',
          _type: 'application',
          metadata: { version: '2.3.4' },
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);
      expect(enriched[0].itil_attributes.version).toBe('2.3.4');
    });

    it('should extract version from metadata.image_version', async () => {
      const cis = [
        {
          _id: 'ci-001',
          _type: 'container',
          metadata: { image_version: '3.0.1' },
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);
      expect(enriched[0].itil_attributes.version).toBe('3.0.1');
    });

    it('should extract version from metadata.os_version', async () => {
      const cis = [
        {
          _id: 'ci-001',
          _type: 'server',
          metadata: { os_version: 'Ubuntu 22.04' },
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);
      expect(enriched[0].itil_attributes.version).toBe('Ubuntu 22.04');
    });

    it('should extract version from Docker image tag', async () => {
      const cis = [
        {
          _id: 'ci-001',
          _type: 'container',
          metadata: { image: 'nginx:1.21.6' },
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);
      expect(enriched[0].itil_attributes.version).toBe('1.21.6');
    });

    it('should not use "latest" tag as version', async () => {
      const cis = [
        {
          _id: 'ci-001',
          _type: 'container',
          metadata: { image: 'nginx:latest' },
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);
      expect(enriched[0].itil_attributes.version).toBe('1.0.0');
    });

    it('should extract version from Kubernetes labels', async () => {
      const cis = [
        {
          _id: 'ci-001',
          _type: 'container',
          metadata: { labels: { version: '4.5.6' } },
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);
      expect(enriched[0].itil_attributes.version).toBe('4.5.6');
    });

    it('should default to 1.0.0 if no version found', async () => {
      const cis = [
        {
          _id: 'ci-001',
          _type: 'server',
          metadata: {},
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);
      expect(enriched[0].itil_attributes.version).toBe('1.0.0');
    });

    it('should skip non-numeric version fields', async () => {
      const cis = [
        {
          _id: 'ci-001',
          _type: 'server',
          metadata: { version: 'not-a-version', os_version: '22.04' },
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);
      expect(enriched[0].itil_attributes.version).toBe('22.04');
    });
  });

  describe('Lifecycle stage detection integration', () => {
    it('should detect operate stage for production CIs', async () => {
      const cis = [
        {
          _id: 'ci-001',
          _type: 'server',
          status: 'active',
          environment: 'production',
          metadata: {},
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);
      expect(enriched[0].itil_attributes.lifecycle_stage).toBe('operate');
    });

    it('should detect test stage for test environment CIs', async () => {
      const cis = [
        {
          _id: 'ci-001',
          _type: 'server',
          status: 'active',
          environment: 'test',
          metadata: { state: 'running' },
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);
      expect(enriched[0].itil_attributes.lifecycle_stage).toBe('test');
    });

    it('should detect build stage for CIs being created', async () => {
      const cis = [
        {
          _id: 'ci-001',
          _type: 'server',
          status: 'active',
          metadata: { provisioning_state: 'creating' },
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);
      expect(enriched[0].itil_attributes.lifecycle_stage).toBe('build');
    });

    it('should detect retire stage for decommissioned CIs', async () => {
      const cis = [
        {
          _id: 'ci-001',
          _type: 'server',
          status: 'decommissioned',
          metadata: {},
        },
      ];

      const enriched = await enricher.enrichWithITIL(cis);
      expect(enriched[0].itil_attributes.lifecycle_stage).toBe('retire');
    });
  });

  describe('getEnrichmentStats', () => {
    it('should return enrichment statistics', () => {
      const stats = enricher.getEnrichmentStats();

      expect(stats).toHaveProperty('classifier');
      expect(stats).toHaveProperty('lifecycleDetector');
      expect(stats.classifier.supportedTypes).toBeGreaterThan(0);
      expect(stats.classifier.rules).toBeGreaterThan(0);
      expect(stats.lifecycleDetector.stages).toBe(7);
    });
  });
});
