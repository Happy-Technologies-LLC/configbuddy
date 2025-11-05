-- Comprehensive Discovery Definitions Seed Data
-- Creates discovery definitions for all 13 available discovery workers
-- Run this after database migrations are complete

-- First, update provider check constraint to include all providers
ALTER TABLE discovery_definitions DROP CONSTRAINT IF EXISTS discovery_definitions_provider_check;
ALTER TABLE discovery_definitions ADD CONSTRAINT discovery_definitions_provider_check
  CHECK (provider IN (
    'aws', 'azure', 'gcp', 'kubernetes', 'ssh', 'nmap', 'docker',
    'hyperv', 'idrac', 'ilo', 'proxmox', 'vmware', 'activedirectory'
  ));

-- 1. AWS Discovery (already exists - update if needed)
INSERT INTO discovery_definitions (
  id,
  name,
  description,
  provider,
  method,
  config,
  schedule,
  is_active,
  tags,
  created_by
) VALUES (
  gen_random_uuid(),
  'AWS Multi-Region Discovery',
  'Discovers EC2 instances, RDS databases, S3 buckets, ECS services, and Lambda functions across all AWS regions',
  'aws',
  'agentless',
  '{"regions": ["us-east-1", "us-west-2", "eu-west-1"], "resources": ["ec2", "rds", "s3", "ecs", "lambda"]}'::jsonb,
  '0 */6 * * *',  -- Every 6 hours
  true,
  ARRAY['cloud', 'aws', 'compute', 'database', 'storage'],
  'system'
) ON CONFLICT DO NOTHING;

-- 2. Azure Discovery
INSERT INTO discovery_definitions (
  id,
  name,
  description,
  provider,
  method,
  config,
  schedule,
  is_active,
  tags,
  created_by
) VALUES (
  gen_random_uuid(),
  'Azure Subscription Discovery',
  'Discovers Azure VMs, SQL databases, storage accounts, App Services, and AKS clusters',
  'azure',
  'agentless',
  '{"subscription_id": "REPLACE_WITH_SUBSCRIPTION_ID", "resources": ["virtual_machines", "sql", "storage", "app_services", "aks"]}'::jsonb,
  '0 */6 * * *',  -- Every 6 hours
  false,  -- Disabled by default (needs credential)
  ARRAY['cloud', 'azure', 'compute', 'database'],
  'system'
);

-- 3. GCP Discovery (already exists - update if needed)
INSERT INTO discovery_definitions (
  id,
  name,
  description,
  provider,
  method,
  config,
  schedule,
  is_active,
  tags,
  created_by
) VALUES (
  gen_random_uuid(),
  'GCP Project Discovery',
  'Discovers GCP Compute Engine instances, Cloud SQL, and Cloud Storage',
  'gcp',
  'agentless',
  '{"project_id": "REPLACE_WITH_PROJECT_ID", "resources": ["compute", "sql", "storage"]}'::jsonb,
  '0 */6 * * *',  -- Every 6 hours
  false,  -- Disabled by default (needs credential)
  ARRAY['cloud', 'gcp', 'compute'],
  'system'
) ON CONFLICT DO NOTHING;

-- 4. Kubernetes Discovery
INSERT INTO discovery_definitions (
  id,
  name,
  description,
  provider,
  method,
  config,
  schedule,
  is_active,
  tags,
  created_by
) VALUES (
  gen_random_uuid(),
  'Kubernetes Cluster Discovery',
  'Discovers nodes, pods, services, and deployments from Kubernetes clusters',
  'kubernetes',
  'agentless',
  '{"context": "production", "include_system_namespaces": false, "resources": ["nodes", "pods", "services", "deployments"]}'::jsonb,
  '0 */2 * * *',  -- Every 2 hours
  false,  -- Disabled by default (needs kubeconfig)
  ARRAY['kubernetes', 'containers', 'orchestration'],
  'system'
);

-- 5. SSH Discovery (already exists - update if needed)
INSERT INTO discovery_definitions (
  id,
  name,
  description,
  provider,
  method,
  config,
  schedule,
  is_active,
  tags,
  created_by
) VALUES (
  gen_random_uuid(),
  'SSH Server Discovery',
  'Discovers Linux/Unix servers via SSH for system information, packages, and services',
  'ssh',
  'agentless',
  '{"targets": ["192.168.1.0/24"], "port": 22, "timeout": 30}'::jsonb,
  '0 */12 * * *',  -- Every 12 hours
  false,  -- Disabled by default (needs credentials)
  ARRAY['ssh', 'linux', 'unix', 'servers'],
  'system'
) ON CONFLICT DO NOTHING;

-- 6. Nmap Discovery (already exists - update if needed)
INSERT INTO discovery_definitions (
  id,
  name,
  description,
  provider,
  method,
  config,
  schedule,
  is_active,
  tags,
  created_by
) VALUES (
  gen_random_uuid(),
  'Network Scan (Nmap)',
  'Performs network discovery using Nmap to identify hosts and open ports',
  'nmap',
  'agentless',
  '{"targets": ["10.0.0.0/24"], "ports": "22,80,443,3389", "scan_type": "SYN"}'::jsonb,
  '0 0 * * *',  -- Daily at midnight
  false,  -- Disabled by default
  ARRAY['network', 'scanning', 'nmap'],
  'system'
) ON CONFLICT DO NOTHING;

-- 7. Docker Discovery
INSERT INTO discovery_definitions (
  id,
  name,
  description,
  provider,
  method,
  config,
  schedule,
  is_active,
  tags,
  created_by
) VALUES (
  gen_random_uuid(),
  'Docker Host Discovery',
  'Discovers containers, images, volumes, networks, and host information from Docker',
  'docker',
  'agentless',
  '{"host": "unix:///var/run/docker.sock", "include_stopped_containers": true, "resources": ["containers", "images", "volumes", "networks", "host"]}'::jsonb,
  '0 */1 * * *',  -- Every hour
  false,  -- Disabled by default
  ARRAY['docker', 'containers', 'virtualization'],
  'system'
);

-- 8. Hyper-V Discovery
INSERT INTO discovery_definitions (
  id,
  name,
  description,
  provider,
  method,
  config,
  schedule,
  is_active,
  tags,
  created_by
) VALUES (
  gen_random_uuid(),
  'Hyper-V Infrastructure Discovery',
  'Discovers virtual machines, hosts, virtual switches, and VHD files from Microsoft Hyper-V',
  'hyperv',
  'agentless',
  '{"host": "hyperv-host.example.com", "port": 5985, "transport": "http", "resources": ["virtual_machines", "hosts", "virtual_switches", "vhd_files"]}'::jsonb,
  '0 */4 * * *',  -- Every 4 hours
  false,  -- Disabled by default (needs WinRM credentials)
  ARRAY['hyperv', 'microsoft', 'virtualization', 'windows'],
  'system'
);

-- 9. Dell iDRAC Discovery
INSERT INTO discovery_definitions (
  id,
  name,
  description,
  provider,
  method,
  config,
  schedule,
  is_active,
  tags,
  created_by
) VALUES (
  gen_random_uuid(),
  'Dell Server Hardware Discovery',
  'Discovers Dell physical servers and hardware components via iDRAC (Redfish API)',
  'idrac',
  'agentless',
  '{"hosts": ["idrac1.example.com", "idrac2.example.com"], "verify_ssl": false, "resources": ["servers", "components", "network_devices"]}'::jsonb,
  '0 */12 * * *',  -- Every 12 hours
  false,  -- Disabled by default (needs iDRAC credentials)
  ARRAY['dell', 'idrac', 'hardware', 'servers', 'redfish'],
  'system'
);

-- 10. HPE iLO Discovery
INSERT INTO discovery_definitions (
  id,
  name,
  description,
  provider,
  method,
  config,
  schedule,
  is_active,
  tags,
  created_by
) VALUES (
  gen_random_uuid(),
  'HPE Server Hardware Discovery',
  'Discovers HPE physical servers and hardware components via iLO (Redfish API)',
  'ilo',
  'agentless',
  '{"hosts": ["ilo1.example.com", "ilo2.example.com"], "verify_ssl": false, "resources": ["servers", "components", "network_devices"]}'::jsonb,
  '0 */12 * * *',  -- Every 12 hours
  false,  -- Disabled by default (needs iLO credentials)
  ARRAY['hpe', 'ilo', 'hardware', 'servers', 'redfish'],
  'system'
);

-- 11. Proxmox VE Discovery
INSERT INTO discovery_definitions (
  id,
  name,
  description,
  provider,
  method,
  config,
  schedule,
  is_active,
  tags,
  created_by
) VALUES (
  gen_random_uuid(),
  'Proxmox VE Infrastructure Discovery',
  'Discovers VMs, LXC containers, nodes, storage, and networks from Proxmox Virtual Environment',
  'proxmox',
  'agentless',
  '{"api_url": "https://proxmox.example.com:8006", "verify_ssl": false, "resources": ["virtual_machines", "containers", "nodes", "storage", "networks"]}'::jsonb,
  '0 */4 * * *',  -- Every 4 hours
  false,  -- Disabled by default (needs Proxmox credentials)
  ARRAY['proxmox', 'virtualization', 'containers', 'open-source'],
  'system'
);

-- 12. VMware vSphere Discovery
INSERT INTO discovery_definitions (
  id,
  name,
  description,
  provider,
  method,
  config,
  schedule,
  is_active,
  tags,
  created_by
) VALUES (
  gen_random_uuid(),
  'VMware vSphere Discovery',
  'Discovers VMs, ESXi hosts, datastores, and networks from VMware vSphere/vCenter',
  'vmware',
  'agentless',
  '{"vcenter_host": "vcenter.example.com", "port": 443, "verify_ssl": false, "resources": ["virtual_machines", "hosts", "datastores", "networks", "clusters"]}'::jsonb,
  '0 */4 * * *',  -- Every 4 hours
  false,  -- Disabled by default (needs vCenter credentials)
  ARRAY['vmware', 'vsphere', 'vcenter', 'virtualization'],
  'system'
);

-- 13. Active Directory Discovery
INSERT INTO discovery_definitions (
  id,
  name,
  description,
  provider,
  method,
  config,
  schedule,
  is_active,
  tags,
  created_by
) VALUES (
  gen_random_uuid(),
  'Active Directory Discovery',
  'Discovers users, groups, computers, and organizational units from Active Directory via LDAP',
  'activedirectory',
  'agentless',
  '{"ldap_url": "ldap://dc.example.com:389", "base_dn": "DC=example,DC=com", "search_scope": "SUBTREE", "resources": ["users", "groups", "computers", "organizational_units"]}'::jsonb,
  '0 */6 * * *',  -- Every 6 hours
  false,  -- Disabled by default (needs AD credentials)
  ARRAY['activedirectory', 'ldap', 'microsoft', 'identity', 'windows'],
  'system'
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_discovery_definitions_tags ON discovery_definitions USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_discovery_definitions_provider_active ON discovery_definitions(provider, is_active);
CREATE INDEX IF NOT EXISTS idx_discovery_definitions_method ON discovery_definitions(method);

-- Display summary
DO $$
DECLARE
  total_count INTEGER;
  active_count INTEGER;
  provider_counts TEXT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM discovery_definitions;
  SELECT COUNT(*) INTO active_count FROM discovery_definitions WHERE is_active = true;

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Discovery Definitions Seed Complete';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Total discovery definitions: %', total_count;
  RAISE NOTICE 'Active definitions: %', active_count;
  RAISE NOTICE 'Inactive definitions: %', (total_count - active_count);
  RAISE NOTICE '';
  RAISE NOTICE 'Providers configured:';
  RAISE NOTICE '  - AWS (agentless)';
  RAISE NOTICE '  - Azure (agentless)';
  RAISE NOTICE '  - GCP (agentless)';
  RAISE NOTICE '  - Kubernetes (agentless)';
  RAISE NOTICE '  - SSH (agentless)';
  RAISE NOTICE '  - Nmap (agentless)';
  RAISE NOTICE '  - Docker (agentless)';
  RAISE NOTICE '  - Hyper-V (agentless)';
  RAISE NOTICE '  - Dell iDRAC (agentless)';
  RAISE NOTICE '  - HPE iLO (agentless)';
  RAISE NOTICE '  - Proxmox VE (agentless)';
  RAISE NOTICE '  - VMware vSphere (agentless)';
  RAISE NOTICE '  - Active Directory (agentless)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Create credentials for each provider';
  RAISE NOTICE '  2. Update discovery definition configs with your environment details';
  RAISE NOTICE '  3. Link credentials to discovery definitions';
  RAISE NOTICE '  4. Enable discovery definitions (set is_active = true)';
  RAISE NOTICE '===========================================';
END $$;
