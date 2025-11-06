/**
 * ITIL CI Class Classifier
 * Infers ITIL CI class from CI type and metadata
 */

import { CIType, ITILCIClass } from '@cmdb/unified-model';

export class ITILClassifier {
  private readonly classificationRules: Map<CIType, ITILCIClass>;

  constructor() {
    this.classificationRules = new Map([
      // Hardware CIs (physical infrastructure)
      ['server', 'hardware'],
      ['storage', 'hardware'],
      ['network-device', 'hardware'],
      ['load-balancer', 'hardware'],

      // Software CIs (virtual infrastructure and applications)
      ['virtual-machine', 'software'], // VMs are software
      ['container', 'software'],
      ['application', 'software'],
      ['database', 'software'],
      ['software', 'software'],

      // Service CIs (business and technical services)
      ['service', 'service'],

      // Network CIs (network infrastructure)
      ['cloud-resource', 'network'], // Default cloud resources to network

      // Facility CIs (physical locations)
      ['facility', 'facility'],

      // Documentation CIs
      ['documentation', 'documentation'],
    ]);
  }

  /**
   * Infer ITIL CI Class from CI type and metadata
   *
   * ITIL CI Classes:
   * - hardware: Physical servers, storage, network devices
   * - software: Applications, databases, operating systems, VMs
   * - service: Business services, technical services
   * - network: Networks, VPCs, subnets
   * - facility: Data centers, server rooms
   * - documentation: Configuration docs, runbooks
   * - personnel: People (for RACI/ownership)
   *
   * @param ciType - The CI type from the discovery process
   * @param metadata - Optional metadata for edge case inference
   * @returns The inferred ITIL CI class
   */
  inferITILClass(ciType: CIType, metadata?: Record<string, any>): ITILCIClass {
    // Check direct mapping first
    const directMapping = this.classificationRules.get(ciType);
    if (directMapping) {
      // Apply metadata overrides for edge cases
      if (metadata) {
        // Physical hardware override
        if (metadata.physical === true || metadata.hardware_type) {
          return 'hardware';
        }

        // Virtual/software override
        if (metadata.virtual === true || metadata.virtualization_type) {
          return 'software';
        }

        // Service override
        if (metadata.service_type || metadata.business_service) {
          return 'service';
        }

        // Network infrastructure override
        if (metadata.network_type || metadata.vpc_id || metadata.subnet_id) {
          return 'network';
        }
      }

      return directMapping;
    }

    // Fallback: use metadata for unknown types
    if (metadata) {
      if (metadata.physical === true) return 'hardware';
      if (metadata.virtual === true) return 'software';
      if (metadata.service_type) return 'service';
      if (metadata.network_type || metadata.vpc_id) return 'network';
      if (metadata.datacenter || metadata.facility_type) return 'facility';
    }

    // Default to hardware for unknown types (conservative approach)
    return 'hardware';
  }

  /**
   * Get all classification rules for documentation and debugging
   * @returns Map of CI type to ITIL class mappings
   */
  getClassificationRules(): Map<CIType, ITILCIClass> {
    return new Map(this.classificationRules);
  }

  /**
   * Check if a CI type has a direct classification rule
   * @param ciType - The CI type to check
   * @returns True if a direct rule exists
   */
  hasDirectRule(ciType: CIType): boolean {
    return this.classificationRules.has(ciType);
  }

  /**
   * Get supported CI types
   * @returns Array of supported CI types
   */
  getSupportedCITypes(): CIType[] {
    return Array.from(this.classificationRules.keys());
  }
}
