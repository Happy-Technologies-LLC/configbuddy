// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Discovery Field Mapping Utilities
 *
 * Provides helper functions to apply field mappings from discovery definitions
 * to discovered CIs, routing fields to standard CI properties or metadata.
 */

import { DiscoveredCI } from '@cmdb/common';

/**
 * Standard CI fields that map to top-level properties
 * All other fields are treated as metadata
 */
export const STANDARD_CI_FIELDS = new Set([
  'name',
  'type',
  'status',
  'environment',
  'description',
  'external_id',
  'discovered_at',
  'discovered_by',
  'confidence_score',
  'tags',
  'ip_address',
  'hostname',
  'serial_number',
  'manufacturer',
  'model',
  'location',
  'owner',
  'cost_center',
]);

/**
 * Apply field mappings to discovered CI data
 *
 * @param sourceData - Raw discovered data (e.g., AWS API response)
 * @param fieldMappings - Mapping of target field -> source path
 * @returns Object with separated standard fields and metadata
 *
 * @example
 * const sourceData = {
 *   InstanceType: 't2.micro',
 *   PrivateIpAddress: '10.0.1.5',
 *   Tags: [{ Key: 'Name', Value: 'web-server-1' }]
 * };
 *
 * const fieldMappings = {
 *   'name': 'Tags.0.Value',
 *   'ip_address': 'PrivateIpAddress',
 *   'instance_type': 'InstanceType'  // metadata field
 * };
 *
 * const result = applyFieldMappings(sourceData, fieldMappings);
 * // {
 * //   standardFields: { name: 'web-server-1', ip_address: '10.0.1.5' },
 * //   metadata: { instance_type: 't2.micro' }
 * // }
 */
export function applyFieldMappings(
  sourceData: any,
  fieldMappings?: Record<string, string>
): { standardFields: Record<string, any>; metadata: Record<string, any> } {
  const standardFields: Record<string, any> = {};
  const metadata: Record<string, any> = {};

  if (!fieldMappings) {
    return { standardFields, metadata };
  }

  for (const [targetField, sourcePath] of Object.entries(fieldMappings)) {
    const value = getNestedValue(sourceData, sourcePath);

    if (value !== undefined && value !== null) {
      if (STANDARD_CI_FIELDS.has(targetField)) {
        standardFields[targetField] = value;
      } else {
        metadata[targetField] = value;
      }
    }
  }

  return { standardFields, metadata };
}

/**
 * Extract nested value from object using dot notation path
 *
 * @param obj - Source object
 * @param path - Dot-notation path (e.g., 'metadata.instance_type' or 'Tags.0.Value')
 * @returns Value at path, or undefined if not found
 *
 * @example
 * getNestedValue({ a: { b: { c: 42 } } }, 'a.b.c') // 42
 * getNestedValue({ tags: [{ key: 'Name' }] }, 'tags.0.key') // 'Name'
 */
export function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }

  return current;
}

/**
 * Merge field mappings into a discovered CI
 *
 * @param ci - Discovered CI object
 * @param sourceData - Raw source data
 * @param fieldMappings - Field mappings from discovery definition
 * @returns Updated CI with mapped fields
 *
 * @example
 * const ci = {
 *   id: 'aws-ec2-i-123',
 *   name: 'default-name',
 *   type: 'virtual-machine',
 *   metadata: { existing_field: 'value' }
 * };
 *
 * const sourceData = { InstanceType: 't2.micro', PrivateIpAddress: '10.0.1.5' };
 * const fieldMappings = { 'ip_address': 'PrivateIpAddress', 'instance_type': 'InstanceType' };
 *
 * const updated = mergeFieldMappings(ci, sourceData, fieldMappings);
 * // {
 * //   id: 'aws-ec2-i-123',
 * //   name: 'default-name',
 * //   type: 'virtual-machine',
 * //   ip_address: '10.0.1.5',  // NEW - standard field
 * //   metadata: {
 * //     existing_field: 'value',
 * //     instance_type: 't2.micro'  // NEW - metadata field
 * //   }
 * // }
 */
export function mergeFieldMappings(
  ci: DiscoveredCI,
  sourceData: any,
  fieldMappings?: Record<string, string>
): DiscoveredCI {
  if (!fieldMappings) {
    return ci;
  }

  const { standardFields, metadata } = applyFieldMappings(sourceData, fieldMappings);

  // Merge standard fields into top-level CI properties
  const updatedCI = {
    ...ci,
    ...standardFields,
  };

  // Merge metadata fields into CI metadata
  if (Object.keys(metadata).length > 0) {
    updatedCI.metadata = {
      ...ci.metadata,
      ...metadata,
    };
  }

  return updatedCI;
}
