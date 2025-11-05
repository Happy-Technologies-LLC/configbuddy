/**
 * CI Factory - Test Data Builders
 * Factory functions for creating test CI data with various scenarios
 */

import { TransformedCI, IdentificationAttributes } from '@cmdb/integration-framework';

/**
 * Base CI factory with defaults
 */
export function createBaseCI(overrides: Partial<TransformedCI> = {}): TransformedCI {
  return {
    name: 'test-server-01',
    ci_type: 'server',
    environment: 'test',
    status: 'active',
    attributes: {},
    identifiers: {
      hostname: 'test-server-01',
    },
    source: 'test',
    source_id: 'test-001',
    confidence_score: 90,
    ...overrides,
  };
}

/**
 * Create server CI with strong identifiers
 */
export function createServerWithStrongIdentifiers(
  name: string,
  source: string
): TransformedCI {
  return createBaseCI({
    name,
    ci_type: 'server',
    attributes: {
      hostname: name,
      os_type: 'linux',
      cpu_count: 4,
      memory_gb: 16,
    },
    identifiers: {
      serial_number: `SN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      uuid: `uuid-${Math.random().toString(36).substr(2, 9)}`,
      hostname: name,
      fqdn: `${name}.example.com`,
      ip_address: [generateRandomIP()],
      mac_address: [generateRandomMAC()],
    },
    source,
    source_id: `${source}-${Date.now()}`,
  });
}

/**
 * Create server CI with weak identifiers (only hostname)
 */
export function createServerWithWeakIdentifiers(
  name: string,
  source: string
): TransformedCI {
  return createBaseCI({
    name,
    ci_type: 'server',
    attributes: {
      hostname: name,
    },
    identifiers: {
      hostname: name,
    },
    source,
    source_id: `${source}-${Date.now()}`,
    confidence_score: 60,
  });
}

/**
 * Create duplicate servers with variations
 */
export function createDuplicateServers(
  baseName: string,
  sources: string[]
): TransformedCI[] {
  const sharedSerial = `SN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const sharedUUID = `uuid-${Math.random().toString(36).substr(2, 9)}`;
  const sharedMAC = generateRandomMAC();
  const sharedIP = generateRandomIP();

  return sources.map((source, index) => {
    return createBaseCI({
      name: index === 0 ? baseName : `${baseName}-${source}`,
      ci_type: 'server',
      attributes: {
        hostname: baseName,
        os_type: 'linux',
        cpu_count: 4,
        memory_gb: 16,
        // Add source-specific attributes
        [`${source}_specific`]: true,
      },
      identifiers: {
        serial_number: sharedSerial,
        uuid: sharedUUID,
        hostname: baseName,
        fqdn: `${baseName}.example.com`,
        ip_address: [sharedIP],
        mac_address: [sharedMAC],
      },
      source,
      source_id: `${source}-${baseName}-${Date.now()}`,
    });
  });
}

/**
 * Create network device CI
 */
export function createNetworkDevice(
  name: string,
  serialNumber: string,
  managementIPs: string[]
): TransformedCI {
  return createBaseCI({
    name,
    ci_type: 'network-device',
    attributes: {
      model: 'Cisco Catalyst 9300',
      serial_number: serialNumber,
      os_version: 'IOS-XE 17.6.3',
      port_count: 48,
    },
    identifiers: {
      serial_number: serialNumber,
      hostname: name,
      fqdn: `${name}.example.com`,
      ip_address: managementIPs,
      mac_address: [generateRandomMAC()],
    },
    source: 'nmap',
    source_id: managementIPs[0],
    confidence_score: 85,
  });
}

/**
 * Create database CI
 */
export function createDatabase(
  name: string,
  source: string,
  version: string,
  authority: number
): TransformedCI {
  return createBaseCI({
    name,
    ci_type: 'database',
    attributes: {
      database_type: 'postgresql',
      version,
      port: 5432,
      max_connections: 200,
      monitoring_enabled: true,
    },
    identifiers: {
      hostname: name,
      fqdn: `${name}.example.com`,
      ip_address: [generateRandomIP()],
    },
    source,
    source_id: `${source}-${name}`,
    confidence_score: authority,
  });
}

/**
 * Create cloud VM CI
 */
export function createCloudVM(
  name: string,
  provider: 'aws' | 'azure' | 'gcp',
  instanceId: string
): TransformedCI {
  const configs = {
    aws: {
      attributes: {
        instance_id: instanceId,
        instance_type: 't3.large',
        availability_zone: 'us-east-1a',
      },
      identifiers: {
        external_id: instanceId,
      },
    },
    azure: {
      attributes: {
        vm_id: instanceId,
        vm_size: 'Standard_D2s_v3',
        location: 'eastus',
      },
      identifiers: {
        external_id: instanceId,
      },
    },
    gcp: {
      attributes: {
        instance_id: instanceId,
        machine_type: 'n1-standard-2',
        zone: 'us-central1-a',
      },
      identifiers: {
        external_id: instanceId,
      },
    },
  };

  const config = configs[provider];

  return createBaseCI({
    name,
    ci_type: 'virtual-machine',
    environment: 'production',
    attributes: {
      hostname: name,
      os_type: 'linux',
      cpu_count: 2,
      memory_gb: 8,
      ...config.attributes,
    },
    identifiers: {
      hostname: name,
      ip_address: [generateRandomIP()],
      mac_address: [generateRandomMAC()],
      ...config.identifiers,
    },
    source: provider,
    source_id: instanceId,
    confidence_score: 95,
  });
}

/**
 * Create container CI
 */
export function createContainer(
  name: string,
  containerId: string,
  image: string
): TransformedCI {
  return createBaseCI({
    name,
    ci_type: 'container',
    environment: 'production',
    attributes: {
      container_id: containerId,
      image,
      ports: ['8080:80'],
      labels: {
        app: name,
        env: 'production',
      },
    },
    identifiers: {
      external_id: containerId,
      hostname: name,
      ip_address: [generateRandomIP('172.17.0')],
    },
    source: 'docker',
    source_id: containerId,
    confidence_score: 100,
  });
}

/**
 * Create application CI
 */
export function createApplication(
  name: string,
  source: string,
  version: string
): TransformedCI {
  return createBaseCI({
    name,
    ci_type: 'application',
    environment: 'production',
    attributes: {
      version,
      app_name: name,
      description: `${name} application`,
    },
    identifiers: {
      hostname: name.toLowerCase().replace(/\s+/g, '-'),
      custom_identifiers: {
        [`${source}_app_id`]: `${source}-${Date.now()}`,
      },
    },
    source,
    source_id: `${source}-${name}`,
    confidence_score: 85,
  });
}

/**
 * Create CI with conflicting attributes
 */
export function createConflictingCIs(
  baseName: string,
  field: string,
  values: any[],
  sources: string[]
): TransformedCI[] {
  const sharedHostname = baseName;
  const sharedIP = generateRandomIP();

  return sources.map((source, index) => {
    return createBaseCI({
      name: baseName,
      ci_type: 'server',
      attributes: {
        hostname: sharedHostname,
        [field]: values[index], // Conflicting field
      },
      identifiers: {
        hostname: sharedHostname,
        ip_address: [sharedIP],
      },
      source,
      source_id: `${source}-${baseName}`,
    });
  });
}

/**
 * Create CI batch for performance testing
 */
export function createCIBatch(
  count: number,
  ciType: string,
  source: string
): TransformedCI[] {
  return Array.from({ length: count }, (_, i) => {
    return createBaseCI({
      name: `${ciType}-${i}`,
      ci_type: ciType as any,
      attributes: {
        hostname: `${ciType}-${i}`,
        index: i,
      },
      identifiers: {
        hostname: `${ciType}-${i}`,
        ip_address: [generateRandomIP()],
        serial_number: `SN-${i.toString().padStart(6, '0')}`,
      },
      source,
      source_id: `${source}-${i}`,
    });
  });
}

// Helper functions

function generateRandomIP(prefix: string = '10.0'): string {
  const octet3 = Math.floor(Math.random() * 256);
  const octet4 = Math.floor(Math.random() * 256);
  return `${prefix}.${octet3}.${octet4}`;
}

function generateRandomMAC(): string {
  return Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
  ).join(':');
}

/**
 * Assertion helpers for tests
 */
export const testHelpers = {
  /**
   * Assert two CIs should match
   */
  shouldMatch(ci1: TransformedCI, ci2: TransformedCI): boolean {
    // Check if they have any shared strong identifiers
    if (ci1.identifiers.external_id && ci2.identifiers.external_id) {
      return ci1.identifiers.external_id === ci2.identifiers.external_id;
    }

    if (ci1.identifiers.serial_number && ci2.identifiers.serial_number) {
      return ci1.identifiers.serial_number === ci2.identifiers.serial_number;
    }

    if (ci1.identifiers.uuid && ci2.identifiers.uuid) {
      return ci1.identifiers.uuid === ci2.identifiers.uuid;
    }

    // Check MAC address overlap
    if (ci1.identifiers.mac_address && ci2.identifiers.mac_address) {
      const overlap = ci1.identifiers.mac_address.filter(mac =>
        ci2.identifiers.mac_address?.includes(mac)
      );
      if (overlap.length > 0) return true;
    }

    // Check FQDN
    if (ci1.identifiers.fqdn && ci2.identifiers.fqdn) {
      return ci1.identifiers.fqdn === ci2.identifiers.fqdn;
    }

    // Check hostname + IP combination
    if (
      ci1.identifiers.hostname &&
      ci2.identifiers.hostname &&
      ci1.identifiers.ip_address &&
      ci2.identifiers.ip_address
    ) {
      const hostnameMatch =
        ci1.identifiers.hostname.toLowerCase() ===
        ci2.identifiers.hostname.toLowerCase();
      const ipOverlap = ci1.identifiers.ip_address.filter(ip =>
        ci2.identifiers.ip_address?.includes(ip)
      );
      if (hostnameMatch && ipOverlap.length > 0) return true;
    }

    return false;
  },

  /**
   * Assert field values match or are compatible
   */
  fieldsCompatible(value1: any, value2: any): boolean {
    if (value1 === value2) return true;

    // Handle case-insensitive string comparison
    if (typeof value1 === 'string' && typeof value2 === 'string') {
      return value1.toLowerCase() === value2.toLowerCase();
    }

    // Handle numeric tolerance
    if (typeof value1 === 'number' && typeof value2 === 'number') {
      return Math.abs(value1 - value2) < 0.01;
    }

    return false;
  },
};
