/**
 * TBM Taxonomy Mapping Utilities
 * Maps CI types to TBM Resource Towers and Sub-Towers per TBM v5.0.1
 */

import { TBMResourceTower, TBMCostPool, TBMSubTower } from '../types/tbm-types';

/**
 * TBM Sub-Tower definitions
 */
export const TBM_SUB_TOWERS: TBMSubTower[] = [
  // Compute Tower
  { tower: TBMResourceTower.COMPUTE, name: 'Physical Servers', description: 'On-premise physical servers' },
  { tower: TBMResourceTower.COMPUTE, name: 'Virtual Machines', description: 'Virtual machine instances' },
  { tower: TBMResourceTower.COMPUTE, name: 'Containers', description: 'Container instances and orchestration' },
  { tower: TBMResourceTower.COMPUTE, name: 'Serverless', description: 'Function-as-a-Service platforms' },
  { tower: TBMResourceTower.COMPUTE, name: 'Mainframes', description: 'Mainframe computing resources' },

  // Storage Tower
  { tower: TBMResourceTower.STORAGE, name: 'Block Storage', description: 'Block-level storage volumes' },
  { tower: TBMResourceTower.STORAGE, name: 'Object Storage', description: 'Object/blob storage systems' },
  { tower: TBMResourceTower.STORAGE, name: 'File Storage', description: 'Network file systems' },
  { tower: TBMResourceTower.STORAGE, name: 'Backup Storage', description: 'Backup and archive systems' },
  { tower: TBMResourceTower.STORAGE, name: 'SAN/NAS', description: 'Storage area networks' },

  // Network Tower
  { tower: TBMResourceTower.NETWORK, name: 'Routers', description: 'Network routing equipment' },
  { tower: TBMResourceTower.NETWORK, name: 'Switches', description: 'Network switching equipment' },
  { tower: TBMResourceTower.NETWORK, name: 'Load Balancers', description: 'Traffic load balancers' },
  { tower: TBMResourceTower.NETWORK, name: 'Firewalls', description: 'Network security firewalls' },
  { tower: TBMResourceTower.NETWORK, name: 'VPN', description: 'Virtual private networks' },
  { tower: TBMResourceTower.NETWORK, name: 'CDN', description: 'Content delivery networks' },

  // Data Tower
  { tower: TBMResourceTower.DATA, name: 'Relational Databases', description: 'SQL databases' },
  { tower: TBMResourceTower.DATA, name: 'NoSQL Databases', description: 'Non-relational databases' },
  { tower: TBMResourceTower.DATA, name: 'Data Warehouses', description: 'Analytics data warehouses' },
  { tower: TBMResourceTower.DATA, name: 'Data Lakes', description: 'Unstructured data repositories' },
  { tower: TBMResourceTower.DATA, name: 'Cache Services', description: 'In-memory caching systems' },

  // Security Tower
  { tower: TBMResourceTower.SECURITY, name: 'Identity Management', description: 'Authentication and authorization' },
  { tower: TBMResourceTower.SECURITY, name: 'Key Management', description: 'Encryption key management' },
  { tower: TBMResourceTower.SECURITY, name: 'Threat Detection', description: 'Security monitoring and detection' },
  { tower: TBMResourceTower.SECURITY, name: 'DDoS Protection', description: 'DDoS mitigation services' },
  { tower: TBMResourceTower.SECURITY, name: 'WAF', description: 'Web application firewalls' },

  // Applications Tower
  { tower: TBMResourceTower.APPLICATIONS, name: 'Business Applications', description: 'Enterprise applications' },
  { tower: TBMResourceTower.APPLICATIONS, name: 'Development Tools', description: 'Software development platforms' },
  { tower: TBMResourceTower.APPLICATIONS, name: 'Collaboration', description: 'Communication and collaboration tools' },
  { tower: TBMResourceTower.APPLICATIONS, name: 'Analytics', description: 'Business intelligence and analytics' },

  // End User Tower
  { tower: TBMResourceTower.END_USER, name: 'Workstations', description: 'Desktop and laptop computers' },
  { tower: TBMResourceTower.END_USER, name: 'Mobile Devices', description: 'Smartphones and tablets' },
  { tower: TBMResourceTower.END_USER, name: 'Peripherals', description: 'Printers, displays, etc.' },

  // Facilities Tower
  { tower: TBMResourceTower.FACILITIES, name: 'Data Centers', description: 'Data center infrastructure' },
  { tower: TBMResourceTower.FACILITIES, name: 'Power', description: 'Power distribution and UPS' },
  { tower: TBMResourceTower.FACILITIES, name: 'Cooling', description: 'HVAC and cooling systems' },

  // Emerging Technologies
  { tower: TBMResourceTower.IOT, name: 'IoT Devices', description: 'Internet of Things sensors and devices' },
  { tower: TBMResourceTower.IOT, name: 'Edge Computing', description: 'Edge computing nodes' },
  { tower: TBMResourceTower.BLOCKCHAIN, name: 'Blockchain Nodes', description: 'Blockchain network nodes' },
  { tower: TBMResourceTower.QUANTUM, name: 'Quantum Computing', description: 'Quantum processors and simulators' }
];

/**
 * CI Type to TBM Tower Mapping
 */
export const CI_TYPE_TO_TOWER: Record<string, { tower: TBMResourceTower; subTower: string; costPool: TBMCostPool }> = {
  // Servers
  'server': { tower: TBMResourceTower.COMPUTE, subTower: 'Physical Servers', costPool: TBMCostPool.HARDWARE },
  'physical-server': { tower: TBMResourceTower.COMPUTE, subTower: 'Physical Servers', costPool: TBMCostPool.HARDWARE },
  'virtual-machine': { tower: TBMResourceTower.COMPUTE, subTower: 'Virtual Machines', costPool: TBMCostPool.CLOUD },
  'vm': { tower: TBMResourceTower.COMPUTE, subTower: 'Virtual Machines', costPool: TBMCostPool.CLOUD },

  // Containers
  'container': { tower: TBMResourceTower.COMPUTE, subTower: 'Containers', costPool: TBMCostPool.CLOUD },
  'pod': { tower: TBMResourceTower.COMPUTE, subTower: 'Containers', costPool: TBMCostPool.CLOUD },
  'kubernetes-cluster': { tower: TBMResourceTower.COMPUTE, subTower: 'Containers', costPool: TBMCostPool.CLOUD },

  // Serverless
  'lambda': { tower: TBMResourceTower.COMPUTE, subTower: 'Serverless', costPool: TBMCostPool.CLOUD },
  'function': { tower: TBMResourceTower.COMPUTE, subTower: 'Serverless', costPool: TBMCostPool.CLOUD },
  'cloud-function': { tower: TBMResourceTower.COMPUTE, subTower: 'Serverless', costPool: TBMCostPool.CLOUD },

  // Storage
  'storage': { tower: TBMResourceTower.STORAGE, subTower: 'Block Storage', costPool: TBMCostPool.HARDWARE },
  'storage-volume': { tower: TBMResourceTower.STORAGE, subTower: 'Block Storage', costPool: TBMCostPool.CLOUD },
  'block-storage': { tower: TBMResourceTower.STORAGE, subTower: 'Block Storage', costPool: TBMCostPool.CLOUD },
  'object-storage': { tower: TBMResourceTower.STORAGE, subTower: 'Object Storage', costPool: TBMCostPool.CLOUD },
  's3-bucket': { tower: TBMResourceTower.STORAGE, subTower: 'Object Storage', costPool: TBMCostPool.CLOUD },
  'blob-storage': { tower: TBMResourceTower.STORAGE, subTower: 'Object Storage', costPool: TBMCostPool.CLOUD },
  'file-storage': { tower: TBMResourceTower.STORAGE, subTower: 'File Storage', costPool: TBMCostPool.CLOUD },
  'nas': { tower: TBMResourceTower.STORAGE, subTower: 'SAN/NAS', costPool: TBMCostPool.HARDWARE },
  'san': { tower: TBMResourceTower.STORAGE, subTower: 'SAN/NAS', costPool: TBMCostPool.HARDWARE },

  // Network
  'network-device': { tower: TBMResourceTower.NETWORK, subTower: 'Switches', costPool: TBMCostPool.HARDWARE },
  'router': { tower: TBMResourceTower.NETWORK, subTower: 'Routers', costPool: TBMCostPool.HARDWARE },
  'switch': { tower: TBMResourceTower.NETWORK, subTower: 'Switches', costPool: TBMCostPool.HARDWARE },
  'load-balancer': { tower: TBMResourceTower.NETWORK, subTower: 'Load Balancers', costPool: TBMCostPool.CLOUD },
  'firewall': { tower: TBMResourceTower.NETWORK, subTower: 'Firewalls', costPool: TBMCostPool.HARDWARE },
  'vpn': { tower: TBMResourceTower.NETWORK, subTower: 'VPN', costPool: TBMCostPool.CLOUD },
  'cdn': { tower: TBMResourceTower.NETWORK, subTower: 'CDN', costPool: TBMCostPool.CLOUD },

  // Databases
  'database': { tower: TBMResourceTower.DATA, subTower: 'Relational Databases', costPool: TBMCostPool.SOFTWARE },
  'rds': { tower: TBMResourceTower.DATA, subTower: 'Relational Databases', costPool: TBMCostPool.CLOUD },
  'sql-database': { tower: TBMResourceTower.DATA, subTower: 'Relational Databases', costPool: TBMCostPool.CLOUD },
  'nosql-database': { tower: TBMResourceTower.DATA, subTower: 'NoSQL Databases', costPool: TBMCostPool.CLOUD },
  'dynamodb': { tower: TBMResourceTower.DATA, subTower: 'NoSQL Databases', costPool: TBMCostPool.CLOUD },
  'cosmosdb': { tower: TBMResourceTower.DATA, subTower: 'NoSQL Databases', costPool: TBMCostPool.CLOUD },
  'mongodb': { tower: TBMResourceTower.DATA, subTower: 'NoSQL Databases', costPool: TBMCostPool.SOFTWARE },
  'cache': { tower: TBMResourceTower.DATA, subTower: 'Cache Services', costPool: TBMCostPool.CLOUD },
  'redis': { tower: TBMResourceTower.DATA, subTower: 'Cache Services', costPool: TBMCostPool.SOFTWARE },
  'memcached': { tower: TBMResourceTower.DATA, subTower: 'Cache Services', costPool: TBMCostPool.SOFTWARE },
  'data-warehouse': { tower: TBMResourceTower.DATA, subTower: 'Data Warehouses', costPool: TBMCostPool.CLOUD },
  'data-lake': { tower: TBMResourceTower.DATA, subTower: 'Data Lakes', costPool: TBMCostPool.CLOUD },

  // Security
  'security-service': { tower: TBMResourceTower.SECURITY, subTower: 'Threat Detection', costPool: TBMCostPool.CLOUD },
  'iam': { tower: TBMResourceTower.SECURITY, subTower: 'Identity Management', costPool: TBMCostPool.CLOUD },
  'kms': { tower: TBMResourceTower.SECURITY, subTower: 'Key Management', costPool: TBMCostPool.CLOUD },
  'waf': { tower: TBMResourceTower.SECURITY, subTower: 'WAF', costPool: TBMCostPool.CLOUD },

  // Applications
  'application': { tower: TBMResourceTower.APPLICATIONS, subTower: 'Business Applications', costPool: TBMCostPool.SOFTWARE },
  'service': { tower: TBMResourceTower.APPLICATIONS, subTower: 'Business Applications', costPool: TBMCostPool.SOFTWARE },
  'saas-application': { tower: TBMResourceTower.APPLICATIONS, subTower: 'Business Applications', costPool: TBMCostPool.CLOUD },

  // End User
  'workstation': { tower: TBMResourceTower.END_USER, subTower: 'Workstations', costPool: TBMCostPool.HARDWARE },
  'laptop': { tower: TBMResourceTower.END_USER, subTower: 'Workstations', costPool: TBMCostPool.HARDWARE },
  'desktop': { tower: TBMResourceTower.END_USER, subTower: 'Workstations', costPool: TBMCostPool.HARDWARE },
  'mobile-device': { tower: TBMResourceTower.END_USER, subTower: 'Mobile Devices', costPool: TBMCostPool.HARDWARE },

  // IoT and Emerging
  'iot-device': { tower: TBMResourceTower.IOT, subTower: 'IoT Devices', costPool: TBMCostPool.HARDWARE },
  'iot-gateway': { tower: TBMResourceTower.IOT, subTower: 'Edge Computing', costPool: TBMCostPool.HARDWARE },
  'edge-node': { tower: TBMResourceTower.IOT, subTower: 'Edge Computing', costPool: TBMCostPool.HARDWARE }
};

/**
 * Get TBM tower mapping for a CI type
 */
export function getTowerMapping(ciType: string): { tower: TBMResourceTower; subTower: string; costPool: TBMCostPool } | null {
  const normalizedType = ciType.toLowerCase().replace(/_/g, '-');
  return CI_TYPE_TO_TOWER[normalizedType] || null;
}

/**
 * Get all sub-towers for a given tower
 */
export function getSubTowersForTower(tower: TBMResourceTower): TBMSubTower[] {
  return TBM_SUB_TOWERS.filter(st => st.tower === tower);
}

/**
 * Validate tower/sub-tower combination
 */
export function isValidSubTower(tower: TBMResourceTower, subTower: string): boolean {
  return TBM_SUB_TOWERS.some(st => st.tower === tower && st.name === subTower);
}

/**
 * Get default cost pool for a tower
 */
export function getDefaultCostPool(tower: TBMResourceTower): TBMCostPool {
  const poolMapping: Record<TBMResourceTower, TBMCostPool> = {
    [TBMResourceTower.COMPUTE]: TBMCostPool.HARDWARE,
    [TBMResourceTower.STORAGE]: TBMCostPool.HARDWARE,
    [TBMResourceTower.NETWORK]: TBMCostPool.HARDWARE,
    [TBMResourceTower.DATA]: TBMCostPool.SOFTWARE,
    [TBMResourceTower.SECURITY]: TBMCostPool.SOFTWARE,
    [TBMResourceTower.APPLICATIONS]: TBMCostPool.SOFTWARE,
    [TBMResourceTower.END_USER]: TBMCostPool.HARDWARE,
    [TBMResourceTower.FACILITIES]: TBMCostPool.FACILITIES,
    [TBMResourceTower.TELECOM]: TBMCostPool.TELECOM,
    [TBMResourceTower.RISK_COMPLIANCE]: TBMCostPool.OUTSIDE_SERVICES,
    [TBMResourceTower.IOT]: TBMCostPool.HARDWARE,
    [TBMResourceTower.BLOCKCHAIN]: TBMCostPool.CLOUD,
    [TBMResourceTower.QUANTUM]: TBMCostPool.CLOUD
  };

  return poolMapping[tower] || TBMCostPool.HARDWARE;
}

/**
 * Infer tower from metadata keywords
 */
export function inferTowerFromMetadata(metadata: Record<string, any>): TBMResourceTower | null {
  const keywords = JSON.stringify(metadata).toLowerCase();

  if (keywords.includes('compute') || keywords.includes('cpu') || keywords.includes('instance')) {
    return TBMResourceTower.COMPUTE;
  }
  if (keywords.includes('storage') || keywords.includes('disk') || keywords.includes('volume')) {
    return TBMResourceTower.STORAGE;
  }
  if (keywords.includes('network') || keywords.includes('router') || keywords.includes('switch')) {
    return TBMResourceTower.NETWORK;
  }
  if (keywords.includes('database') || keywords.includes('sql') || keywords.includes('nosql')) {
    return TBMResourceTower.DATA;
  }
  if (keywords.includes('security') || keywords.includes('firewall') || keywords.includes('encryption')) {
    return TBMResourceTower.SECURITY;
  }

  return null;
}
