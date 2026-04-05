// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * TBM Tower Mapping Service
 * Maps Configuration Items to TBM Resource Towers and Sub-Towers
 */

import { TBMResourceTower, TBMCostPool, TowerMappingResult } from '../types/tbm-types';
import {
  getTowerMapping,
  getSubTowersForTower,
  isValidSubTower,
  getDefaultCostPool,
  inferTowerFromMetadata
} from '../utils/tbm-taxonomy';

/**
 * Tower Mapping Service
 * Singleton service for mapping CIs to TBM towers
 */
export class TowerMappingService {
  private static instance: TowerMappingService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): TowerMappingService {
    if (!TowerMappingService.instance) {
      TowerMappingService.instance = new TowerMappingService();
    }
    return TowerMappingService.instance;
  }

  /**
   * Map a CI to TBM Resource Tower
   *
   * @param ciId - Configuration Item ID
   * @param ciType - Type of CI
   * @param metadata - Optional metadata for inference
   * @returns Tower mapping result
   *
   * @example
   * ```typescript
   * const service = TowerMappingService.getInstance();
   * const result = service.mapCIToTower('ci-001', 'server', {});
   * console.log(result.tower); // TBMResourceTower.COMPUTE
   * console.log(result.subTower); // 'Physical Servers'
   * ```
   */
  public mapCIToTower(
    ciId: string,
    ciType: string,
    metadata: Record<string, any> = {}
  ): TowerMappingResult {
    const mappingRules: string[] = [];

    // Try direct type mapping first
    let mapping = getTowerMapping(ciType);

    if (mapping) {
      mappingRules.push(`Direct type mapping: ${ciType} -> ${mapping.tower}`);

      return {
        ciId,
        ciType,
        tower: mapping.tower,
        subTower: mapping.subTower,
        costPool: mapping.costPool,
        confidence: 1.0,
        mappingRules
      };
    }

    // Try metadata inference
    const inferredTower = inferTowerFromMetadata(metadata);

    if (inferredTower) {
      mappingRules.push(`Inferred from metadata: ${inferredTower}`);
      const subTowers = getSubTowersForTower(inferredTower);
      const defaultSubTower = subTowers.length > 0 && subTowers[0] ? subTowers[0].name : 'Unknown';
      const costPool = getDefaultCostPool(inferredTower);

      return {
        ciId,
        ciType,
        tower: inferredTower,
        subTower: defaultSubTower,
        costPool,
        confidence: 0.7,
        mappingRules
      };
    }

    // Default to Applications tower as fallback
    mappingRules.push('Fallback to default tower: Applications');

    return {
      ciId,
      ciType,
      tower: TBMResourceTower.APPLICATIONS,
      subTower: 'Business Applications',
      costPool: TBMCostPool.SOFTWARE,
      confidence: 0.3,
      mappingRules
    };
  }

  /**
   * Map multiple CIs to towers in batch
   *
   * @param cis - Array of CIs with id, type, and metadata
   * @returns Array of tower mapping results
   */
  public mapCIsBatch(
    cis: Array<{ id: string; type: string; metadata?: Record<string, any> }>
  ): TowerMappingResult[] {
    return cis.map(ci => this.mapCIToTower(ci.id, ci.type, ci.metadata || {}));
  }

  /**
   * Validate tower/sub-tower combination
   *
   * @param tower - TBM Resource Tower
   * @param subTower - Sub-tower name
   * @returns True if valid combination
   */
  public validateTowerMapping(tower: TBMResourceTower, subTower: string): boolean {
    return isValidSubTower(tower, subTower);
  }

  /**
   * Get recommended sub-towers for a tower
   *
   * @param tower - TBM Resource Tower
   * @returns Array of recommended sub-tower names
   */
  public getRecommendedSubTowers(tower: TBMResourceTower): string[] {
    const subTowers = getSubTowersForTower(tower);
    return subTowers.map(st => st.name);
  }

  /**
   * Get cost pool recommendation for a tower
   *
   * @param tower - TBM Resource Tower
   * @param ciMetadata - CI metadata for refinement
   * @returns Recommended cost pool
   */
  public getRecommendedCostPool(
    tower: TBMResourceTower,
    ciMetadata: Record<string, any> = {}
  ): TBMCostPool {
    // Check for cloud-specific metadata
    const metadataStr = JSON.stringify(ciMetadata).toLowerCase();

    if (metadataStr.includes('aws') || metadataStr.includes('azure') || metadataStr.includes('gcp')) {
      return TBMCostPool.CLOUD;
    }

    if (metadataStr.includes('saas') || metadataStr.includes('cloud-service')) {
      return TBMCostPool.CLOUD;
    }

    // Use default mapping
    return getDefaultCostPool(tower);
  }

  /**
   * Get tower distribution statistics
   *
   * @param mappings - Array of tower mapping results
   * @returns Statistics by tower
   */
  public getTowerStatistics(mappings: TowerMappingResult[]): Record<
    TBMResourceTower,
    {
      count: number;
      percentage: number;
      avgConfidence: number;
    }
  > {
    const stats = {} as Record<
      TBMResourceTower,
      {
        count: number;
        percentage: number;
        avgConfidence: number;
      }
    >;

    // Initialize all towers
    Object.values(TBMResourceTower).forEach(tower => {
      stats[tower] = { count: 0, percentage: 0, avgConfidence: 0 };
    });

    // Count CIs per tower
    for (const mapping of mappings) {
      if (!stats[mapping.tower]) {
        stats[mapping.tower] = { count: 0, percentage: 0, avgConfidence: 0 };
      }
      stats[mapping.tower].count++;
    }

    // Calculate percentages and average confidence
    const total = mappings.length;

    for (const tower of Object.values(TBMResourceTower)) {
      const towerMappings = mappings.filter(m => m.tower === tower);
      stats[tower].percentage = total > 0 ? (stats[tower].count / total) * 100 : 0;

      if (towerMappings.length > 0) {
        const totalConfidence = towerMappings.reduce((sum, m) => sum + m.confidence, 0);
        stats[tower].avgConfidence = totalConfidence / towerMappings.length;
      }
    }

    return stats;
  }

  /**
   * Get low-confidence mappings that may need review
   *
   * @param mappings - Array of tower mapping results
   * @param threshold - Confidence threshold (default 0.7)
   * @returns Mappings below confidence threshold
   */
  public getLowConfidenceMappings(
    mappings: TowerMappingResult[],
    threshold: number = 0.7
  ): TowerMappingResult[] {
    return mappings.filter(m => m.confidence < threshold);
  }

  /**
   * Suggest tower reclassification
   *
   * @param currentMapping - Current tower mapping
   * @param newCIType - New CI type to map to
   * @returns Suggested new mapping
   */
  public suggestReclassification(
    currentMapping: TowerMappingResult,
    newCIType: string
  ): TowerMappingResult {
    return this.mapCIToTower(currentMapping.ciId, newCIType, {});
  }
}

/**
 * Get singleton instance
 */
export function getTowerMappingService(): TowerMappingService {
  return TowerMappingService.getInstance();
}
