/**
 * Mock Factories for Testing
 *
 * TDD London School approach: Mock factories provide consistent test data
 * and mock objects that define contracts between collaborators.
 *
 * These factories follow the Builder pattern for flexibility in tests.
 */

import { randomUUID } from 'crypto';

/**
 * CI (Configuration Item) Mock Factory
 */
export class CIMockFactory {
  private data: any = {
    id: randomUUID(),
    name: 'test-server',
    type: 'server',
    status: 'active',
    environment: 'production',
    discovered_by: 'aws',
    confidence_score: 0.95,
    attributes: {
      hostname: 'test-server-01',
      ip_address: '10.0.1.100',
      os: 'Linux',
    },
    metadata: {
      source: 'AWS EC2',
      region: 'us-east-1',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withType(type: string): this {
    this.data.type = type;
    return this;
  }

  withStatus(status: string): this {
    this.data.status = status;
    return this;
  }

  withEnvironment(environment: string): this {
    this.data.environment = environment;
    return this;
  }

  withDiscoveredBy(discoveredBy: string): this {
    this.data.discovered_by = discoveredBy;
    return this;
  }

  withConfidenceScore(score: number): this {
    this.data.confidence_score = score;
    return this;
  }

  withAttributes(attributes: Record<string, any>): this {
    this.data.attributes = { ...this.data.attributes, ...attributes };
    return this;
  }

  withMetadata(metadata: Record<string, any>): this {
    this.data.metadata = { ...this.data.metadata, ...metadata };
    return this;
  }

  build(): any {
    return { ...this.data };
  }
}

/**
 * Relationship Mock Factory
 */
export class RelationshipMockFactory {
  private data: any = {
    id: randomUUID(),
    from_ci_id: randomUUID(),
    to_ci_id: randomUUID(),
    type: 'DEPENDS_ON',
    attributes: {},
    discovered_by: 'aws',
    confidence_score: 0.90,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withFromCIId(fromCiId: string): this {
    this.data.from_ci_id = fromCiId;
    return this;
  }

  withToCIId(toCiId: string): this {
    this.data.to_ci_id = toCiId;
    return this;
  }

  withType(type: string): this {
    this.data.type = type;
    return this;
  }

  withAttributes(attributes: Record<string, any>): this {
    this.data.attributes = { ...this.data.attributes, ...attributes };
    return this;
  }

  withDiscoveredBy(discoveredBy: string): this {
    this.data.discovered_by = discoveredBy;
    return this;
  }

  withConfidenceScore(score: number): this {
    this.data.confidence_score = score;
    return this;
  }

  build(): any {
    return { ...this.data };
  }
}

/**
 * AWS EC2 Instance Mock Factory
 */
export class AWSInstanceMockFactory {
  private data: any = {
    InstanceId: 'i-1234567890abcdef0',
    InstanceType: 't3.medium',
    State: { Name: 'running' },
    PrivateIpAddress: '10.0.1.100',
    PublicIpAddress: '54.123.45.67',
    Tags: [
      { Key: 'Name', Value: 'test-server' },
      { Key: 'Environment', Value: 'production' },
    ],
    LaunchTime: new Date(),
    VpcId: 'vpc-12345',
    SubnetId: 'subnet-12345',
  };

  withInstanceId(instanceId: string): this {
    this.data.InstanceId = instanceId;
    return this;
  }

  withInstanceType(instanceType: string): this {
    this.data.InstanceType = instanceType;
    return this;
  }

  withState(state: string): this {
    this.data.State.Name = state;
    return this;
  }

  withPrivateIp(ip: string): this {
    this.data.PrivateIpAddress = ip;
    return this;
  }

  withPublicIp(ip: string): this {
    this.data.PublicIpAddress = ip;
    return this;
  }

  withTags(tags: Array<{ Key: string; Value: string }>): this {
    this.data.Tags = tags;
    return this;
  }

  build(): any {
    return { ...this.data };
  }
}

/**
 * Convenience functions for creating mocks
 */
export const createCI = (overrides?: Partial<any>) => {
  const factory = new CIMockFactory();
  const ci = factory.build();
  return { ...ci, ...overrides };
};

export const createRelationship = (overrides?: Partial<any>) => {
  const factory = new RelationshipMockFactory();
  const relationship = factory.build();
  return { ...relationship, ...overrides };
};

export const createAWSInstance = (overrides?: Partial<any>) => {
  const factory = new AWSInstanceMockFactory();
  const instance = factory.build();
  return { ...instance, ...overrides };
};

/**
 * Batch creation helpers
 */
export const createCIs = (count: number, overrides?: Partial<any>): any[] => {
  return Array.from({ length: count }, (_, i) =>
    createCI({ ...overrides, name: `${overrides?.name || 'test-ci'}-${i}` })
  );
};

export const createRelationships = (count: number, overrides?: Partial<any>): any[] => {
  return Array.from({ length: count }, () => createRelationship(overrides));
};
