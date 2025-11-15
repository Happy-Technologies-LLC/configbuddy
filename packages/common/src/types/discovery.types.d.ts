import { CIInput } from './ci.types';
export interface DiscoveryJob {
    id: string;
    provider: DiscoveryProvider;
    method: DiscoveryMethod;
    config: DiscoveryConfig;
    status: JobStatus;
    created_at: string;
    started_at?: string;
    completed_at?: string;
    error?: string;
}
export type DiscoveryProvider = 'nmap' | 'ssh' | 'active-directory' | 'snmp';
export type DiscoveryMethod = 'agentless' | 'agent';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';
export interface DiscoveryConfig {
    credentials?: any;
    regions?: string[];
    filters?: Record<string, any>;
    targets?: string[];
}
export interface DiscoveredCI extends CIInput {
    discovery_job_id: string;
    discovery_provider: DiscoveryProvider;
    confidence_score: number;
}
export interface DiscoveryDefinition {
    id: string;
    name: string;
    description?: string;
    provider: DiscoveryProvider;
    method: DiscoveryMethod;
    credential_id?: string;
    agent_id?: string;
    config: DiscoveryConfig;
    field_mappings?: Record<string, string>;
    schedule?: string;
    is_active: boolean;
    tags?: string[];
    created_by: string;
    created_at: string;
    updated_at: string;
    last_run_at?: string;
    last_run_status?: JobStatus;
    last_job_id?: string;
}
export interface DiscoveryDefinitionInput {
    name: string;
    description?: string;
    provider: DiscoveryProvider;
    method: DiscoveryMethod;
    credential_id?: string;
    agent_id?: string;
    config: DiscoveryConfig;
    field_mappings?: Record<string, string>;
    schedule?: string;
    is_active?: boolean;
    tags?: string[];
}
export interface DiscoveryAgent {
    id: string;
    agent_id: string;
    hostname: string;
    provider_capabilities: DiscoveryProvider[];
    reachable_networks: string[];
    version?: string;
    platform?: string;
    arch?: string;
    api_endpoint?: string;
    status: AgentStatus;
    last_heartbeat_at: string;
    last_job_at?: string;
    total_jobs_completed: number;
    total_jobs_failed: number;
    total_cis_discovered: number;
    tags?: string[];
    registered_at: string;
    updated_at: string;
}
export type AgentStatus = 'active' | 'inactive' | 'offline' | 'disabled';
export interface DiscoveryAgentRegistration {
    agent_id: string;
    hostname: string;
    provider_capabilities: DiscoveryProvider[];
    reachable_networks: string[];
    version?: string;
    platform?: string;
    arch?: string;
    api_endpoint?: string;
    tags?: string[];
}
export interface AgentHeartbeat {
    agent_id: string;
    status: AgentStatus;
    stats?: {
        jobs_completed?: number;
        jobs_failed?: number;
        cis_discovered?: number;
    };
}
//# sourceMappingURL=discovery.types.d.ts.map