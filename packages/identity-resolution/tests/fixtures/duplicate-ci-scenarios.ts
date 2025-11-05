/**
 * Test Fixtures - Duplicate CI Scenarios
 * Realistic scenarios of the same server/device discovered via multiple sources
 */

import { TransformedCI, IdentificationAttributes } from '@cmdb/integration-framework';

/**
 * Scenario 1: Physical server discovered via multiple sources
 * Same server seen by: VMware vCenter, AWS (on-prem monitoring), SSH, and SNMP
 */
export const physicalServerDuplicates: TransformedCI[] = [
  // Discovery 1: VMware vCenter
  {
    name: 'prod-db-01.example.com',
    ci_type: 'virtual-machine',
    environment: 'production',
    status: 'active',
    attributes: {
      hostname: 'prod-db-01',
      fqdn: 'prod-db-01.example.com',
      os_type: 'linux',
      os_version: 'Ubuntu 22.04 LTS',
      cpu_count: 8,
      memory_gb: 32,
      disk_gb: 500,
      hypervisor: 'VMware ESXi 7.0',
      vm_uuid: 'vm-12345-6789-abcd-ef01',
    },
    identifiers: {
      uuid: 'vm-12345-6789-abcd-ef01',
      hostname: 'prod-db-01',
      fqdn: 'prod-db-01.example.com',
      ip_address: ['10.0.1.50', '172.16.0.50'],
      mac_address: ['00:50:56:ab:cd:ef'],
    },
    source: 'vmware',
    source_id: 'vm-12345',
    confidence_score: 95,
  },

  // Discovery 2: AWS (on-prem monitoring via Systems Manager)
  {
    name: 'prod-db-01',
    ci_type: 'server',
    environment: 'production',
    status: 'active',
    attributes: {
      hostname: 'prod-db-01',
      os_type: 'Linux',
      os_version: 'Ubuntu 22.04.1 LTS',
      cpu_count: 8,
      memory_gb: 32,
      platform: 'Ubuntu',
      architecture: 'x86_64',
      kernel_version: '5.15.0-76-generic',
    },
    identifiers: {
      external_id: 'mi-0123456789abcdef0',
      hostname: 'prod-db-01',
      fqdn: 'prod-db-01.example.com',
      ip_address: ['10.0.1.50'],
      mac_address: ['00:50:56:ab:cd:ef'],
    },
    source: 'aws',
    source_id: 'mi-0123456789abcdef0',
    confidence_score: 90,
  },

  // Discovery 3: SSH discovery
  {
    name: 'prod-db-01.example.com',
    ci_type: 'server',
    environment: 'production',
    status: 'active',
    attributes: {
      hostname: 'prod-db-01',
      fqdn: 'prod-db-01.example.com',
      os_type: 'linux',
      os_version: 'Ubuntu 22.04.1 LTS',
      kernel: '5.15.0-76-generic',
      cpu_count: 8,
      memory_gb: 32,
      uptime_days: 87,
      serial_number: 'VMware-42 1e 8d 9c 3f 7a 5b 2d-a1 b2 c3 d4 e5 f6 07 08',
    },
    identifiers: {
      serial_number: 'VMware-42 1e 8d 9c 3f 7a 5b 2d-a1 b2 c3 d4 e5 f6 07 08',
      hostname: 'prod-db-01',
      fqdn: 'prod-db-01.example.com',
      ip_address: ['10.0.1.50', '172.16.0.50'],
      mac_address: ['00:50:56:ab:cd:ef'],
    },
    source: 'ssh',
    source_id: '10.0.1.50',
    confidence_score: 85,
  },

  // Discovery 4: SNMP discovery
  {
    name: '10.0.1.50',
    ci_type: 'server',
    environment: 'production',
    status: 'active',
    attributes: {
      hostname: 'prod-db-01',
      snmp_sys_name: 'prod-db-01.example.com',
      snmp_sys_descr: 'Linux prod-db-01 5.15.0-76-generic',
      snmp_sys_uptime: 7516800,
      snmp_sys_contact: 'ops@example.com',
      snmp_sys_location: 'DC1-Rack-15-U10',
    },
    identifiers: {
      hostname: 'prod-db-01',
      fqdn: 'prod-db-01.example.com',
      ip_address: ['10.0.1.50'],
      mac_address: ['00:50:56:ab:cd:ef'],
    },
    source: 'nmap',
    source_id: '10.0.1.50',
    confidence_score: 70,
  },
];

/**
 * Scenario 2: Cloud VM with slight hostname variations
 * Same EC2 instance discovered via AWS API and SSH with hostname case differences
 */
export const cloudVMWithVariations: TransformedCI[] = [
  // Discovery 1: AWS API
  {
    name: 'WebServer-Prod-01',
    ci_type: 'virtual-machine',
    environment: 'production',
    status: 'active',
    attributes: {
      instance_id: 'i-0abcdef123456789',
      instance_type: 't3.large',
      availability_zone: 'us-east-1a',
      vpc_id: 'vpc-12345678',
      subnet_id: 'subnet-12345678',
      security_groups: ['sg-web-prod'],
      ami_id: 'ami-0123456789abcdef0',
      launch_time: '2023-01-15T10:30:00Z',
    },
    identifiers: {
      external_id: 'i-0abcdef123456789',
      hostname: 'webserver-prod-01',
      ip_address: ['10.0.2.100', '54.123.45.67'],
      mac_address: ['02:ab:cd:ef:12:34'],
    },
    source: 'aws',
    source_id: 'i-0abcdef123456789',
    confidence_score: 100,
  },

  // Discovery 2: SSH (hostname lowercase)
  {
    name: 'webserver-prod-01',
    ci_type: 'server',
    environment: 'production',
    status: 'active',
    attributes: {
      hostname: 'webserver-prod-01',
      os_type: 'linux',
      os_version: 'Amazon Linux 2',
      kernel: '5.10.184-175.731.amzn2.x86_64',
      cpu_count: 2,
      memory_gb: 8,
      serial_number: 'ec2-i-0abcdef123456789',
    },
    identifiers: {
      serial_number: 'ec2-i-0abcdef123456789',
      hostname: 'webserver-prod-01',
      ip_address: ['10.0.2.100'],
      mac_address: ['02:ab:cd:ef:12:34'],
    },
    source: 'ssh',
    source_id: '10.0.2.100',
    confidence_score: 90,
  },
];

/**
 * Scenario 3: Network device with multiple management IPs
 * Cisco switch discovered via SNMP on both management IPs
 */
export const networkDeviceDuplicates: TransformedCI[] = [
  // Discovery 1: Primary management IP
  {
    name: 'core-switch-01',
    ci_type: 'network-device',
    environment: 'production',
    status: 'active',
    attributes: {
      model: 'Cisco Catalyst 9300',
      serial_number: 'FCW2229L0MA',
      os_version: 'IOS-XE 17.6.3',
      snmp_sys_name: 'core-switch-01.example.com',
      location: 'DC1-Network-Room',
      port_count: 48,
    },
    identifiers: {
      serial_number: 'FCW2229L0MA',
      hostname: 'core-switch-01',
      fqdn: 'core-switch-01.example.com',
      ip_address: ['192.168.100.10'],
      mac_address: ['a4:6c:2a:1b:3c:4d'],
    },
    source: 'nmap',
    source_id: '192.168.100.10',
    confidence_score: 85,
  },

  // Discovery 2: Secondary management IP (same device)
  {
    name: 'core-switch-01',
    ci_type: 'network-device',
    environment: 'production',
    status: 'active',
    attributes: {
      model: 'Cisco Catalyst 9300',
      serial_number: 'FCW2229L0MA',
      os_version: 'IOS-XE 17.6.3',
      snmp_sys_name: 'core-switch-01.example.com',
      location: 'DC1-Network-Room',
      port_count: 48,
    },
    identifiers: {
      serial_number: 'FCW2229L0MA',
      hostname: 'core-switch-01',
      fqdn: 'core-switch-01.example.com',
      ip_address: ['10.0.0.10'],
      mac_address: ['a4:6c:2a:1b:3c:4d'],
    },
    source: 'nmap',
    source_id: '10.0.0.10',
    confidence_score: 85,
  },
];

/**
 * Scenario 4: Database instance with conflicting metadata
 * Same PostgreSQL database discovered via two different monitoring tools
 * Contains conflicts in version numbers and performance metrics
 */
export const databaseWithConflicts: TransformedCI[] = [
  // Discovery 1: Datadog monitoring (higher authority)
  {
    name: 'prod-postgres-primary',
    ci_type: 'database',
    environment: 'production',
    status: 'active',
    attributes: {
      database_type: 'postgresql',
      version: '14.8',
      port: 5432,
      max_connections: 200,
      shared_buffers: '4GB',
      monitoring_enabled: true,
      replication_role: 'primary',
      disk_usage_gb: 250,
      connection_count: 45,
    },
    identifiers: {
      hostname: 'prod-postgres-primary',
      fqdn: 'prod-postgres-primary.example.com',
      ip_address: ['10.0.3.50'],
    },
    source: 'datadog',
    source_id: 'db-postgres-prod-001',
    confidence_score: 95,
  },

  // Discovery 2: Custom script (lower authority, slightly stale data)
  {
    name: 'prod-postgres-primary',
    ci_type: 'database',
    environment: 'production',
    status: 'active',
    attributes: {
      database_type: 'postgresql',
      version: '14.7', // Older version detected (before upgrade)
      port: 5432,
      max_connections: 150, // Different configuration value
      shared_buffers: '4GB',
      disk_usage_gb: 245, // Slightly different
      connection_count: 52, // Different snapshot time
      backup_enabled: true,
    },
    identifiers: {
      hostname: 'prod-postgres-primary',
      fqdn: 'prod-postgres-primary.example.com',
      ip_address: ['10.0.3.50'],
    },
    source: 'ssh',
    source_id: '10.0.3.50',
    confidence_score: 80,
  },
];

/**
 * Scenario 5: Containerized application
 * Same Docker container discovered via Docker API and Kubernetes API
 */
export const containerizedAppDuplicates: TransformedCI[] = [
  // Discovery 1: Docker API
  {
    name: 'api-service-7f8d9e',
    ci_type: 'container',
    environment: 'production',
    status: 'active',
    attributes: {
      container_id: '7f8d9e1234567890abcdef',
      image: 'company/api-service:v2.3.1',
      image_id: 'sha256:abcdef1234567890',
      created_at: '2023-10-01T14:30:00Z',
      ports: ['8080:80'],
      volumes: ['/data:/app/data'],
      labels: {
        'app': 'api-service',
        'env': 'production',
        'version': 'v2.3.1',
      },
    },
    identifiers: {
      external_id: '7f8d9e1234567890abcdef',
      hostname: 'api-service-7f8d9e',
      ip_address: ['172.17.0.5'],
      custom_identifiers: {
        container_id_short: '7f8d9e123456',
      },
    },
    source: 'docker',
    source_id: '7f8d9e1234567890abcdef',
    confidence_score: 100,
  },

  // Discovery 2: Kubernetes API (same container)
  {
    name: 'api-service-deployment-7f8d9e-abcde',
    ci_type: 'container',
    environment: 'production',
    status: 'active',
    attributes: {
      pod_name: 'api-service-deployment-7f8d9e-abcde',
      container_name: 'api-service',
      namespace: 'production',
      image: 'company/api-service:v2.3.1',
      node_name: 'k8s-node-03',
      restart_count: 0,
      labels: {
        'app': 'api-service',
        'env': 'production',
        'version': 'v2.3.1',
      },
    },
    identifiers: {
      external_id: 'api-service-deployment-7f8d9e-abcde',
      hostname: 'api-service-7f8d9e',
      ip_address: ['172.17.0.5'],
      custom_identifiers: {
        pod_uid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      },
    },
    source: 'kubernetes',
    source_id: 'api-service-deployment-7f8d9e-abcde',
    confidence_score: 95,
  },
];

/**
 * Scenario 6: Application with no strong identifiers
 * Same application discovered via different methods with only fuzzy matching possible
 */
export const applicationFuzzyMatch: TransformedCI[] = [
  // Discovery 1: ServiceNow CMDB
  {
    name: 'Customer Portal Web App',
    ci_type: 'application',
    environment: 'production',
    status: 'active',
    attributes: {
      app_id: 'SN-APP-12345',
      description: 'Customer self-service portal',
      version: '3.2.1',
      owner: 'Digital Experience Team',
      business_criticality: 'high',
    },
    identifiers: {
      external_id: 'SN-APP-12345',
      hostname: 'customer-portal',
      custom_identifiers: {
        servicenow_sys_id: 'a1b2c3d4e5f6',
      },
    },
    source: 'servicenow',
    source_id: 'SN-APP-12345',
    confidence_score: 90,
  },

  // Discovery 2: APM tool (slight name variation)
  {
    name: 'customer-portal-webapp',
    ci_type: 'application',
    environment: 'production',
    status: 'active',
    attributes: {
      app_name: 'customer-portal-webapp',
      version: '3.2.1',
      framework: 'React 18',
      language: 'JavaScript',
      response_time_ms: 145,
      error_rate: 0.02,
    },
    identifiers: {
      hostname: 'customer-portal',
      custom_identifiers: {
        apm_app_id: 'apm-987654',
      },
    },
    source: 'datadog',
    source_id: 'apm-987654',
    confidence_score: 85,
  },
];

/**
 * Expected reconciliation results for testing
 */
export const expectedReconciliationResults = {
  physicalServer: {
    ci_id: 'ci_expected_physical_server',
    total_sources: 4,
    highest_confidence_source: 'vmware',
    merged_attributes: {
      hostname: 'prod-db-01',
      fqdn: 'prod-db-01.example.com',
      serial_number: 'VMware-42 1e 8d 9c 3f 7a 5b 2d-a1 b2 c3 d4 e5 f6 07 08',
      uuid: 'vm-12345-6789-abcd-ef01',
      os_type: 'linux',
      os_version: 'Ubuntu 22.04.1 LTS',
    },
    match_strategies_used: ['uuid', 'serial_number', 'mac_address', 'fqdn'],
  },
  cloudVM: {
    ci_id: 'ci_expected_cloud_vm',
    total_sources: 2,
    highest_confidence_source: 'aws',
    merged_attributes: {
      instance_id: 'i-0abcdef123456789',
      hostname: 'webserver-prod-01',
    },
    match_strategies_used: ['external_id', 'mac_address'],
  },
  networkDevice: {
    ci_id: 'ci_expected_network_device',
    total_sources: 2,
    highest_confidence_source: 'nmap',
    merged_attributes: {
      serial_number: 'FCW2229L0MA',
      hostname: 'core-switch-01',
      ip_addresses: ['192.168.100.10', '10.0.0.10'], // Merged from both sources
    },
    match_strategies_used: ['serial_number'],
  },
};
