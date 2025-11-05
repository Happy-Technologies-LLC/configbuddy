/**
 * Unified Credential Service
 *
 * Manages protocol-based credentials with affinity matching and validation.
 * This service replaces provider-specific credentials with standard authentication
 * protocols that can be used across different providers.
 *
 * Key Features:
 * - Protocol-based credential storage (OAuth2, API Key, SSH, AWS IAM, etc.)
 * - Affinity-based credential matching (network, hostname, OS, device type, etc.)
 * - Credential sets for rotation and fallback
 * - Encrypted storage using AES-256-GCM
 */

import { Pool } from 'pg';
import {
  UnifiedCredential,
  UnifiedCredentialInput,
  UnifiedCredentialUpdateInput,
  UnifiedCredentialSummary,
  CredentialMatchContext,
  CredentialMatchResult,
  CredentialValidationResult,
} from '@cmdb/common';
import { CredentialCRUDService, CredentialFilters } from './credential-services/crud.service';
import { CredentialAffinityService } from './credential-services/affinity.service';
import { CredentialValidationService } from './credential-services/validation.service';

/**
 * Unified Credential Service
 * Coordinates CRUD, affinity matching, and validation operations
 */
export class UnifiedCredentialService {
  private crudService: CredentialCRUDService;
  private affinityService: CredentialAffinityService;
  private validationService: CredentialValidationService;

  constructor(pool: Pool) {
    this.crudService = new CredentialCRUDService(pool);
    this.affinityService = new CredentialAffinityService(pool);
    this.validationService = new CredentialValidationService(pool);
  }

  // CRUD Operations
  async create(
    input: UnifiedCredentialInput,
    createdBy: string
  ): Promise<UnifiedCredential> {
    return this.crudService.create(input, createdBy);
  }

  async getById(id: string): Promise<UnifiedCredential | null> {
    return this.crudService.getById(id);
  }

  async list(
    filters?: CredentialFilters
  ): Promise<UnifiedCredentialSummary[]> {
    return this.crudService.list(filters);
  }

  async update(
    id: string,
    input: UnifiedCredentialUpdateInput
  ): Promise<UnifiedCredential> {
    return this.crudService.update(id, input);
  }

  async delete(id: string): Promise<void> {
    return this.crudService.delete(id);
  }

  // Affinity Matching
  async findBestMatch(
    context: CredentialMatchContext
  ): Promise<CredentialMatchResult | null> {
    return this.affinityService.findBestMatch(context);
  }

  async rankCredentials(
    context: CredentialMatchContext
  ): Promise<CredentialMatchResult[]> {
    return this.affinityService.rankCredentials(context);
  }

  calculateAffinityScore(
    credential: UnifiedCredential,
    context: CredentialMatchContext
  ): { score: number; reasons: string[] } {
    return this.affinityService.calculateAffinityScore(credential, context);
  }

  // Validation
  async validate(id: string): Promise<CredentialValidationResult> {
    return this.validationService.validate(id, (id) => this.getById(id));
  }

  async testConnection(id: string): Promise<boolean> {
    return this.validationService.testConnection(id, (id) => this.validate(id));
  }

  validateCredentialStructure(
    credential: UnifiedCredential
  ): CredentialValidationResult {
    return this.validationService.validateCredentialStructure(credential);
  }
}

// Singleton instance
let unifiedCredentialService: UnifiedCredentialService | null = null;

export function getUnifiedCredentialService(
  pool: Pool
): UnifiedCredentialService {
  if (!unifiedCredentialService) {
    unifiedCredentialService = new UnifiedCredentialService(pool);
  }
  return unifiedCredentialService;
}

// Re-export types for convenience
export type { CredentialFilters };
