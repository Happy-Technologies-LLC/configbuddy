/**
 * Allocation Method Selector
 * Determines the appropriate cost allocation method for CIs
 */

import { CIType, Environment } from '@cmdb/unified-model';
import { AllocationMethod, TBMResourceTower } from '@cmdb/unified-model';
import { logger } from '@cmdb/common';

/**
 * Partial CI interface for allocation decisions
 */
interface CIForAllocation {
  type: CIType;
  environment?: Environment;
  metadata?: Record<string, any>;
}

/**
 * Determines the appropriate cost allocation method
 * based on CI characteristics and usage patterns
 */
export class AllocationMethodSelector {
  /**
   * Determine the allocation method for a CI
   *
   * Rules:
   * - Dedicated resources → DIRECT
   * - Shared compute resources → USAGE_BASED
   * - Shared infrastructure (network, storage) → EQUAL_SPLIT
   * - Application-specific → DIRECT
   *
   * @param ci - The configuration item
   * @param tower - The TBM resource tower
   * @returns The cost allocation method
   */
  determineAllocationMethod(
    ci: CIForAllocation,
    tower: TBMResourceTower
  ): AllocationMethod {
    const metadata = ci.metadata || {};

    // Check if CI is explicitly marked as dedicated or shared
    if (this.isDedicatedResource(metadata)) {
      logger.debug('CI is dedicated resource, using DIRECT allocation', {
        ciType: ci.type,
      });
      return 'direct';
    }

    if (this.isSharedResource(metadata)) {
      // Shared compute should use usage-based allocation
      if (tower === 'compute' || tower === 'data') {
        logger.debug('CI is shared compute/data resource, using USAGE_BASED allocation', {
          ciType: ci.type,
          tower,
        });
        return 'usage_based';
      }

      // Shared infrastructure uses equal split
      logger.debug('CI is shared infrastructure resource, using EQUAL_SPLIT allocation', {
        ciType: ci.type,
        tower,
      });
      return 'equal';
    }

    // Apply default rules based on CI type and tower
    return this.applyDefaultAllocationRules(ci, tower);
  }

  /**
   * Check if resource is dedicated
   */
  private isDedicatedResource(metadata: Record<string, any>): boolean {
    // Explicit dedication marker
    if (metadata.dedicated === true || metadata.tenancy === 'dedicated') {
      return true;
    }

    // Reserved instances are typically dedicated
    if (metadata.reservationType === 'reserved' || metadata.instanceType?.includes('reserved')) {
      return true;
    }

    // Single-tenant indicators
    if (metadata.tenancy === 'host' || metadata.tenancy === 'single-tenant') {
      return true;
    }

    return false;
  }

  /**
   * Check if resource is shared
   */
  private isSharedResource(metadata: Record<string, any>): boolean {
    // Explicit sharing marker
    if (metadata.shared === true || metadata.tenancy === 'multi-tenant') {
      return true;
    }

    // Shared infrastructure indicators
    const sharedKeywords = ['shared', 'pool', 'cluster', 'fleet'];
    const name = (metadata.name || '').toLowerCase();

    if (sharedKeywords.some((keyword) => name.includes(keyword))) {
      return true;
    }

    // Multiple consumers indicator
    if (metadata.consumers && Array.isArray(metadata.consumers) && metadata.consumers.length > 1) {
      return true;
    }

    return false;
  }

  /**
   * Apply default allocation rules based on CI type and tower
   */
  private applyDefaultAllocationRules(
    ci: CIForAllocation,
    tower: TBMResourceTower
  ): AllocationMethod {
    const metadata = ci.metadata || {};

    // Compute tower defaults
    if (tower === 'compute') {
      // Virtual machines - check if clustered
      if (ci.type === 'virtual-machine') {
        if (metadata.cluster || metadata.autoscalingGroup) {
          return 'usage_based'; // Part of auto-scaling group
        }
        return 'direct'; // Standalone VM
      }

      // Containers are typically usage-based (shared orchestration)
      if (ci.type === 'container') {
        return 'usage_based';
      }

      // Physical servers are typically dedicated
      if (ci.type === 'server') {
        return 'direct';
      }

      return 'usage_based'; // Default for compute
    }

    // Storage tower defaults
    if (tower === 'storage') {
      // Block storage is typically direct
      if (metadata.storageType === 'block' || ci.type === 'storage') {
        return 'direct';
      }

      // Object storage is typically usage-based
      if (metadata.storageType === 'object') {
        return 'usage_based';
      }

      return 'usage_based'; // Default for storage
    }

    // Network tower defaults
    if (tower === 'network') {
      // Load balancers are typically shared
      if (ci.type === 'load-balancer') {
        return 'usage_based';
      }

      // Dedicated network appliances
      if (ci.type === 'network-device') {
        return 'direct';
      }

      return 'equal'; // Default for network infrastructure
    }

    // Data tower defaults
    if (tower === 'data') {
      // Databases can be dedicated or shared
      if (ci.type === 'database') {
        // Check if it's a cluster
        if (metadata.cluster || metadata.replicationGroup) {
          return 'usage_based';
        }
        return 'direct'; // Standalone database
      }

      return 'usage_based'; // Default for data
    }

    // Security tower defaults
    if (tower === 'security') {
      // Security infrastructure is typically shared
      return 'equal';
    }

    // Applications tower defaults
    if ((tower as string) === 'applications') {
      // Applications and services are typically direct
      if (ci.type === 'application' || ci.type === 'service') {
        return 'direct';
      }

      // Software licenses
      if (ci.type === 'software') {
        // Check license type
        if (metadata.licenseType === 'per-user' || metadata.licenseType === 'per-cpu') {
          return 'usage_based';
        }
        return 'direct'; // Site license or perpetual
      }

      return 'direct'; // Default for applications
    }

    // End user tower defaults
    if (tower === 'end_user') {
      return 'usage_based'; // End user devices are typically per-user
    }

    // Facilities tower defaults
    if (tower === 'facilities') {
      return 'equal'; // Facilities costs are shared
    }

    // Risk & compliance tower defaults
    if (tower === 'risk_compliance') {
      return 'equal'; // Compliance costs are shared
    }

    // IoT tower defaults
    if (tower === 'iot') {
      return 'usage_based'; // IoT devices are usage-based
    }

    // Blockchain tower defaults
    if (tower === 'blockchain') {
      return 'usage_based'; // Blockchain nodes are usage-based
    }

    // Quantum tower defaults
    if (tower === 'quantum') {
      return 'usage_based'; // Quantum computing is usage-based
    }

    // Default fallback
    logger.warn('No allocation rule matched, using default USAGE_BASED', {
      ciType: ci.type,
      tower,
    });
    return 'usage_based';
  }

  /**
   * Get allocation method description
   */
  getAllocationMethodDescription(method: AllocationMethod): string {
    const descriptions: Record<AllocationMethod, string> = {
      direct: 'Direct allocation - costs are assigned directly to specific business services or capabilities',
      usage_based: 'Usage-based allocation - costs are distributed based on actual usage metrics (CPU, memory, I/O)',
      equal: 'Equal split - costs are distributed equally among all consumers',
    };

    return descriptions[method];
  }

  /**
   * Get allocation statistics
   */
  getAllocationStats() {
    return {
      methods: ['direct', 'usage_based', 'equal'],
      defaultMethod: 'usage_based',
      description: 'Cost allocation method determines how shared costs are distributed',
    };
  }
}
