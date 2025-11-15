/**
 * TBM Tower Mapper
 * Maps ConfigurationItem types to TBM Resource Towers
 */

import { CIType } from '@cmdb/unified-model';
import { TBMResourceTower, TBMCostPool } from '@cmdb/unified-model';
import { logger } from '@cmdb/common';

export interface TowerMapping {
  tower: TBMResourceTower;
  subTower: string;
  costPool: TBMCostPool;
}

/**
 * Maps CI types to TBM towers, sub-towers, and cost pools
 */
export class TowerMapper {
  private static readonly TOWER_MAPPINGS: Map<CIType, TowerMapping> = new Map([
    // Compute tower
    ['server', { tower: 'compute', subTower: 'Physical Servers', costPool: 'hardware' }],
    ['virtual-machine', { tower: 'compute', subTower: 'Virtual Servers', costPool: 'cloud' }],
    ['container', { tower: 'compute', subTower: 'Containers', costPool: 'cloud' }],

    // Storage tower
    ['storage', { tower: 'storage', subTower: 'Block Storage', costPool: 'hardware' }],

    // Network tower
    ['network-device', { tower: 'network', subTower: 'Network Infrastructure', costPool: 'hardware' }],
    ['load-balancer', { tower: 'network', subTower: 'Load Balancers', costPool: 'hardware' }],

    // Data tower
    ['database', { tower: 'data', subTower: 'Database Services', costPool: 'cloud' }],

    // Security tower
    // No direct CI type for security, but can be derived from metadata

    // Applications tower
    ['application', { tower: 'applications', subTower: 'Business Applications', costPool: 'software' }],
    ['service', { tower: 'applications', subTower: 'Application Services', costPool: 'software' }],
    ['software', { tower: 'applications', subTower: 'Software Licenses', costPool: 'software' }],

    // Cloud resources (generic)
    ['cloud-resource', { tower: 'compute', subTower: 'Cloud Resources', costPool: 'cloud' }],

    // Facilities tower
    ['facility', { tower: 'facilities', subTower: 'Data Center', costPool: 'facilities' }],

    // Documentation (administrative)
    ['documentation', { tower: 'applications', subTower: 'Documentation', costPool: 'software' }],
  ] as any);

  /**
   * Map a CI to its TBM tower
   *
   * @param ciType - The type of the configuration item
   * @param metadata - Optional metadata for more specific mapping
   * @returns Tower mapping including tower, sub-tower, and cost pool
   */
  mapCIToTower(ciType: CIType, metadata?: Record<string, any>): TowerMapping {
    // Check for security-related CIs in metadata
    if (this.isSecurityCI(ciType, metadata)) {
      return {
        tower: 'security',
        subTower: 'Security Infrastructure',
        costPool: 'hardware',
      };
    }

    // Check for IoT devices
    if (this.isIoTDevice(metadata)) {
      return {
        tower: 'iot',
        subTower: 'IoT Devices',
        costPool: 'hardware',
      };
    }

    // Check for blockchain infrastructure
    if (this.isBlockchainInfra(metadata)) {
      return {
        tower: 'blockchain',
        subTower: 'Blockchain Nodes',
        costPool: 'cloud',
      };
    }

    // Get mapping from static map
    const mapping = TowerMapper.TOWER_MAPPINGS.get(ciType);

    if (!mapping) {
      logger.warn('No tower mapping found for CI type, using default', {
        ciType,
      });

      // Default to compute tower for unknown types
      return {
        tower: 'compute',
        subTower: 'Unclassified',
        costPool: 'hardware',
      };
    }

    // Refine sub-tower based on metadata
    return this.refineMapping(mapping, metadata);
  }

  /**
   * Check if CI is security-related
   */
  private isSecurityCI(ciType: CIType, metadata?: Record<string, any>): boolean {
    if (!metadata) return false;

    const securityKeywords = [
      'firewall',
      'waf',
      'security-group',
      'nacl',
      'iam',
      'kms',
      'vault',
      'secret',
      'certificate',
      'antivirus',
      'ids',
      'ips',
    ];

    const ciName = (metadata.name || '').toLowerCase();
    const ciTags = (metadata.tags || []).map((t: string) => t.toLowerCase());
    const resourceType = (metadata.resourceType || '').toLowerCase();

    return securityKeywords.some(
      (keyword) =>
        ciName.includes(keyword) ||
        ciTags.some((tag: string) => tag.includes(keyword)) ||
        resourceType.includes(keyword)
    );
  }

  /**
   * Check if CI is an IoT device
   */
  private isIoTDevice(metadata?: Record<string, any>): boolean {
    if (!metadata) return false;

    const iotKeywords = ['iot', 'sensor', 'edge-device', 'smart-device', 'embedded'];

    const deviceType = (metadata.deviceType || '').toLowerCase();
    const platform = (metadata.platform || '').toLowerCase();
    const tags = (metadata.tags || []).map((t: string) => t.toLowerCase());

    return iotKeywords.some(
      (keyword) =>
        deviceType.includes(keyword) ||
        platform.includes(keyword) ||
        tags.some((tag: string) => tag.includes(keyword))
    );
  }

  /**
   * Check if CI is blockchain infrastructure
   */
  private isBlockchainInfra(metadata?: Record<string, any>): boolean {
    if (!metadata) return false;

    const blockchainKeywords = [
      'blockchain',
      'ethereum',
      'bitcoin',
      'hyperledger',
      'consensus',
      'smart-contract',
    ];

    const tags = (metadata.tags || []).map((t: string) => t.toLowerCase());
    const purpose = (metadata.purpose || '').toLowerCase();

    return blockchainKeywords.some(
      (keyword) =>
        tags.some((tag: string) => tag.includes(keyword)) || purpose.includes(keyword)
    );
  }

  /**
   * Refine tower mapping based on metadata
   */
  private refineMapping(
    baseMapping: TowerMapping,
    metadata?: Record<string, any>
  ): TowerMapping {
    if (!metadata) return baseMapping;

    const refined = { ...baseMapping };

    // Refine compute sub-tower
    if (baseMapping.tower === 'compute') {
      if (metadata.instanceType && metadata.instanceType.includes('gpu')) {
        refined.subTower = 'GPU Compute';
      } else if (metadata.instanceType && metadata.instanceType.includes('spot')) {
        refined.subTower = 'Spot Instances';
      } else if (metadata.instanceType && metadata.instanceType.includes('reserved')) {
        refined.subTower = 'Reserved Instances';
      }
    }

    // Refine storage sub-tower
    if (baseMapping.tower === 'storage') {
      if (metadata.storageType === 'ssd' || metadata.storageClass === 'premium') {
        refined.subTower = 'Premium Storage';
      } else if (metadata.storageType === 'archive') {
        refined.subTower = 'Archive Storage';
      } else if (metadata.storageType === 'object') {
        refined.subTower = 'Object Storage';
      }
    }

    // Refine network sub-tower
    if (baseMapping.tower === 'network') {
      if (metadata.bandwidth && parseInt(metadata.bandwidth) >= 10000) {
        refined.subTower = 'High-Speed Network';
      }
    }

    // Refine database sub-tower
    if (baseMapping.tower === 'data') {
      if (metadata.engine) {
        const engine = metadata.engine.toLowerCase();
        if (engine.includes('postgres') || engine.includes('mysql')) {
          refined.subTower = 'Relational Databases';
        } else if (engine.includes('mongo') || engine.includes('dynamo')) {
          refined.subTower = 'NoSQL Databases';
        } else if (engine.includes('redis') || engine.includes('memcache')) {
          refined.subTower = 'In-Memory Databases';
        }
      }
    }

    return refined;
  }

  /**
   * Get all supported tower mappings
   */
  getSupportedCITypes(): CIType[] {
    return Array.from(TowerMapper.TOWER_MAPPINGS.keys());
  }

  /**
   * Get tower summary statistics
   */
  getTowerMappingStats() {
    const towerCounts = new Map<TBMResourceTower, number>();

    for (const mapping of TowerMapper.TOWER_MAPPINGS.values()) {
      const count = towerCounts.get(mapping.tower) || 0;
      towerCounts.set(mapping.tower, count + 1);
    }

    return {
      totalMappings: TowerMapper.TOWER_MAPPINGS.size,
      towerDistribution: Object.fromEntries(towerCounts),
    };
  }
}
