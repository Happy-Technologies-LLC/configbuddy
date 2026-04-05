// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Parser for Wiz cloud resources
 */

import { WizCloudResource } from '../types';

export function parseCloudResource(entity: any): WizCloudResource {
  const props = entity.properties || {};
  return {
    id: entity.id,
    name: entity.name || props.name || 'Unknown',
    type: entity.type,
    cloudPlatform: props.cloudPlatform || 'Unknown',
    cloudProviderURL: props.cloudProviderURL || '',
    region: props.region || 'Unknown',
    subscriptionId: props.subscriptionId,
    subscriptionName: props.subscriptionName,
    resourceGroupName: props.resourceGroupName,
    status: props.status || 'Active',
    tags: props.tags || {},
    createdAt: props.createdAt || new Date().toISOString(),
    updatedAt: props.updatedAt,
    nativeType: props.nativeType || entity.type,
    providerUniqueId: props.providerUniqueId || entity.id,
  };
}
