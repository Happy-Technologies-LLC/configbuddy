/**
 * BSM Enricher
 * Enriches discovered CIs with BSM (Business Service Mapping) impact attributes
 */

import { BSMCIAttributes, DataClassification, BusinessCriticality } from '@cmdb/unified-model';
import { logger } from '@cmdb/common';

/**
 * Partial CI interface for enrichment
 * Matches the structure of discovered CIs
 */
interface CIForEnrichment {
  _id?: string;
  id?: string;
  name?: string;
  _type?: string;
  type?: string;
  status?: string;
  environment?: string;
  metadata?: Record<string, any>;
  discovery_provider?: string;
  itil_attributes?: any;
  tbm_attributes?: any;
  bsm_attributes?: Partial<BSMCIAttributes>;
}

export class BSMEnricher {
  constructor() {
    // BSM enricher is self-contained and doesn't need external services
  }

  /**
   * Enrich discovered CIs with BSM attributes
   *
   * Sets:
   * - business_criticality (inferred from CI type and environment)
   * - supports_business_services (initially empty array, populated by relationship analysis)
   * - customer_facing (detected from metadata or CI type)
   * - compliance_scope (detected from tags, labels, or environment)
   * - data_classification (determined by environment and compliance scope)
   *
   * @param cis - Array of discovered CIs to enrich
   * @returns Array of enriched CIs with BSM attributes
   */
  async enrichWithBSM<T extends CIForEnrichment>(cis: T[]): Promise<T[]> {
    logger.info(`Enriching ${cis.length} CIs with BSM attributes`);

    const startTime = Date.now();

    // Process CIs in batches for performance
    const batchSize = 100;
    const enrichedCIs: T[] = [];

    for (let i = 0; i < cis.length; i += batchSize) {
      const batch = cis.slice(i, i + batchSize);
      const enrichedBatch = batch.map((ci) => this.enrichSingleCI(ci));
      enrichedCIs.push(...enrichedBatch);

      logger.debug(`Enriched batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(cis.length / batchSize)}`, {
        batchSize: batch.length,
      });
    }

    const duration = Date.now() - startTime;
    const avgTimePerCI = duration / cis.length;

    logger.info(
      `Successfully enriched ${enrichedCIs.length} CIs with BSM attributes`,
      {
        totalDuration: `${duration}ms`,
        avgTimePerCI: `${avgTimePerCI.toFixed(2)}ms`,
      }
    );

    return enrichedCIs;
  }

  /**
   * Enrich a single CI with BSM attributes
   * @param ci - The CI to enrich
   * @returns The enriched CI
   */
  private enrichSingleCI<T extends CIForEnrichment>(ci: T): T {
    const ciType = (ci._type || ci.type) as any;
    const ciId = ci._id || ci.id || 'unknown';
    const metadata = ci.metadata || {};
    const environment = ci.environment;

    try {
      // 1. Infer business criticality from environment and CI type
      const businessCriticality = this.inferBusinessCriticality(
        ciType,
        environment,
        metadata
      );

      // 2. Detect if customer-facing
      const customerFacing = this.detectCustomerFacing(ciType, metadata);

      // 3. Determine compliance scope from tags/labels
      const complianceScope = this.extractComplianceScope(metadata, environment);

      // 4. Classify data sensitivity
      const dataClassification = this.classifyDataSensitivity(
        metadata,
        environment,
        complianceScope
      );

      // 5. Initially empty business service relationships (populated later by relationship engine)
      const supportsBusinessServices: string[] = [];

      // Build BSM attributes
      const bsmAttributes: BSMCIAttributes = {
        business_criticality: businessCriticality,
        supports_business_services: supportsBusinessServices,
        customer_facing: customerFacing,
        compliance_scope: complianceScope,
        data_classification: dataClassification,
      };

      logger.debug('Enriched CI with BSM attributes', {
        ciId: ciId,
        ciName: ci.name,
        ciType: ciType,
        businessCriticality: businessCriticality,
        customerFacing: customerFacing,
        complianceScope: complianceScope.length > 0 ? complianceScope : 'none',
        dataClassification: dataClassification,
      });

      // Return enriched CI with BSM attributes
      return {
        ...ci,
        bsm_attributes: bsmAttributes,
      };
    } catch (error) {
      logger.error('Error enriching CI with BSM attributes', {
        ciId: ciId,
        ciName: ci.name,
        ciType: ciType,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return CI with default BSM attributes on error
      return {
        ...ci,
        bsm_attributes: this.getDefaultBSMAttributes(),
      };
    }
  }

  /**
   * Infer business criticality from CI type and environment
   */
  private inferBusinessCriticality(
    ciType: any,
    environment?: string,
    metadata?: Record<string, any>
  ): BusinessCriticality {
    // Production resources are typically more critical
    if (environment === 'production') {
      // Databases and storage in production are typically tier_1 or tier_2
      if (
        ciType === 'database' ||
        ciType === 'storage' ||
        ciType === 'data-store'
      ) {
        // Check if labeled as critical or has high availability config
        if (
          metadata?.tags?.includes('critical') ||
          metadata?.labels?.criticality === 'high' ||
          metadata?.high_availability === true ||
          metadata?.multi_az === true
        ) {
          return 'tier_1'; // Mission-critical
        }
        return 'tier_2'; // Important
      }

      // Load balancers, API gateways in production are tier_1
      if (
        ciType === 'load-balancer' ||
        ciType === 'api-gateway' ||
        ciType === 'ingress-controller'
      ) {
        return 'tier_1'; // Mission-critical
      }

      // Application servers in production are tier_2
      if (
        ciType === 'server' ||
        ciType === 'application' ||
        ciType === 'service' ||
        ciType === 'container'
      ) {
        return 'tier_2'; // Important
      }

      // Default for production
      return 'tier_2';
    }

    // Staging is typically tier_3
    if (environment === 'staging') {
      return 'tier_3';
    }

    // Development and test are tier_4
    if (environment === 'development' || environment === 'test') {
      return 'tier_4';
    }

    // Default to tier_3 for unknown environments
    return 'tier_3';
  }

  /**
   * Detect if CI is customer-facing
   */
  private detectCustomerFacing(
    ciType: any,
    metadata?: Record<string, any>
  ): boolean {
    // Check explicit metadata flags
    if (metadata?.customer_facing === true) {
      return true;
    }

    if (metadata?.public === true || metadata?.internet_facing === true) {
      return true;
    }

    // Check tags/labels
    const tags = metadata?.tags || [];
    const labels = metadata?.labels || {};

    if (
      tags.includes('customer-facing') ||
      tags.includes('public') ||
      tags.includes('external')
    ) {
      return true;
    }

    if (
      labels.tier === 'frontend' ||
      labels.tier === 'web' ||
      labels.exposure === 'public'
    ) {
      return true;
    }

    // Load balancers and API gateways are typically customer-facing
    if (
      ciType === 'load-balancer' ||
      ciType === 'api-gateway' ||
      ciType === 'cdn' ||
      ciType === 'edge-location'
    ) {
      return true;
    }

    // Default to false
    return false;
  }

  /**
   * Extract compliance scope from metadata
   */
  private extractComplianceScope(
    metadata?: Record<string, any>,
    environment?: string
  ): string[] {
    const complianceScope: string[] = [];

    // Check explicit compliance metadata
    if (metadata?.compliance && Array.isArray(metadata.compliance)) {
      complianceScope.push(...metadata.compliance);
    }

    // Check tags for compliance frameworks
    const tags = metadata?.tags || [];
    const complianceFrameworks = [
      'GDPR',
      'HIPAA',
      'PCI_DSS',
      'SOX',
      'FINRA',
      'ISO27001',
      'SOC2',
    ];

    for (const framework of complianceFrameworks) {
      if (
        tags.includes(framework) ||
        tags.includes(framework.toLowerCase()) ||
        tags.includes(framework.replace('_', '-').toLowerCase())
      ) {
        complianceScope.push(framework);
      }
    }

    // Check labels for compliance
    const labels = metadata?.labels || {};
    if (labels.compliance) {
      const frameworksFromLabel = Array.isArray(labels.compliance)
        ? labels.compliance
        : [labels.compliance];
      complianceScope.push(...frameworksFromLabel);
    }

    // Production environments may have SOX/SOC2 scope by default
    if (environment === 'production' && complianceScope.length === 0) {
      // Check for financial or regulated industry indicators
      if (
        metadata?.industry === 'finance' ||
        metadata?.industry === 'healthcare' ||
        tags.includes('regulated')
      ) {
        complianceScope.push('SOX');
        complianceScope.push('SOC2');
      }
    }

    // Remove duplicates
    return [...new Set(complianceScope)];
  }

  /**
   * Classify data sensitivity based on environment and compliance scope
   */
  private classifyDataSensitivity(
    metadata?: Record<string, any>,
    environment?: string,
    complianceScope?: string[]
  ): DataClassification {
    // Check explicit data classification
    if (metadata?.data_classification) {
      const classification = String(metadata.data_classification).toLowerCase();
      if (classification === 'public') return 'public';
      if (classification === 'internal') return 'internal';
      if (classification === 'confidential') return 'confidential';
      if (classification === 'restricted') return 'restricted';
      if (classification === 'highly_restricted') return 'highly_restricted';
    }

    // Check tags/labels
    const tags = metadata?.tags || [];
    const labels = metadata?.labels || {};

    if (
      tags.includes('public') ||
      labels.data_classification === 'public'
    ) {
      return 'public';
    }

    if (
      tags.includes('restricted') ||
      labels.data_classification === 'restricted'
    ) {
      return 'restricted';
    }

    if (
      tags.includes('confidential') ||
      labels.data_classification === 'confidential'
    ) {
      return 'confidential';
    }

    // Infer from compliance scope
    if (complianceScope && complianceScope.length > 0) {
      // HIPAA, PCI_DSS, FINRA indicate highly restricted data
      if (
        complianceScope.includes('HIPAA') ||
        complianceScope.includes('PCI_DSS') ||
        complianceScope.includes('FINRA')
      ) {
        return 'highly_restricted';
      }

      // GDPR, SOX indicate restricted data
      if (complianceScope.includes('GDPR') || complianceScope.includes('SOX')) {
        return 'restricted';
      }

      // Other compliance frameworks indicate confidential
      return 'confidential';
    }

    // Infer from environment
    if (environment === 'production') {
      return 'confidential'; // Default for production
    }

    if (environment === 'staging') {
      return 'internal'; // Staging typically has internal data
    }

    // Default to internal for unknown
    return 'internal';
  }

  /**
   * Get default BSM attributes (fallback)
   */
  private getDefaultBSMAttributes(): BSMCIAttributes {
    return {
      business_criticality: 'tier_3', // Standard
      supports_business_services: [],
      customer_facing: false,
      compliance_scope: [],
      data_classification: 'internal',
    };
  }

  /**
   * Get enrichment statistics for monitoring
   * @returns Object with enrichment stats
   */
  getEnrichmentStats() {
    return {
      criticalityTiers: 5, // tier_0 through tier_4
      dataClassifications: 5, // public, internal, confidential, restricted, highly_restricted
      complianceFrameworks: [
        'GDPR',
        'HIPAA',
        'PCI_DSS',
        'SOX',
        'FINRA',
        'ISO27001',
        'SOC2',
      ],
      detectionSources: {
        metadata: ['tags', 'labels', 'annotations'],
        environment: ['production', 'staging', 'development', 'test'],
        ciType: ['load-balancer', 'database', 'api-gateway', 'storage'],
      },
    };
  }
}
