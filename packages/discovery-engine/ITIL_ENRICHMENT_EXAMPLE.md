# ITIL Enrichment - Working Example

This document demonstrates the ITIL enrichment module in action with real-world examples.

## Example 1: AWS EC2 Instance Discovery

### Input (Discovered CI)

```javascript
{
  _id: 'ci-aws-ec2-i-1234567890abcdef0',
  name: 'web-server-prod-01',
  _type: 'server',
  status: 'active',
  environment: 'production',
  metadata: {
    instance_id: 'i-1234567890abcdef0',
    instance_type: 't3.medium',
    state: 'running',
    platform: 'Linux/UNIX',
    ami_id: 'ami-0c55b159cbfafe1f0',
    vpc_id: 'vpc-12345678',
    availability_zone: 'us-east-1a',
    tags: {
      Name: 'web-server-prod-01',
      Environment: 'production',
      Version: '2.1.4'
    }
  },
  last_discovered: new Date('2025-11-05T10:30:00Z')
}
```

### Output (After ITIL Enrichment)

```javascript
{
  _id: 'ci-aws-ec2-i-1234567890abcdef0',
  name: 'web-server-prod-01',
  _type: 'server',
  status: 'active',
  environment: 'production',
  metadata: { /* ... same as above ... */ },
  last_discovered: new Date('2025-11-05T10:30:00Z'),

  // ✅ ITIL attributes added by enricher
  itil_attributes: {
    ci_class: 'hardware',              // Inferred: server → hardware
    lifecycle_stage: 'operate',         // Detected: production + running → operate
    configuration_status: 'active',     // Determined: status='active' → active
    version: '2.1.4',                   // Extracted: metadata.tags.Version
    last_audited: new Date('2025-11-05T10:35:00Z'),
    audit_status: 'unknown'             // Default: will be updated by audit process
  }
}
```

### Enrichment Logic Breakdown

1. **CI Class** (`hardware`):
   - CI type is `server`
   - ITILClassifier rule: `server` → `hardware`

2. **Lifecycle Stage** (`operate`):
   - Environment is `production`
   - Metadata state is `running`
   - LifecycleDetector: production + running → `operate`

3. **Configuration Status** (`active`):
   - CI status is `active`
   - No special metadata indicators
   - Default for active CIs → `active`

4. **Version** (`2.1.4`):
   - Checked `metadata.version` → not found
   - Checked `metadata.tags.Version` → **found: `2.1.4`**

---

## Example 2: Kubernetes Pod Discovery

### Input (Discovered CI)

```javascript
{
  _id: 'ci-k8s-pod-payment-api-7d9f8b5c4d-x5m2p',
  name: 'payment-api-7d9f8b5c4d-x5m2p',
  _type: 'container',
  status: 'active',
  environment: 'staging',
  metadata: {
    namespace: 'payments',
    pod_name: 'payment-api-7d9f8b5c4d-x5m2p',
    phase: 'Running',
    container_image: 'mycompany/payment-api:3.5.2',
    labels: {
      app: 'payment-api',
      version: '3.5.2',
      environment: 'staging'
    },
    owner_references: [
      { kind: 'ReplicaSet', name: 'payment-api-7d9f8b5c4d' }
    ]
  },
  last_discovered: new Date('2025-11-05T10:30:00Z')
}
```

### Output (After ITIL Enrichment)

```javascript
{
  _id: 'ci-k8s-pod-payment-api-7d9f8b5c4d-x5m2p',
  name: 'payment-api-7d9f8b5c4d-x5m2p',
  _type: 'container',
  status: 'active',
  environment: 'staging',
  metadata: { /* ... same as above ... */ },
  last_discovered: new Date('2025-11-05T10:30:00Z'),

  // ✅ ITIL attributes added by enricher
  itil_attributes: {
    ci_class: 'software',               // Inferred: container → software
    lifecycle_stage: 'test',            // Detected: staging + Running → test
    configuration_status: 'active',     // Determined: active status → active
    version: '3.5.2',                   // Extracted: metadata.labels.version
    last_audited: new Date('2025-11-05T10:35:00Z'),
    audit_status: 'unknown'
  }
}
```

### Enrichment Logic Breakdown

1. **CI Class** (`software`):
   - CI type is `container`
   - ITILClassifier rule: `container` → `software`

2. **Lifecycle Stage** (`test`):
   - Environment is `staging`
   - Metadata phase is `Running`
   - LifecycleDetector: staging + running → `test`

3. **Version** (`3.5.2`):
   - Checked `metadata.version` → not found
   - Checked `metadata.labels.version` → **found: `3.5.2`**

---

## Example 3: Azure VM Being Provisioned

### Input (Discovered CI)

```javascript
{
  _id: 'ci-azure-vm-database-primary-001',
  name: 'database-primary-001',
  _type: 'virtual-machine',
  status: 'active',
  environment: 'production',
  metadata: {
    vm_id: '/subscriptions/.../virtualMachines/database-primary-001',
    provisioning_state: 'creating',
    vm_size: 'Standard_D4s_v3',
    os_type: 'Linux',
    image_version: 'Ubuntu 22.04 LTS',
    location: 'eastus',
    resource_group: 'production-databases'
  },
  last_discovered: new Date('2025-11-05T10:30:00Z')
}
```

### Output (After ITIL Enrichment)

```javascript
{
  _id: 'ci-azure-vm-database-primary-001',
  name: 'database-primary-001',
  _type: 'virtual-machine',
  status: 'active',
  environment: 'production',
  metadata: { /* ... same as above ... */ },
  last_discovered: new Date('2025-11-05T10:30:00Z'),

  // ✅ ITIL attributes added by enricher
  itil_attributes: {
    ci_class: 'software',               // Inferred: virtual-machine → software
    lifecycle_stage: 'build',           // Detected: provisioning_state='creating' → build
    configuration_status: 'in_development', // Determined: creating → in_development
    version: 'Ubuntu 22.04 LTS',        // Extracted: metadata.image_version
    last_audited: new Date('2025-11-05T10:35:00Z'),
    audit_status: 'unknown'
  }
}
```

### Enrichment Logic Breakdown

1. **CI Class** (`software`):
   - CI type is `virtual-machine`
   - ITILClassifier rule: `virtual-machine` → `software`

2. **Lifecycle Stage** (`build`):
   - Metadata `provisioning_state` is `creating`
   - LifecycleDetector: creating state → `build`

3. **Configuration Status** (`in_development`):
   - Metadata `provisioning_state` is `creating`
   - Creating state → `in_development`

4. **Version** (`Ubuntu 22.04 LTS`):
   - Checked `metadata.version` → not found
   - Checked `metadata.image_version` → **found: `Ubuntu 22.04 LTS`**

---

## Example 4: Decommissioned Server

### Input (Discovered CI)

```javascript
{
  _id: 'ci-old-server-web-legacy-05',
  name: 'web-legacy-05',
  _type: 'server',
  status: 'decommissioned',
  environment: 'production',
  metadata: {
    hostname: 'web-legacy-05.example.com',
    last_seen: '2025-08-01T00:00:00Z',
    decommission_date: '2025-09-15',
    decommission_reason: 'End of life - replaced by cloud instances'
  },
  last_discovered: new Date('2025-08-01T00:00:00Z') // 96 days ago
}
```

### Output (After ITIL Enrichment)

```javascript
{
  _id: 'ci-old-server-web-legacy-05',
  name: 'web-legacy-05',
  _type: 'server',
  status: 'decommissioned',
  environment: 'production',
  metadata: { /* ... same as above ... */ },
  last_discovered: new Date('2025-08-01T00:00:00Z'),

  // ✅ ITIL attributes added by enricher
  itil_attributes: {
    ci_class: 'hardware',               // Inferred: server → hardware
    lifecycle_stage: 'retire',          // Detected: status='decommissioned' → retire
    configuration_status: 'retired',    // Determined: decommissioned → retired
    version: '1.0.0',                   // Default: no version found
    last_audited: new Date('2025-11-05T10:35:00Z'),
    audit_status: 'unknown'
  }
}
```

### Enrichment Logic Breakdown

1. **Lifecycle Stage** (`retire`):
   - CI status is `decommissioned`
   - LifecycleDetector: decommissioned → `retire`
   - **Also**: Last discovered 96 days ago (>90 days) → would also trigger `retire`

2. **Configuration Status** (`retired`):
   - CI status is `decommissioned`
   - Decommissioned status → `retired`

---

## Example 5: Development Environment Application

### Input (Discovered CI)

```javascript
{
  _id: 'ci-app-feature-branch-payment-v2',
  name: 'payment-api-feature-stripe-integration',
  _type: 'application',
  status: 'active',
  environment: 'development',
  metadata: {
    git_branch: 'feature/stripe-integration',
    git_commit: 'a1b2c3d4e5f6',
    state: 'running',
    developer: 'jane.doe@example.com',
    feature_flag: 'stripe_v2_enabled',
    app_version: '4.0.0-beta.3'
  },
  last_discovered: new Date('2025-11-05T10:30:00Z')
}
```

### Output (After ITIL Enrichment)

```javascript
{
  _id: 'ci-app-feature-branch-payment-v2',
  name: 'payment-api-feature-stripe-integration',
  _type: 'application',
  status: 'active',
  environment: 'development',
  metadata: { /* ... same as above ... */ },
  last_discovered: new Date('2025-11-05T10:30:00Z'),

  // ✅ ITIL attributes added by enricher
  itil_attributes: {
    ci_class: 'software',               // Inferred: application → software
    lifecycle_stage: 'build',           // Detected: development + running → build
    configuration_status: 'active',     // Determined: active status → active
    version: '4.0.0-beta.3',            // Extracted: metadata.app_version
    last_audited: new Date('2025-11-05T10:35:00Z'),
    audit_status: 'unknown'
  }
}
```

### Enrichment Logic Breakdown

1. **CI Class** (`software`):
   - CI type is `application`
   - ITILClassifier rule: `application` → `software`

2. **Lifecycle Stage** (`build`):
   - Environment is `development`
   - Metadata state is `running`
   - LifecycleDetector: development + running → `build` (active development)

3. **Version** (`4.0.0-beta.3`):
   - Checked `metadata.version` → not found
   - Checked `metadata.app_version` → **found: `4.0.0-beta.3`**

---

## Summary of Enrichment Rules

### CI Class Inference

| CI Type | ITIL Class |
|---------|-----------|
| server, storage, network-device, load-balancer | hardware |
| virtual-machine, container, application, database, software | software |
| service | service |
| cloud-resource | network |
| facility | facility |
| documentation | documentation |

### Lifecycle Stage Detection

| Condition | Lifecycle Stage |
|-----------|----------------|
| provisioning_state = 'creating' or 'pending' | build |
| provisioning_state = 'updating' or 'deploying' | deploy |
| environment = 'test' or 'staging' (running) | test |
| environment = 'development' (running) | build |
| environment = 'development' (not running) | design |
| status = 'inactive' or 'decommissioned' | retire |
| state = 'terminated' or 'deleted' | retire |
| last_discovered > 90 days ago | retire |
| **Default** | operate |

### Configuration Status

| Condition | Configuration Status |
|-----------|---------------------|
| status = 'inactive' or 'decommissioned' | retired |
| status = 'maintenance' | maintenance |
| provisioning_state = 'creating' | in_development |
| order_status = 'ordered' | ordered |
| lifecycle = 'planning' | planned |
| state = 'disposed' or 'deleted' | disposed |
| **Default** | active |

### Version Extraction Priority

1. metadata.version
2. metadata.release_version
3. metadata.image_version
4. metadata.os_version
5. metadata.software_version
6. metadata.app_version
7. metadata.tags.Version (AWS)
8. metadata.labels.version (Kubernetes)
9. Docker image tag (e.g., `nginx:1.21.6`)
10. **Default**: `1.0.0`

---

## Integration with ITIL Service Manager

After enrichment, the ITIL service manager (Agent 5's implementation) can leverage these attributes for:

- **Incident Priority Calculation**: Using CI class and lifecycle stage
- **Change Risk Assessment**: Based on configuration status and environment
- **Baseline Management**: Tracking version changes over time
- **Audit Reporting**: Using audit metadata for compliance

Example workflow:
```typescript
// 1. Discovery enriches CI with ITIL attributes
const enrichedCI = await itilEnricher.enrichWithITIL([discoveredCI]);

// 2. ITIL service manager uses enriched attributes
const incident = await itilServiceManager.createIncident({
  affected_ci: enrichedCI[0],
  // Priority auto-calculated based on itil_attributes.ci_class
  // and business criticality
});

// 3. Change management assesses risk
const changeRisk = await itilServiceManager.assessChangeRisk({
  target_ci: enrichedCI[0],
  // Risk score considers itil_attributes.lifecycle_stage
  // and configuration_status
});
```
