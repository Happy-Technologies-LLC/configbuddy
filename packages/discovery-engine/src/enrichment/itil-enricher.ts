/**
 * ITIL Enricher
 * Enriches discovered CIs with ITIL v4 attributes during discovery
 */

import { ITILAttributes, ITILConfigStatus } from '@cmdb/unified-model';
import { ITILClassifier } from './itil-classifier';
import { LifecycleDetector } from './lifecycle-detector';
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
  last_discovered?: Date;
  itil_attributes?: Partial<ITILAttributes>;
}

export class ITILEnricher {
  private classifier: ITILClassifier;
  private lifecycleDetector: LifecycleDetector;

  constructor() {
    this.classifier = new ITILClassifier();
    this.lifecycleDetector = new LifecycleDetector();
  }

  /**
   * Enrich discovered CIs with ITIL attributes
   *
   * Sets:
   * - ci_class (inferred from CI type)
   * - lifecycle_stage (detected from metadata or defaulted)
   * - configuration_status (defaulted to 'active')
   * - version (from metadata or '1.0.0')
   * - last_audited (current timestamp)
   * - audit_status (defaulted to 'unknown')
   *
   * @param cis - Array of discovered CIs to enrich
   * @returns Array of enriched CIs with ITIL attributes
   */
  async enrichWithITIL<T extends CIForEnrichment>(cis: T[]): Promise<T[]> {
    logger.info(`Enriching ${cis.length} CIs with ITIL attributes`);

    const enrichedCIs = cis.map((ci) => this.enrichSingleCI(ci));

    logger.info(
      `Successfully enriched ${enrichedCIs.length} CIs with ITIL attributes`
    );

    return enrichedCIs;
  }

  /**
   * Enrich a single CI with ITIL attributes
   * @param ci - The CI to enrich
   * @returns The enriched CI
   */
  private enrichSingleCI<T extends CIForEnrichment>(ci: T): T {
    // Get CI type (handle both _type and type fields)
    const ciType = (ci._type || ci.type) as any;
    const metadata = ci.metadata || {};

    // Infer ITIL class
    const ciClass = this.classifier.inferITILClass(ciType, metadata);

    // Detect lifecycle stage
    const lifecycleStage = this.lifecycleDetector.detectLifecycleStage(ci);

    // Determine configuration status
    const configurationStatus = this.determineConfigurationStatus(ci);

    // Extract version
    const version = this.extractVersion(ci);

    // Build ITIL attributes
    const itilAttributes: ITILAttributes = {
      ci_class: ciClass,
      lifecycle_stage: lifecycleStage,
      configuration_status: configurationStatus,
      version: version,
      last_audited: new Date(),
      audit_status: 'unknown', // Will be updated by audit process
      // baseline_id is optional and not set during discovery
    };

    logger.debug('Enriched CI with ITIL attributes', {
      ciId: ci._id || ci.id,
      ciName: ci.name,
      ciType: ciType,
      itilClass: ciClass,
      lifecycleStage: lifecycleStage,
      configurationStatus: configurationStatus,
      version: version,
    });

    // Return enriched CI with ITIL attributes
    return {
      ...ci,
      itil_attributes: itilAttributes,
    };
  }

  /**
   * Determine configuration status from CI status and metadata
   * @param ci - The configuration item
   * @returns The ITIL configuration status
   */
  private determineConfigurationStatus(
    ci: CIForEnrichment
  ): ITILConfigStatus {
    const metadata = ci.metadata || {};

    // Check if CI is inactive or decommissioned
    if (ci.status === 'inactive' || ci.status === 'decommissioned') {
      return 'retired';
    }

    // Check if CI is in maintenance
    if (ci.status === 'maintenance') {
      return 'maintenance';
    }

    // Check metadata for provisioning state
    if (
      metadata.provisioning_state === 'creating' ||
      metadata.state === 'pending'
    ) {
      return 'in_development';
    }

    if (
      metadata.provisioning_state === 'ordered' ||
      metadata.order_status === 'ordered'
    ) {
      return 'ordered';
    }

    // Check for planned state
    if (metadata.lifecycle === 'planning' || metadata.state === 'planned') {
      return 'planned';
    }

    // Check for disposed state
    if (
      metadata.state === 'disposed' ||
      metadata.state === 'deleted' ||
      metadata.state === 'terminated'
    ) {
      return 'disposed';
    }

    // Default to active for most discovered CIs
    return 'active';
  }

  /**
   * Extract version from CI metadata
   * Tries multiple common version fields
   *
   * @param ci - The configuration item
   * @returns The extracted version or default '1.0.0'
   */
  private extractVersion(ci: CIForEnrichment): string {
    const metadata = ci.metadata || {};

    // Try various common version fields
    const versionFields = [
      'version',
      'release_version',
      'image_version',
      'os_version',
      'software_version',
      'app_version',
      'platform_version',
      'engine_version',
      'runtime_version',
      'tag',
    ];

    for (const field of versionFields) {
      if (metadata[field]) {
        const version = String(metadata[field]);
        // Basic validation - should contain numbers and dots
        if (/\d/.test(version)) {
          return version;
        }
      }
    }

    // Check for Docker image tags
    if (metadata.image && typeof metadata.image === 'string') {
      const imageTagMatch = metadata.image.match(/:([^:]+)$/);
      if (imageTagMatch && imageTagMatch[1] !== 'latest') {
        return imageTagMatch[1];
      }
    }

    // Check for Kubernetes labels
    if (metadata.labels && metadata.labels.version) {
      return String(metadata.labels.version);
    }

    // Default version
    return '1.0.0';
  }

  /**
   * Get enrichment statistics for monitoring
   * @returns Object with enrichment stats
   */
  getEnrichmentStats() {
    return {
      classifier: {
        supportedTypes: this.classifier.getSupportedCITypes().length,
        rules: this.classifier.getClassificationRules().size,
      },
      lifecycleDetector: {
        stages: 7, // planning, design, build, test, deploy, operate, retire
      },
    };
  }
}
