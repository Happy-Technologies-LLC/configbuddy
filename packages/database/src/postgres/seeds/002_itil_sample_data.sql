-- ==========================================
-- ITIL Sample Data Seed Script
-- ==========================================
-- Created: 2025-11-15
-- Purpose: Populate ITIL tables with realistic sample data for v3.0 dashboards
-- Tables: itil_incidents, itil_changes, itil_baselines
--
-- This script creates:
-- - 15 incidents (various statuses and priorities)
-- - 8 changes (standard, normal, emergency)
-- - 3 configuration baselines
-- ==========================================

BEGIN;

-- ==========================================
-- ITIL Incidents
-- ==========================================

-- Critical Incident #1: Database outage (RESOLVED)
INSERT INTO itil_incidents (
    incident_number, title, description,
    category, subcategory, impact, urgency, priority,
    affected_ci_id, status,
    assigned_to, assigned_group,
    reported_by, reported_at,
    acknowledged_at, resolved_at,
    resolution, resolution_code,
    time_to_acknowledge_minutes, time_to_resolve_minutes,
    business_impact
) VALUES (
    'INC-20251115-0001',
    'Production Database Connection Pool Exhausted',
    'Users unable to access e-commerce application. Database connection pool showing 100% utilization. High volume of slow queries detected.',
    'Database', 'Performance',
    'critical', 'critical', 1,
    'ci_prod_db_postgres_01', 'resolved',
    'john.doe@company.com', 'Database Team',
    'monitoring@company.com', NOW() - INTERVAL '6 hours',
    NOW() - INTERVAL '5 hours 58 minutes', NOW() - INTERVAL '4 hours 15 minutes',
    'Identified and killed long-running queries. Increased connection pool size from 100 to 200. Implemented query timeout of 30 seconds.',
    'CONFIGURATION_CHANGE',
    2, 105,
    '{
        "estimated_user_impact": 50000,
        "estimated_revenue_impact": 125000,
        "estimated_cost_of_downtime": 15000,
        "affected_services": ["E-Commerce Platform", "Customer Portal"]
    }'::jsonb
);

-- Critical Incident #2: API Gateway down (RESOLVED)
INSERT INTO itil_incidents (
    incident_number, title, description,
    category, subcategory, impact, urgency, priority,
    affected_ci_id, status,
    assigned_to, assigned_group,
    reported_by, reported_at,
    acknowledged_at, resolved_at,
    resolution, resolution_code,
    time_to_acknowledge_minutes, time_to_resolve_minutes,
    business_impact
) VALUES (
    'INC-20251115-0002',
    'API Gateway Returning 503 Errors',
    'All API requests failing with HTTP 503 Service Unavailable. Health check endpoint not responding.',
    'Network', 'Connectivity',
    'critical', 'critical', 1,
    'ci_api_gateway_prod_01', 'resolved',
    'jane.smith@company.com', 'Infrastructure Team',
    'monitoring@company.com', NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days' + INTERVAL '1 minute', NOW() - INTERVAL '3 days' + INTERVAL '45 minutes',
    'Gateway process had crashed due to memory leak. Restarted service and deployed hotfix v2.3.1.',
    'SOFTWARE_RESTART',
    1, 45,
    '{
        "estimated_user_impact": 100000,
        "estimated_revenue_impact": 250000,
        "estimated_cost_of_downtime": 30000,
        "affected_services": ["Mobile App", "Web Application", "Third-Party Integrations"]
    }'::jsonb
);

-- High Priority Incident #3: Payment processing slow (IN_PROGRESS)
INSERT INTO itil_incidents (
    incident_number, title, description,
    category, subcategory, impact, urgency, priority,
    affected_ci_id, status,
    assigned_to, assigned_group,
    reported_by, reported_at,
    acknowledged_at,
    time_to_acknowledge_minutes,
    business_impact
) VALUES (
    'INC-20251115-0003',
    'Payment Processing Experiencing High Latency',
    'Payment transactions taking 10-15 seconds instead of usual 2-3 seconds. Customer complaints increasing.',
    'Application', 'Performance',
    'high', 'high', 2,
    'ci_payment_service_prod', 'in_progress',
    'alex.johnson@company.com', 'Application Team',
    'support@company.com', NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour 55 minutes',
    5,
    '{
        "estimated_user_impact": 5000,
        "estimated_revenue_impact": 50000,
        "estimated_cost_of_downtime": 5000,
        "affected_services": ["Payment Processing", "E-Commerce Checkout"]
    }'::jsonb
);

-- High Priority Incident #4: SSL certificate expiring soon (ASSIGNED)
INSERT INTO itil_incidents (
    incident_number, title, description,
    category, subcategory, impact, urgency, priority,
    affected_ci_id, status,
    assigned_to, assigned_group,
    reported_by, reported_at,
    acknowledged_at,
    time_to_acknowledge_minutes,
    business_impact
) VALUES (
    'INC-20251115-0004',
    'SSL Certificate for api.company.com Expires in 7 Days',
    'SSL certificate monitoring detected upcoming expiration. Certificate expires on 2025-11-22.',
    'Security', 'Certificates',
    'high', 'medium', 2,
    'ci_lb_prod_01', 'assigned',
    'sarah.williams@company.com', 'Security Team',
    'monitoring@company.com', NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day' + INTERVAL '15 minutes',
    15,
    '{
        "estimated_user_impact": 100000,
        "estimated_revenue_impact": 500000,
        "estimated_cost_of_downtime": 0,
        "affected_services": ["All API Services"]
    }'::jsonb
);

-- Medium Priority Incident #5: Disk space warning (NEW)
INSERT INTO itil_incidents (
    incident_number, title, description,
    category, subcategory, impact, urgency, priority,
    affected_ci_id, status,
    assigned_group,
    reported_by, reported_at,
    business_impact
) VALUES (
    'INC-20251115-0005',
    'Disk Usage at 85% on Log Server',
    'Log aggregation server /var/log partition at 85% capacity. Expected to reach critical threshold in 48 hours.',
    'Storage', 'Capacity',
    'medium', 'medium', 3,
    'ci_log_server_01', 'new',
    'Infrastructure Team',
    'monitoring@company.com', NOW() - INTERVAL '3 hours',
    '{
        "estimated_user_impact": 0,
        "estimated_revenue_impact": 0,
        "estimated_cost_of_downtime": 0,
        "affected_services": ["Logging Infrastructure"]
    }'::jsonb
);

-- Medium Priority Incident #6: Email delivery delays (IN_PROGRESS)
INSERT INTO itil_incidents (
    incident_number, title, description,
    category, subcategory, impact, urgency, priority,
    affected_ci_id, status,
    assigned_to, assigned_group,
    reported_by, reported_at,
    acknowledged_at,
    time_to_acknowledge_minutes,
    business_impact
) VALUES (
    'INC-20251115-0006',
    'Email Notifications Delayed by 15-20 Minutes',
    'Transaction confirmation emails experiencing significant delays. Email queue showing backlog of 5000+ messages.',
    'Application', 'Email',
    'medium', 'medium', 3,
    'ci_email_service_prod', 'in_progress',
    'mike.brown@company.com', 'Platform Team',
    'customer.service@company.com', NOW() - INTERVAL '5 hours',
    NOW() - INTERVAL '4 hours 50 minutes',
    10,
    '{
        "estimated_user_impact": 10000,
        "estimated_revenue_impact": 5000,
        "estimated_cost_of_downtime": 1000,
        "affected_services": ["Email Notifications", "Customer Communications"]
    }'::jsonb
);

-- Low Priority Incident #7: Dashboard widget not loading (ASSIGNED)
INSERT INTO itil_incidents (
    incident_number, title, description,
    category, subcategory, impact, urgency, priority,
    affected_ci_id, status,
    assigned_to, assigned_group,
    reported_by, reported_at,
    acknowledged_at,
    time_to_acknowledge_minutes,
    business_impact
) VALUES (
    'INC-20251115-0007',
    'Analytics Dashboard Widget Failing to Load',
    'Sales analytics widget on executive dashboard returns error. Other widgets functioning normally.',
    'Application', 'User Interface',
    'low', 'low', 4,
    'ci_web_app_prod', 'assigned',
    'lisa.chen@company.com', 'Frontend Team',
    'executive.team@company.com', NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days' + INTERVAL '30 minutes',
    30,
    '{
        "estimated_user_impact": 50,
        "estimated_revenue_impact": 0,
        "estimated_cost_of_downtime": 0,
        "affected_services": ["Analytics Dashboard"]
    }'::jsonb
);

-- Low Priority Incident #8: Cosmetic UI issue (NEW)
INSERT INTO itil_incidents (
    incident_number, title, description,
    category, subcategory, impact, urgency, priority,
    affected_ci_id, status,
    assigned_group,
    reported_by, reported_at,
    business_impact
) VALUES (
    'INC-20251115-0008',
    'Button Alignment Issue on Mobile App Settings Page',
    'Save button on settings page is misaligned on iOS devices. Functionality not affected.',
    'Application', 'User Interface',
    'low', 'low', 5,
    'ci_mobile_app_ios', 'new',
    'Mobile Team',
    'qa.team@company.com', NOW() - INTERVAL '1 day',
    '{
        "estimated_user_impact": 0,
        "estimated_revenue_impact": 0,
        "estimated_cost_of_downtime": 0,
        "affected_services": ["Mobile App"]
    }'::jsonb
);

-- Additional incidents for volume
INSERT INTO itil_incidents (incident_number, title, category, impact, urgency, priority, affected_ci_id, status, reported_by, reported_at) VALUES
('INC-20251114-0009', 'Redis Cache Hit Rate Below Threshold', 'Performance', 'medium', 'low', 3, 'ci_redis_prod', 'resolved', 'monitoring@company.com', NOW() - INTERVAL '5 days'),
('INC-20251114-0010', 'Backup Job Failed on Archive Server', 'Storage', 'medium', 'medium', 3, 'ci_backup_server', 'resolved', 'monitoring@company.com', NOW() - INTERVAL '4 days'),
('INC-20251113-0011', 'Load Balancer Health Check Intermittent Failures', 'Network', 'medium', 'high', 2, 'ci_lb_prod_02', 'closed', 'monitoring@company.com', NOW() - INTERVAL '7 days'),
('INC-20251113-0012', 'VPN Connection Drops for Remote Users', 'Network', 'high', 'high', 2, 'ci_vpn_gateway', 'in_progress', 'helpdesk@company.com', NOW() - INTERVAL '1 day'),
('INC-20251112-0013', 'CDN Cache Invalidation Not Working', 'Network', 'medium', 'medium', 3, 'ci_cdn_prod', 'assigned', 'devops@company.com', NOW() - INTERVAL '6 hours'),
('INC-20251112-0014', 'Monitoring Alert Storm - False Positives', 'Monitoring', 'low', 'low', 4, 'ci_monitoring_server', 'new', 'monitoring@company.com', NOW() - INTERVAL '2 hours'),
('INC-20251111-0015', 'Container Registry Slow Image Pulls', 'Infrastructure', 'medium', 'medium', 3, 'ci_container_registry', 'in_progress', 'devops@company.com', NOW() - INTERVAL '12 hours');

-- ==========================================
-- ITIL Changes
-- ==========================================

-- Standard Change #1: Security patch deployment (COMPLETED)
INSERT INTO itil_changes (
    change_number, title, description,
    change_type, category,
    risk_assessment, business_impact, financial_impact,
    affected_ci_ids,
    implementation_plan, backout_plan, test_plan,
    approval_status, approved_by, approved_at,
    status, outcome,
    assigned_to, assigned_group,
    requested_by,
    scheduled_start, scheduled_end,
    actual_start, actual_end,
    closure_notes
) VALUES (
    'CHG-20251110-0001',
    'Deploy November 2025 Security Patches to Production Servers',
    'Monthly security patch deployment covering CVE-2025-12345, CVE-2025-12346, CVE-2025-12347. Pre-approved standard change.',
    'standard', 'Security',
    '{
        "overall_risk_score": 2.5,
        "risk_level": "low",
        "requires_cab_approval": false
    }'::jsonb,
    '{
        "critical_services_affected": [],
        "estimated_downtime_minutes": 30,
        "customer_impact": false,
        "revenue_at_risk": 0
    }'::jsonb,
    '{
        "implementation_cost": 5000,
        "downtime_cost": 0,
        "total_cost": 5000
    }'::jsonb,
    ARRAY['ci_web_server_01', 'ci_web_server_02', 'ci_web_server_03', 'ci_api_server_01', 'ci_api_server_02'],
    'Execute automated patch deployment via Ansible playbook. Rolling restart across server pool. 5-minute intervals between servers.',
    'Rollback patches using system snapshots taken pre-deployment. Estimated rollback time: 15 minutes per server.',
    'Patches tested in staging environment for 72 hours. Load testing completed successfully. No performance degradation observed.',
    'approved', 'security.lead@company.com', NOW() - INTERVAL '10 days',
    'closed', 'SUCCESS',
    'devops.team@company.com', 'DevOps Team',
    'security.team@company.com',
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '2 hours',
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '1 hour 45 minutes',
    'All patches deployed successfully. No incidents reported. Servers stable for 7 days post-deployment.'
);

-- Normal Change #2: Database schema migration (SCHEDULED)
INSERT INTO itil_changes (
    change_number, title, description,
    change_type, category,
    risk_assessment, business_impact, financial_impact,
    affected_ci_ids,
    implementation_plan, backout_plan, test_plan,
    approval_status, approved_by, approved_at,
    status,
    assigned_to, assigned_group,
    requested_by,
    scheduled_start, scheduled_end
) VALUES (
    'CHG-20251116-0002',
    'Add Indexes to Customer Orders Table for Performance Improvement',
    'Create composite indexes on (customer_id, order_date) and (status, created_at) to improve query performance. Expected 40% improvement in dashboard load times.',
    'normal', 'Database',
    '{
        "overall_risk_score": 4.5,
        "risk_level": "medium",
        "requires_cab_approval": true
    }'::jsonb,
    '{
        "critical_services_affected": ["E-Commerce Platform"],
        "estimated_downtime_minutes": 0,
        "customer_impact": false,
        "revenue_at_risk": 0
    }'::jsonb,
    '{
        "implementation_cost": 10000,
        "downtime_cost": 0,
        "total_cost": 10000
    }'::jsonb,
    ARRAY['ci_prod_db_postgres_01'],
    'Execute CREATE INDEX CONCURRENTLY commands during off-peak hours. Monitor index build progress. Validate index usage with EXPLAIN plans.',
    'DROP indexes if performance degradation occurs. Indexes can be dropped with zero downtime.',
    'Tested on production snapshot in staging. Index creation took 45 minutes. Verified query performance improvement with real query patterns.',
    'approved', 'dba.lead@company.com', NOW() - INTERVAL '2 days',
    'scheduled',
    'dba.team@company.com', 'Database Team',
    'product.team@company.com',
    NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '2 hours'
);

-- Emergency Change #3: Critical security vulnerability fix (IN_PROGRESS)
INSERT INTO itil_changes (
    change_number, title, description,
    change_type, category,
    risk_assessment, business_impact, financial_impact,
    affected_ci_ids,
    implementation_plan, backout_plan,
    approval_status, approved_by, approved_at,
    status,
    assigned_to, assigned_group,
    requested_by,
    scheduled_start, scheduled_end,
    actual_start
) VALUES (
    'CHG-20251115-0003',
    'Emergency: Patch Log4Shell Vulnerability CVE-2025-99999',
    'CRITICAL: Zero-day vulnerability discovered in logging library. Active exploitation in the wild. Requires immediate patching.',
    'emergency', 'Security',
    '{
        "overall_risk_score": 9.5,
        "risk_level": "critical",
        "requires_cab_approval": false
    }'::jsonb,
    '{
        "critical_services_affected": ["All Production Services"],
        "estimated_downtime_minutes": 15,
        "customer_impact": true,
        "revenue_at_risk": 500000
    }'::jsonb,
    '{
        "implementation_cost": 25000,
        "downtime_cost": 50000,
        "total_cost": 75000
    }'::jsonb,
    ARRAY['ci_web_app_prod', 'ci_api_server_01', 'ci_api_server_02', 'ci_payment_service_prod', 'ci_email_service_prod'],
    'Deploy patched library version 2.17.1. Rolling restart of all application services. Update firewall rules to block exploit patterns.',
    'Keep previous library version in deployment artifacts. Can rollback via blue-green deployment switch.',
    'auto-approved', 'cto@company.com', NOW() - INTERVAL '30 minutes',
    'in_progress',
    'security.incident.team@company.com', 'Security Incident Response',
    'security.team@company.com',
    NOW() - INTERVAL '15 minutes', NOW() + INTERVAL '30 minutes',
    NOW() - INTERVAL '15 minutes'
);

-- Normal Change #4: Cloud cost optimization (APPROVED)
INSERT INTO itil_changes (
    change_number, title, description,
    change_type, category,
    risk_assessment, business_impact, financial_impact,
    affected_ci_ids,
    implementation_plan, backout_plan, test_plan,
    approval_status, approved_by, approved_at,
    status,
    assigned_to, assigned_group,
    requested_by,
    scheduled_start, scheduled_end
) VALUES (
    'CHG-20251118-0004',
    'Migrate Non-Production Workloads to AWS Spot Instances',
    'Reduce cloud costs by 60% for dev/test environments by leveraging spot instances. Estimated annual savings: $180,000.',
    'normal', 'Infrastructure',
    '{
        "overall_risk_score": 3.0,
        "risk_level": "low",
        "requires_cab_approval": true
    }'::jsonb,
    '{
        "critical_services_affected": [],
        "estimated_downtime_minutes": 0,
        "customer_impact": false,
        "revenue_at_risk": 0
    }'::jsonb,
    '{
        "implementation_cost": 15000,
        "downtime_cost": 0,
        "total_cost": -165000
    }'::jsonb,
    ARRAY['ci_dev_env_cluster', 'ci_test_env_cluster', 'ci_qa_env_cluster'],
    'Update Terraform configurations to use spot instance fleet. Implement spot interruption handling. Migrate workloads using blue-green deployment pattern.',
    'Revert Terraform changes and migrate back to on-demand instances. No data loss risk as environments are non-production.',
    'Tested spot instance interruption handling in sandbox environment. Validated automatic failover and workload redistribution.',
    'approved', 'cfo@company.com', NOW() - INTERVAL '5 days',
    'approved',
    'cloud.team@company.com', 'Cloud Operations',
    'finops.team@company.com',
    NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '4 hours'
);

-- Standard Change #5: SSL certificate renewal (SCHEDULED)
INSERT INTO itil_changes (
    change_number, title, description,
    change_type, category,
    risk_assessment, business_impact, financial_impact,
    affected_ci_ids,
    implementation_plan, backout_plan, test_plan,
    approval_status, approved_by, approved_at,
    status,
    assigned_to, assigned_group,
    requested_by,
    scheduled_start, scheduled_end
) VALUES (
    'CHG-20251120-0005',
    'Renew SSL Certificates for *.company.com Wildcard Domain',
    'Annual SSL certificate renewal. Pre-approved standard change. Zero downtime expected with load balancer certificate rotation.',
    'standard', 'Security',
    '{
        "overall_risk_score": 1.5,
        "risk_level": "low",
        "requires_cab_approval": false
    }'::jsonb,
    '{
        "critical_services_affected": [],
        "estimated_downtime_minutes": 0,
        "customer_impact": false,
        "revenue_at_risk": 0
    }'::jsonb,
    '{
        "implementation_cost": 3000,
        "downtime_cost": 0,
        "total_cost": 3000
    }'::jsonb,
    ARRAY['ci_lb_prod_01', 'ci_lb_prod_02', 'ci_cdn_prod'],
    'Generate new certificate with 365-day validity. Upload to load balancers and CDN. Verify certificate chain. Monitor for SSL errors.',
    'Revert to previous certificate if validation errors occur. Previous certificate valid for 7 more days.',
    'Certificate tested in staging environment. Validated with SSL Labs scanner. No security warnings.',
    'approved', 'security.lead@company.com', NOW() - INTERVAL '3 days',
    'scheduled',
    'security.ops@company.com', 'Security Operations',
    'security.team@company.com',
    NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '1 hour'
);

-- Normal Change #6: Monitoring threshold adjustments (COMPLETED)
INSERT INTO itil_changes (
    change_number, title, description,
    change_type, category,
    risk_assessment, business_impact, financial_impact,
    affected_ci_ids,
    implementation_plan, backout_plan,
    approval_status, approved_by, approved_at,
    status, outcome,
    assigned_to, assigned_group,
    requested_by,
    scheduled_start, scheduled_end,
    actual_start, actual_end,
    closure_notes
) VALUES (
    'CHG-20251108-0006',
    'Adjust CPU Alert Thresholds Based on Baseline Analysis',
    'Reduce false-positive alerts by adjusting CPU thresholds from 70% to 85% based on 90-day baseline analysis.',
    'normal', 'Monitoring',
    '{
        "overall_risk_score": 2.0,
        "risk_level": "low",
        "requires_cab_approval": false
    }'::jsonb,
    '{
        "critical_services_affected": [],
        "estimated_downtime_minutes": 0,
        "customer_impact": false,
        "revenue_at_risk": 0
    }'::jsonb,
    '{
        "implementation_cost": 2000,
        "downtime_cost": 0,
        "total_cost": 2000
    }'::jsonb,
    ARRAY['ci_monitoring_server'],
    'Update alert configurations in monitoring system. Deploy changes via Terraform. Validate with test alerts.',
    'Revert threshold changes via Terraform rollback.',
    'approved', 'ops.lead@company.com', NOW() - INTERVAL '9 days',
    'closed', 'SUCCESS',
    'sre.team@company.com', 'SRE Team',
    'ops.team@company.com',
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '30 minutes',
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '20 minutes',
    'Alert threshold adjustments deployed successfully. Alert volume reduced by 65% as expected. No missed critical alerts.'
);

-- Emergency Change #7: DDoS mitigation (COMPLETED)
INSERT INTO itil_changes (
    change_number, title, description,
    change_type, category,
    risk_assessment, business_impact, financial_impact,
    affected_ci_ids,
    implementation_plan, backout_plan,
    approval_status, approved_by, approved_at,
    status, outcome,
    assigned_to, assigned_group,
    requested_by,
    scheduled_start, scheduled_end,
    actual_start, actual_end,
    closure_notes
) VALUES (
    'CHG-20251105-0007',
    'Emergency: Activate DDoS Protection for Active Attack',
    'Large-scale DDoS attack detected. 500,000 requests/second from botnet. Requires immediate activation of WAF rules and rate limiting.',
    'emergency', 'Security',
    '{
        "overall_risk_score": 8.5,
        "risk_level": "high",
        "requires_cab_approval": false
    }'::jsonb,
    '{
        "critical_services_affected": ["Web Application", "API Services"],
        "estimated_downtime_minutes": 5,
        "customer_impact": true,
        "revenue_at_risk": 100000
    }'::jsonb,
    '{
        "implementation_cost": 10000,
        "downtime_cost": 20000,
        "total_cost": 30000
    }'::jsonb,
    ARRAY['ci_lb_prod_01', 'ci_lb_prod_02', 'ci_waf_prod'],
    'Activate aggressive rate limiting. Deploy geo-blocking rules. Enable challenge-response for suspicious traffic.',
    'Disable WAF rules if legitimate traffic is blocked.',
    'auto-approved', 'security.lead@company.com', NOW() - INTERVAL '10 days',
    'closed', 'SUCCESS',
    'security.incident.team@company.com', 'Security Incident Response',
    'security.team@company.com',
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '30 minutes',
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '15 minutes',
    'DDoS attack successfully mitigated. Attack traffic reduced by 99.8%. Legitimate traffic restored within 15 minutes.'
);

-- Normal Change #8: Feature flag rollout (IN_PROGRESS)
INSERT INTO itil_changes (
    change_number, title, description,
    change_type, category,
    risk_assessment, business_impact, financial_impact,
    affected_ci_ids,
    implementation_plan, backout_plan, test_plan,
    approval_status, approved_by, approved_at,
    status,
    assigned_to, assigned_group,
    requested_by,
    scheduled_start, scheduled_end,
    actual_start
) VALUES (
    'CHG-20251115-0008',
    'Enable New Checkout Flow Feature for 10% of Users',
    'Gradual rollout of redesigned checkout flow. A/B test targeting 10% of users. Monitoring conversion rate impact.',
    'normal', 'Application',
    '{
        "overall_risk_score": 5.0,
        "risk_level": "medium",
        "requires_cab_approval": true
    }'::jsonb,
    '{
        "critical_services_affected": ["E-Commerce Platform"],
        "estimated_downtime_minutes": 0,
        "customer_impact": false,
        "revenue_at_risk": 50000
    }'::jsonb,
    '{
        "implementation_cost": 50000,
        "downtime_cost": 0,
        "total_cost": 50000
    }'::jsonb,
    ARRAY['ci_web_app_prod', 'ci_payment_service_prod'],
    'Update feature flag configuration to enable new checkout flow for 10% of users. Monitor conversion metrics and error rates.',
    'Disable feature flag immediately if conversion rate drops > 5% or error rate increases.',
    'Feature tested with 1000 beta users for 2 weeks. Conversion rate improved by 8%. Error rate unchanged.',
    'approved', 'product.lead@company.com', NOW() - INTERVAL '1 day',
    'in_progress',
    'product.team@company.com', 'Product Team',
    'product.team@company.com',
    NOW() - INTERVAL '2 hours', NOW() + INTERVAL '4 hours',
    NOW() - INTERVAL '2 hours'
);

-- ==========================================
-- ITIL Baselines
-- ==========================================

-- Baseline #1: Production web server configuration
INSERT INTO itil_baselines (
    name, description, baseline_type,
    scope, baseline_data,
    status, created_by, approved_by, approved_at
) VALUES (
    'Production Web Server Standard Configuration - Q4 2025',
    'Approved baseline configuration for all production web servers including OS version, installed packages, security hardening, and monitoring agents.',
    'configuration',
    '{
        "ci_ids": ["ci_web_server_01", "ci_web_server_02", "ci_web_server_03"],
        "ci_types": ["web-server"],
        "environment": "production"
    }'::jsonb,
    '{
        "os_version": "Ubuntu 22.04.3 LTS",
        "kernel_version": "5.15.0-89-generic",
        "required_packages": {
            "nginx": "1.24.0",
            "nodejs": "20.10.0",
            "pm2": "5.3.0",
            "datadog-agent": "7.50.0"
        },
        "security_hardening": {
            "ssh_port": 22,
            "ssh_key_only": true,
            "firewall_enabled": true,
            "fail2ban_enabled": true,
            "auto_updates": "security-only"
        },
        "monitoring": {
            "datadog_enabled": true,
            "log_forwarding": "enabled",
            "apm_enabled": true
        },
        "performance_tuning": {
            "nginx_worker_processes": 8,
            "nginx_worker_connections": 4096,
            "max_open_files": 65536
        }
    }'::jsonb,
    'approved',
    'infrastructure.team@company.com',
    'cto@company.com',
    NOW() - INTERVAL '30 days'
);

-- Baseline #2: Security compliance baseline for PCI-DSS
INSERT INTO itil_baselines (
    name, description, baseline_type,
    scope, baseline_data,
    status, created_by, approved_by, approved_at
) VALUES (
    'PCI-DSS Compliance Baseline - Payment Processing Systems',
    'Security configuration baseline for all systems handling payment card data. Required for PCI-DSS compliance.',
    'security',
    '{
        "ci_ids": ["ci_payment_service_prod", "ci_payment_db_prod"],
        "ci_types": ["payment-service", "database"],
        "environment": "production"
    }'::jsonb,
    '{
        "encryption": {
            "data_at_rest": "AES-256",
            "data_in_transit": "TLS 1.3",
            "key_rotation_days": 90
        },
        "access_control": {
            "mfa_required": true,
            "session_timeout_minutes": 15,
            "password_complexity": "high",
            "password_rotation_days": 60
        },
        "audit_logging": {
            "enabled": true,
            "retention_days": 365,
            "log_integrity_protection": true
        },
        "network_security": {
            "network_segmentation": "DMZ",
            "firewall_rules": "whitelist-only",
            "ids_ips_enabled": true
        },
        "vulnerability_management": {
            "scan_frequency_days": 7,
            "patch_sla_critical_days": 7,
            "patch_sla_high_days": 30
        }
    }'::jsonb,
    'approved',
    'security.team@company.com',
    'ciso@company.com',
    NOW() - INTERVAL '45 days'
);

-- Baseline #3: Performance baseline for API services
INSERT INTO itil_baselines (
    name, description, baseline_type,
    scope, baseline_data,
    status, created_by, approved_by, approved_at
) VALUES (
    'API Service Performance Baseline - 95th Percentile SLOs',
    'Expected performance characteristics for all production API services. Used for anomaly detection and capacity planning.',
    'performance',
    '{
        "ci_ids": ["ci_api_server_01", "ci_api_server_02", "ci_payment_service_prod"],
        "ci_types": ["api-server", "microservice"],
        "environment": "production"
    }'::jsonb,
    '{
        "latency_p50_ms": 45,
        "latency_p95_ms": 150,
        "latency_p99_ms": 350,
        "throughput_rps": 5000,
        "error_rate_percent": 0.1,
        "availability_percent": 99.95,
        "cpu_utilization_percent": 65,
        "memory_utilization_percent": 70,
        "database_connection_pool_percent": 60,
        "cache_hit_rate_percent": 85
    }'::jsonb,
    'approved',
    'sre.team@company.com',
    'vp.engineering@company.com',
    NOW() - INTERVAL '60 days'
);

COMMIT;

-- ==========================================
-- Verification Queries
-- ==========================================

-- Count records created
SELECT
    'Incidents' as table_name, COUNT(*) as record_count
FROM itil_incidents
UNION ALL
SELECT
    'Changes', COUNT(*)
FROM itil_changes
UNION ALL
SELECT
    'Baselines', COUNT(*)
FROM itil_baselines;

-- Show incident summary by status
SELECT
    status,
    priority,
    COUNT(*) as count,
    AVG(time_to_acknowledge_minutes)::integer as avg_ack_time_min,
    AVG(time_to_resolve_minutes)::integer as avg_resolve_time_min
FROM itil_incidents
WHERE status IN ('new', 'assigned', 'in_progress', 'resolved')
GROUP BY status, priority
ORDER BY priority, status;

-- Show change summary by type and status
SELECT
    change_type,
    status,
    COUNT(*) as count,
    SUM((financial_impact->>'total_cost')::numeric) as total_financial_impact
FROM itil_changes
GROUP BY change_type, status
ORDER BY change_type, status;

-- Show baseline summary
SELECT
    baseline_type,
    status,
    COUNT(*) as count
FROM itil_baselines
GROUP BY baseline_type, status
ORDER BY baseline_type;
