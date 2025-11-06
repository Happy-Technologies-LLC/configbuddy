/**
 * Test Data Generator for ConfigBuddy v3.0
 *
 * Provides utilities for generating realistic test data for:
 * - Configuration Items (with ITIL, TBM, BSM attributes)
 * - Business Services
 * - Incidents
 * - Changes
 * - Cost Allocations
 * - Relationships
 *
 * @usage
 * ```typescript
 * import { generateTestCI, generateTestBusinessService } from '@cmdb/common/test-utils';
 *
 * const ci = generateTestCI({ type: 'server', environment: 'production' });
 * const service = generateTestBusinessService({ criticality: 'tier_0' });
 * ```
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Type Definitions
// ============================================================================

export type CIType =
  | 'server'
  | 'virtual-machine'
  | 'container'
  | 'application'
  | 'service'
  | 'database'
  | 'network-device'
  | 'storage'
  | 'load-balancer'
  | 'cloud-resource';

export type CIStatus = 'active' | 'inactive' | 'maintenance' | 'decommissioned';

export type Environment = 'production' | 'staging' | 'development' | 'test';

export type BusinessCriticality = 'tier_0' | 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4';

export type ITILCIClass = 'hardware' | 'software' | 'service' | 'network' | 'facility';

export type ITILLifecycle = 'planning' | 'design' | 'build' | 'test' | 'deploy' | 'operate' | 'retire';

export type TBMResourceTower = 'compute' | 'storage' | 'network' | 'data' | 'security' | 'end_user';

export type AllocationMethod = 'direct' | 'usage_based' | 'equal';

export type IncidentPriority = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';

export type IncidentStatus = 'new' | 'in_progress' | 'resolved' | 'closed';

export type ChangeStatus = 'requested' | 'approved' | 'scheduled' | 'implemented' | 'closed';

// ============================================================================
// Configuration Item Generator
// ============================================================================

export interface GenerateCIOptions {
  id?: string;
  name?: string;
  type?: CIType;
  status?: CIStatus;
  environment?: Environment;
  criticality?: BusinessCriticality;
  monthly_cost?: number;
  owner?: string;
  includeITIL?: boolean;
  includeTBM?: boolean;
  includeBSM?: boolean;
}

export interface TestCI {
  id: string;
  external_id: string;
  name: string;
  type: CIType;
  status: CIStatus;
  environment: Environment;
  owner: string;
  technical_contact: string;
  created_at: Date;
  updated_at: Date;
  discovered_at: Date;
  itil_attributes?: {
    ci_class: ITILCIClass;
    lifecycle_stage: ITILLifecycle;
    configuration_status: string;
    version: string;
    last_audited: Date;
    audit_status: 'compliant' | 'non_compliant' | 'unknown';
  };
  tbm_attributes?: {
    resource_tower: TBMResourceTower;
    sub_tower: string;
    cost_pool: string;
    monthly_cost: number;
    cost_allocation_method: AllocationMethod;
  };
  bsm_attributes?: {
    business_criticality: BusinessCriticality;
    supports_business_services: string[];
    customer_facing: boolean;
    compliance_scope: string[];
    data_classification: string;
  };
  metadata: Record<string, any>;
}

/**
 * Generate a test Configuration Item
 */
export function generateTestCI(options: GenerateCIOptions = {}): TestCI {
  const {
    id = `ci-${uuidv4()}`,
    name,
    type = randomChoice(['server', 'virtual-machine', 'application', 'database'] as CIType[]),
    status = 'active',
    environment = randomChoice(['production', 'staging', 'development'] as Environment[]),
    criticality = randomChoice(['tier_1', 'tier_2', 'tier_3'] as BusinessCriticality[]),
    monthly_cost = randomNumber(100, 10000),
    owner = randomEmail(),
    includeITIL = true,
    includeTBM = true,
    includeBSM = true,
  } = options;

  const ciName = name || generateCIName(type);
  const now = new Date();

  const ci: TestCI = {
    id,
    external_id: `ext-${randomString(10)}`,
    name: ciName,
    type,
    status,
    environment,
    owner,
    technical_contact: randomEmail(),
    created_at: new Date(now.getTime() - randomNumber(1, 365) * 24 * 60 * 60 * 1000),
    updated_at: now,
    discovered_at: new Date(now.getTime() - randomNumber(0, 30) * 24 * 60 * 60 * 1000),
    metadata: generateCIMetadata(type),
  };

  // Add ITIL attributes
  if (includeITIL) {
    ci.itil_attributes = {
      ci_class: mapTypeToITILClass(type),
      lifecycle_stage: randomChoice(['operate', 'deploy', 'build'] as ITILLifecycle[]),
      configuration_status: 'active',
      version: `${randomNumber(1, 5)}.${randomNumber(0, 9)}.${randomNumber(0, 20)}`,
      last_audited: new Date(now.getTime() - randomNumber(1, 90) * 24 * 60 * 60 * 1000),
      audit_status: randomChoice(['compliant', 'non_compliant', 'unknown'] as const),
    };
  }

  // Add TBM attributes
  if (includeTBM) {
    ci.tbm_attributes = {
      resource_tower: mapTypeToResourceTower(type),
      sub_tower: generateSubTower(type),
      cost_pool: randomChoice(['hardware', 'software', 'cloud'] as const),
      monthly_cost,
      cost_allocation_method: randomChoice(['direct', 'usage_based', 'equal'] as AllocationMethod[]),
    };
  }

  // Add BSM attributes
  if (includeBSM) {
    ci.bsm_attributes = {
      business_criticality: criticality,
      supports_business_services: generateBusinessServiceIds(randomNumber(1, 3)),
      customer_facing: randomBoolean(0.3),
      compliance_scope: randomChoice([
        ['PCI_DSS'],
        ['HIPAA'],
        ['SOX', 'PCI_DSS'],
        ['GDPR'],
        [],
      ]),
      data_classification: randomChoice(['public', 'internal', 'confidential', 'restricted']),
    };
  }

  return ci;
}

/**
 * Generate multiple test CIs
 */
export function generateTestCIs(options: { count: number } & GenerateCIOptions): TestCI[] {
  const { count, ...ciOptions } = options;
  return Array.from({ length: count }, () => generateTestCI(ciOptions));
}

// ============================================================================
// Business Service Generator
// ============================================================================

export interface GenerateBusinessServiceOptions {
  id?: string;
  name?: string;
  criticality?: BusinessCriticality;
  annual_revenue_supported?: number;
  customer_count?: number;
  monthly_cost?: number;
  service_owner?: string;
}

export interface TestBusinessService {
  id: string;
  name: string;
  description: string;
  itil_attributes: {
    service_owner: string;
    service_type: 'customer_facing' | 'internal' | 'infrastructure';
    service_hours: {
      availability: '24x7' | '24x5' | 'business_hours';
      timezone: string;
      maintenance_windows: any[];
    };
    sla_targets: {
      availability_percentage: number;
      response_time_ms: number;
      error_rate_percentage: number;
      measured_period: 'monthly';
    };
    support_level: 'l1' | 'l2' | 'l3' | 'l4';
    incident_count_30d: number;
    change_count_30d: number;
    availability_30d: number;
  };
  tbm_attributes: {
    total_monthly_cost: number;
    cost_per_user: number;
    cost_per_transaction: number;
    cost_breakdown_by_tower: Record<string, number>;
    cost_trend: 'increasing' | 'stable' | 'decreasing';
  };
  bsm_attributes: {
    business_criticality: BusinessCriticality;
    capabilities_enabled: string[];
    value_streams: string[];
    business_impact_score: number;
    risk_rating: 'critical' | 'high' | 'medium' | 'low';
    annual_revenue_supported: number;
    customer_count: number;
    transaction_volume_daily: number;
    compliance_requirements: any[];
    data_sensitivity: string;
    sox_scope: boolean;
    pci_scope: boolean;
    recovery_time_objective: number;
    recovery_point_objective: number;
    disaster_recovery_tier: 1 | 2 | 3 | 4;
  };
  application_services: string[];
  technical_owner: string;
  platform_team: string;
  operational_status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  last_incident: Date;
  last_validated: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Generate a test Business Service
 */
export function generateTestBusinessService(options: GenerateBusinessServiceOptions = {}): TestBusinessService {
  const {
    id = `bs-${uuidv4()}`,
    name,
    criticality = randomChoice(['tier_1', 'tier_2', 'tier_3'] as BusinessCriticality[]),
    annual_revenue_supported,
    customer_count,
    monthly_cost,
    service_owner = randomEmail(),
  } = options;

  const serviceName = name || generateBusinessServiceName();
  const now = new Date();

  // Calculate metrics based on criticality
  const metrics = calculateServiceMetrics(criticality, annual_revenue_supported, customer_count, monthly_cost);

  return {
    id,
    name: serviceName,
    description: `${serviceName} - Business service providing ${randomChoice(['customer engagement', 'transaction processing', 'data analytics', 'reporting'])} capabilities`,
    itil_attributes: {
      service_owner,
      service_type: metrics.customer_facing ? 'customer_facing' : 'internal',
      service_hours: {
        availability: metrics.availability,
        timezone: 'UTC',
        maintenance_windows: [],
      },
      sla_targets: {
        availability_percentage: metrics.sla_availability,
        response_time_ms: metrics.sla_response_time,
        error_rate_percentage: 0.1,
        measured_period: 'monthly',
      },
      support_level: metrics.support_level,
      incident_count_30d: randomNumber(0, metrics.max_incidents),
      change_count_30d: randomNumber(1, 10),
      availability_30d: randomNumber(metrics.sla_availability - 1, 100),
    },
    tbm_attributes: {
      total_monthly_cost: metrics.monthly_cost,
      cost_per_user: metrics.cost_per_user,
      cost_per_transaction: metrics.cost_per_transaction,
      cost_breakdown_by_tower: {
        compute: metrics.monthly_cost * 0.4,
        storage: metrics.monthly_cost * 0.2,
        network: metrics.monthly_cost * 0.15,
        data: metrics.monthly_cost * 0.15,
        security: metrics.monthly_cost * 0.1,
      },
      cost_trend: randomChoice(['increasing', 'stable', 'decreasing'] as const),
    },
    bsm_attributes: {
      business_criticality: criticality,
      capabilities_enabled: generateCapabilities(randomNumber(2, 5)),
      value_streams: generateValueStreams(randomNumber(1, 3)),
      business_impact_score: metrics.impact_score,
      risk_rating: metrics.risk_rating,
      annual_revenue_supported: metrics.annual_revenue,
      customer_count: metrics.customer_count,
      transaction_volume_daily: metrics.transaction_volume,
      compliance_requirements: [],
      data_sensitivity: randomChoice(['public', 'internal', 'confidential', 'restricted']),
      sox_scope: randomBoolean(0.3),
      pci_scope: randomBoolean(0.2),
      recovery_time_objective: metrics.rto,
      recovery_point_objective: metrics.rpo,
      disaster_recovery_tier: metrics.dr_tier,
    },
    application_services: generateApplicationServiceIds(randomNumber(2, 5)),
    technical_owner: randomEmail(),
    platform_team: randomChoice(['Platform Team A', 'Platform Team B', 'Infrastructure Team']),
    operational_status: randomChoice(['operational', 'operational', 'operational', 'degraded'] as const),
    last_incident: new Date(now.getTime() - randomNumber(1, 60) * 24 * 60 * 60 * 1000),
    last_validated: new Date(now.getTime() - randomNumber(1, 90) * 24 * 60 * 60 * 1000),
    created_at: new Date(now.getTime() - randomNumber(180, 730) * 24 * 60 * 60 * 1000),
    updated_at: now,
  };
}

/**
 * Generate multiple test Business Services
 */
export function generateTestBusinessServices(count: number, options: GenerateBusinessServiceOptions = {}): TestBusinessService[] {
  return Array.from({ length: count }, () => generateTestBusinessService(options));
}

// ============================================================================
// Incident Generator
// ============================================================================

export interface GenerateIncidentOptions {
  id?: string;
  affected_ci_id?: string;
  priority?: IncidentPriority;
  status?: IncidentStatus;
}

export interface TestIncident {
  id: string;
  title: string;
  description: string;
  affected_ci_id: string;
  reported_by: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  urgency: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  created_at: Date;
  updated_at: Date;
  resolved_at?: Date;
  sla_breach_time: Date;
  itil_attributes?: {
    category: string;
    subcategory: string;
    assigned_to: string;
    assigned_group: string;
  };
  tbm_attributes?: {
    estimated_downtime_cost: number;
    labor_cost: number;
  };
  bsm_attributes?: {
    affected_ci_count: number;
    impact_score: number;
    affected_business_services: string[];
  };
}

/**
 * Generate a test Incident
 */
export function generateTestIncident(options: GenerateIncidentOptions = {}): TestIncident {
  const {
    id = `inc-${uuidv4()}`,
    affected_ci_id = `ci-${uuidv4()}`,
    priority = randomChoice(['P2', 'P3', 'P4'] as IncidentPriority[]),
    status = randomChoice(['new', 'in_progress', 'resolved'] as IncidentStatus[]),
  } = options;

  const now = new Date();
  const created = new Date(now.getTime() - randomNumber(1, 48) * 60 * 60 * 1000);
  const slaHours = { P1: 4, P2: 8, P3: 24, P4: 48, P5: 120 }[priority];

  return {
    id,
    title: generateIncidentTitle(),
    description: generateIncidentDescription(),
    affected_ci_id,
    reported_by: randomEmail(),
    priority,
    status,
    urgency: randomChoice(['high', 'medium', 'low'] as const),
    impact: randomChoice(['high', 'medium', 'low'] as const),
    created_at: created,
    updated_at: now,
    resolved_at: status === 'resolved' || status === 'closed' ? new Date(created.getTime() + randomNumber(1, slaHours) * 60 * 60 * 1000) : undefined,
    sla_breach_time: new Date(created.getTime() + slaHours * 60 * 60 * 1000),
    itil_attributes: {
      category: randomChoice(['Hardware', 'Software', 'Network', 'Access']),
      subcategory: randomChoice(['Performance', 'Availability', 'Functionality', 'Connectivity']),
      assigned_to: randomEmail(),
      assigned_group: randomChoice(['L1 Support', 'L2 Support', 'Infrastructure Team']),
    },
    tbm_attributes: {
      estimated_downtime_cost: randomNumber(1000, 50000),
      labor_cost: randomNumber(100, 5000),
    },
    bsm_attributes: {
      affected_ci_count: randomNumber(1, 20),
      impact_score: randomNumber(30, 95),
      affected_business_services: generateBusinessServiceIds(randomNumber(1, 3)),
    },
  };
}

/**
 * Generate multiple test Incidents
 */
export function generateTestIncidents(count: number, options: GenerateIncidentOptions = {}): TestIncident[] {
  return Array.from({ length: count }, () => generateTestIncident(options));
}

// ============================================================================
// Change Request Generator
// ============================================================================

export interface GenerateChangeOptions {
  id?: string;
  affected_ci_ids?: string[];
  status?: ChangeStatus;
}

export interface TestChange {
  id: string;
  title: string;
  description: string;
  affected_ci_ids: string[];
  requested_by: string;
  change_type: 'standard' | 'normal' | 'emergency';
  status: ChangeStatus;
  approval_status: 'pending' | 'approved' | 'rejected';
  planned_start: Date;
  planned_end: Date;
  created_at: Date;
  updated_at: Date;
  itil_attributes?: {
    change_category: string;
    requires_cab_approval: boolean;
    approved_by: string;
    implementation_plan: string;
    backout_plan: string;
  };
  tbm_attributes?: {
    estimated_implementation_cost: number;
    labor_hours: number;
  };
  bsm_attributes?: {
    risk_score: number;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    affected_services_count: number;
    blast_radius_count: number;
  };
}

/**
 * Generate a test Change Request
 */
export function generateTestChange(options: GenerateChangeOptions = {}): TestChange {
  const {
    id = `chg-${uuidv4()}`,
    affected_ci_ids = [`ci-${uuidv4()}`],
    status = randomChoice(['requested', 'approved', 'scheduled'] as ChangeStatus[]),
  } = options;

  const now = new Date();
  const plannedStart = new Date(now.getTime() + randomNumber(1, 14) * 24 * 60 * 60 * 1000);
  const plannedEnd = new Date(plannedStart.getTime() + randomNumber(1, 8) * 60 * 60 * 1000);

  return {
    id,
    title: generateChangeTitle(),
    description: generateChangeDescription(),
    affected_ci_ids,
    requested_by: randomEmail(),
    change_type: randomChoice(['standard', 'normal', 'normal', 'emergency'] as const),
    status,
    approval_status: status === 'requested' ? 'pending' : 'approved',
    planned_start: plannedStart,
    planned_end: plannedEnd,
    created_at: new Date(now.getTime() - randomNumber(1, 30) * 24 * 60 * 60 * 1000),
    updated_at: now,
    itil_attributes: {
      change_category: randomChoice(['Software Update', 'Hardware Upgrade', 'Configuration Change', 'Infrastructure Change']),
      requires_cab_approval: randomBoolean(0.7),
      approved_by: randomEmail(),
      implementation_plan: 'Standard implementation procedure',
      backout_plan: 'Rollback to previous version',
    },
    tbm_attributes: {
      estimated_implementation_cost: randomNumber(500, 20000),
      labor_hours: randomNumber(2, 40),
    },
    bsm_attributes: {
      risk_score: randomNumber(1, 10),
      risk_level: randomChoice(['low', 'medium', 'high'] as const),
      affected_services_count: randomNumber(1, 5),
      blast_radius_count: randomNumber(5, 50),
    },
  };
}

/**
 * Generate multiple test Change Requests
 */
export function generateTestChanges(count: number, options: GenerateChangeOptions = {}): TestChange[] {
  return Array.from({ length: count }, () => generateTestChange(options));
}

// ============================================================================
// Cost Allocation Generator
// ============================================================================

export interface GenerateCostAllocationOptions {
  ci_id?: string;
  business_service_id?: string;
  amount?: number;
  date?: Date;
  method?: AllocationMethod;
}

export interface TestCostAllocation {
  id: string;
  ci_id: string;
  business_service_id: string;
  amount: number;
  date: Date;
  method: AllocationMethod;
  usage_metric?: string;
  usage_value?: number;
}

/**
 * Generate a test Cost Allocation
 */
export function generateTestCostAllocation(options: GenerateCostAllocationOptions = {}): TestCostAllocation {
  const {
    ci_id = `ci-${uuidv4()}`,
    business_service_id = `bs-${uuidv4()}`,
    amount = randomNumber(100, 10000),
    date = new Date(),
    method = randomChoice(['direct', 'usage_based', 'equal'] as AllocationMethod[]),
  } = options;

  const allocation: TestCostAllocation = {
    id: `alloc-${uuidv4()}`,
    ci_id,
    business_service_id,
    amount,
    date,
    method,
  };

  if (method === 'usage_based') {
    allocation.usage_metric = randomChoice(['cpu_hours', 'storage_gb', 'network_gb', 'requests']);
    allocation.usage_value = randomNumber(100, 10000);
  }

  return allocation;
}

/**
 * Generate multiple test Cost Allocations
 */
export function generateTestCostAllocations(count: number, options: GenerateCostAllocationOptions = {}): TestCostAllocation[] {
  return Array.from({ length: count }, () => generateTestCostAllocation(options));
}

// ============================================================================
// Helper Functions
// ============================================================================

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBoolean(probability: number = 0.5): boolean {
  return Math.random() < probability;
}

function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => randomChoice(chars.split(''))).join('');
}

function randomEmail(): string {
  const names = ['john.doe', 'jane.smith', 'bob.johnson', 'alice.williams', 'charlie.brown'];
  return `${randomChoice(names)}@example.com`;
}

function generateCIName(type: CIType): string {
  const prefixes = {
    'server': 'Server',
    'virtual-machine': 'VM',
    'container': 'Container',
    'application': 'App',
    'service': 'Service',
    'database': 'DB',
    'network-device': 'Network',
    'storage': 'Storage',
    'load-balancer': 'LB',
    'cloud-resource': 'Cloud',
  };
  const environments = ['prod', 'stage', 'dev', 'test'];
  return `${prefixes[type]}-${randomChoice(environments)}-${randomString(6)}`;
}

function generateBusinessServiceName(): string {
  const services = [
    'Customer Portal',
    'E-Commerce Platform',
    'Payment Processing',
    'Inventory Management',
    'Order Management',
    'CRM System',
    'Analytics Platform',
    'Marketing Automation',
    'Mobile App Backend',
    'Data Warehouse',
  ];
  return randomChoice(services);
}

function generateIncidentTitle(): string {
  const issues = [
    'Database connection timeouts',
    'Application performance degradation',
    'Network connectivity issues',
    'Server high CPU usage',
    'Disk space running low',
    'API endpoint returning errors',
    'Authentication service failure',
    'Email delivery delays',
    'Backup job failed',
    'SSL certificate expiring soon',
  ];
  return randomChoice(issues);
}

function generateIncidentDescription(): string {
  return 'Users are experiencing intermittent issues. Investigating root cause and working on resolution.';
}

function generateChangeTitle(): string {
  const changes = [
    'Upgrade database to v15.2',
    'Deploy application v2.3.0',
    'Update SSL certificates',
    'Increase server memory',
    'Apply security patches',
    'Migrate to new data center',
    'Update firewall rules',
    'Configure load balancer',
    'Install monitoring agent',
    'Backup configuration update',
  ];
  return randomChoice(changes);
}

function generateChangeDescription(): string {
  return 'Standard change to improve performance and security. Implementation plan reviewed and approved.';
}

function generateCIMetadata(type: CIType): Record<string, any> {
  const base = {
    tags: [randomChoice(['production', 'staging', 'development']), randomChoice(['critical', 'important', 'standard'])],
    version: `${randomNumber(1, 5)}.${randomNumber(0, 9)}.${randomNumber(0, 20)}`,
  };

  if (type === 'server' || type === 'virtual-machine') {
    return {
      ...base,
      cpu_cores: randomChoice([2, 4, 8, 16, 32]),
      memory_gb: randomChoice([8, 16, 32, 64, 128]),
      os: randomChoice(['Ubuntu 22.04', 'RHEL 8', 'Windows Server 2022']),
    };
  }

  if (type === 'database') {
    return {
      ...base,
      engine: randomChoice(['PostgreSQL', 'MySQL', 'MongoDB', 'Redis']),
      engine_version: `${randomNumber(12, 15)}.${randomNumber(0, 9)}`,
      storage_gb: randomNumber(100, 5000),
    };
  }

  return base;
}

function mapTypeToITILClass(type: CIType): ITILCIClass {
  const mapping: Record<CIType, ITILCIClass> = {
    'server': 'hardware',
    'virtual-machine': 'hardware',
    'container': 'software',
    'application': 'software',
    'service': 'service',
    'database': 'software',
    'network-device': 'network',
    'storage': 'hardware',
    'load-balancer': 'network',
    'cloud-resource': 'service',
  };
  return mapping[type];
}

function mapTypeToResourceTower(type: CIType): TBMResourceTower {
  const mapping: Record<CIType, TBMResourceTower> = {
    'server': 'compute',
    'virtual-machine': 'compute',
    'container': 'compute',
    'application': 'compute',
    'service': 'compute',
    'database': 'data',
    'network-device': 'network',
    'storage': 'storage',
    'load-balancer': 'network',
    'cloud-resource': 'compute',
  };
  return mapping[type];
}

function generateSubTower(type: CIType): string {
  const towers: Record<string, string[]> = {
    'compute': ['Physical Servers', 'Virtual Machines', 'Containers', 'Serverless'],
    'storage': ['Block Storage', 'Object Storage', 'File Storage', 'Backup Storage'],
    'network': ['Switches', 'Routers', 'Load Balancers', 'Firewalls'],
    'data': ['Relational Databases', 'NoSQL Databases', 'Data Warehouses', 'Caching'],
  };
  const tower = mapTypeToResourceTower(type);
  return randomChoice(towers[tower] || ['General']);
}

function generateBusinessServiceIds(count: number): string[] {
  return Array.from({ length: count }, () => `bs-${randomString(8)}`);
}

function generateApplicationServiceIds(count: number): string[] {
  return Array.from({ length: count }, () => `app-${randomString(8)}`);
}

function generateCapabilities(count: number): string[] {
  const capabilities = [
    'Order Processing',
    'Payment Processing',
    'Inventory Management',
    'Customer Management',
    'Reporting & Analytics',
    'User Authentication',
    'Email Notifications',
    'File Storage',
    'Search & Discovery',
    'Content Management',
  ];
  return Array.from({ length: count }, () => randomChoice(capabilities));
}

function generateValueStreams(count: number): string[] {
  const streams = ['Customer Acquisition', 'Order Fulfillment', 'Customer Support', 'Product Development'];
  return Array.from({ length: count }, () => randomChoice(streams));
}

function calculateServiceMetrics(
  criticality: BusinessCriticality,
  annual_revenue?: number,
  customer_count?: number,
  monthly_cost?: number
) {
  const tiers = {
    tier_0: {
      annual_revenue: annual_revenue || randomNumber(50_000_000, 500_000_000),
      customer_count: customer_count || randomNumber(1_000_000, 10_000_000),
      monthly_cost: monthly_cost || randomNumber(100_000, 500_000),
      impact_score: randomNumber(90, 100),
      risk_rating: 'critical' as const,
      sla_availability: 99.99,
      sla_response_time: 100,
      support_level: 'l4' as const,
      availability: '24x7' as const,
      max_incidents: 5,
      customer_facing: true,
      rto: 1,
      rpo: 15,
      dr_tier: 1 as const,
    },
    tier_1: {
      annual_revenue: annual_revenue || randomNumber(10_000_000, 50_000_000),
      customer_count: customer_count || randomNumber(250_000, 1_000_000),
      monthly_cost: monthly_cost || randomNumber(50_000, 100_000),
      impact_score: randomNumber(70, 89),
      risk_rating: 'high' as const,
      sla_availability: 99.9,
      sla_response_time: 200,
      support_level: 'l3' as const,
      availability: '24x7' as const,
      max_incidents: 10,
      customer_facing: true,
      rto: 4,
      rpo: 60,
      dr_tier: 2 as const,
    },
    tier_2: {
      annual_revenue: annual_revenue || randomNumber(1_000_000, 10_000_000),
      customer_count: customer_count || randomNumber(10_000, 250_000),
      monthly_cost: monthly_cost || randomNumber(10_000, 50_000),
      impact_score: randomNumber(50, 69),
      risk_rating: 'medium' as const,
      sla_availability: 99.5,
      sla_response_time: 500,
      support_level: 'l2' as const,
      availability: '24x5' as const,
      max_incidents: 20,
      customer_facing: randomBoolean(0.5),
      rto: 12,
      rpo: 240,
      dr_tier: 3 as const,
    },
    tier_3: {
      annual_revenue: annual_revenue || randomNumber(100_000, 1_000_000),
      customer_count: customer_count || randomNumber(1_000, 10_000),
      monthly_cost: monthly_cost || randomNumber(5_000, 10_000),
      impact_score: randomNumber(30, 49),
      risk_rating: 'medium' as const,
      sla_availability: 99.0,
      sla_response_time: 1000,
      support_level: 'l2' as const,
      availability: 'business_hours' as const,
      max_incidents: 30,
      customer_facing: randomBoolean(0.3),
      rto: 24,
      rpo: 480,
      dr_tier: 3 as const,
    },
    tier_4: {
      annual_revenue: annual_revenue || randomNumber(10_000, 100_000),
      customer_count: customer_count || randomNumber(100, 1_000),
      monthly_cost: monthly_cost || randomNumber(1_000, 5_000),
      impact_score: randomNumber(1, 29),
      risk_rating: 'low' as const,
      sla_availability: 95.0,
      sla_response_time: 2000,
      support_level: 'l1' as const,
      availability: 'business_hours' as const,
      max_incidents: 50,
      customer_facing: false,
      rto: 72,
      rpo: 1440,
      dr_tier: 4 as const,
    },
  };

  const metrics = tiers[criticality];

  return {
    ...metrics,
    cost_per_user: metrics.monthly_cost / metrics.customer_count,
    cost_per_transaction: metrics.monthly_cost / (metrics.customer_count * 30), // Assuming 1 transaction per user per day
    transaction_volume: metrics.customer_count * randomNumber(1, 10),
  };
}

// ============================================================================
// Seed Functions
// ============================================================================

/**
 * Generate a complete test dataset for different scenarios
 */
export interface SeedDatasetOptions {
  ciCount?: number;
  businessServiceCount?: number;
  incidentCount?: number;
  changeCount?: number;
  includeRelationships?: boolean;
}

export interface TestDataset {
  cis: TestCI[];
  businessServices: TestBusinessService[];
  incidents: TestIncident[];
  changes: TestChange[];
  costAllocations: TestCostAllocation[];
}

/**
 * Seed a complete test dataset
 */
export function seedTestDataset(options: SeedDatasetOptions = {}): TestDataset {
  const {
    ciCount = 100,
    businessServiceCount = 10,
    incidentCount = 20,
    changeCount = 15,
  } = options;

  // Generate CIs
  const cis = generateTestCIs({ count: ciCount });

  // Generate Business Services
  const businessServices = generateTestBusinessServices(businessServiceCount);

  // Generate Incidents (linked to random CIs)
  const incidents = Array.from({ length: incidentCount }, () =>
    generateTestIncident({ affected_ci_id: randomChoice(cis).id })
  );

  // Generate Changes (linked to random CIs)
  const changes = Array.from({ length: changeCount }, () =>
    generateTestChange({ affected_ci_ids: [randomChoice(cis).id, randomChoice(cis).id] })
  );

  // Generate Cost Allocations
  const costAllocations: TestCostAllocation[] = [];
  for (const service of businessServices) {
    const serviceCIs = randomChoice([3, 5, 7, 10]);
    for (let i = 0; i < serviceCIs; i++) {
      const ci = randomChoice(cis);
      costAllocations.push(
        generateTestCostAllocation({
          ci_id: ci.id,
          business_service_id: service.id,
          amount: ci.tbm_attributes?.monthly_cost || randomNumber(100, 10000),
        })
      );
    }
  }

  return {
    cis,
    businessServices,
    incidents,
    changes,
    costAllocations,
  };
}

/**
 * Export all test data as JSON
 */
export function exportTestDataAsJSON(dataset: TestDataset): string {
  return JSON.stringify(dataset, null, 2);
}
