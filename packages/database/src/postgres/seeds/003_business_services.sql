-- ==========================================
-- Business Services Sample Data Seed Script
-- ==========================================
-- Created: 2025-11-15
-- Purpose: Populate business service tables with realistic sample data for v3.0
-- Tables: business_services, application_services, business_capabilities, service_dependencies
--
-- This script creates:
-- - 5 business services (critical to supporting)
-- - 8 application services
-- - 4 business capabilities
-- - 20+ service dependencies
-- ==========================================

BEGIN;

-- ==========================================
-- Business Capabilities (Top Layer)
-- ==========================================

INSERT INTO business_capabilities (
    id, name, description,
    tbm_attributes, capability_attributes, value_attributes,
    created_by
) VALUES
-- Capability #1: Revenue Generation (Customer-facing)
(
    '550e8400-e29b-41d4-a716-446655440001',
    'Digital Commerce',
    'Online sales and transaction processing capabilities enabling direct revenue generation through web and mobile channels.',
    '{
        "business_unit": "Sales & Marketing",
        "total_monthly_cost": 450000,
        "cost_per_employee": 3750,
        "budget_annual": 5400000,
        "variance_percentage": 2.5
    }'::jsonb,
    '{
        "capability_type": "core",
        "parent_capability_id": null,
        "strategic_importance": "critical",
        "maturity_level": "optimizing",
        "lifecycle_stage": "enhance",
        "capability_owner": "SVP Digital Commerce"
    }'::jsonb,
    '{
        "revenue_impact": {
            "direct_revenue": true,
            "annual_revenue_supported": 125000000,
            "customer_count_impacted": 500000,
            "transaction_volume": 50000
        },
        "customer_facing": true,
        "user_count": 500000,
        "regulatory_requirements": ["PCI-DSS", "GDPR", "CCPA"],
        "competitive_advantage": true
    }'::jsonb,
    'system.admin@company.com'
),

-- Capability #2: Customer Support
(
    '550e8400-e29b-41d4-a716-446655440002',
    'Customer Support & Service',
    'Customer inquiry management, issue resolution, and support operations across all channels.',
    '{
        "business_unit": "Customer Success",
        "total_monthly_cost": 280000,
        "cost_per_employee": 4000,
        "budget_annual": 3360000,
        "variance_percentage": -1.2
    }'::jsonb,
    '{
        "capability_type": "core",
        "parent_capability_id": null,
        "strategic_importance": "high",
        "maturity_level": "managed",
        "lifecycle_stage": "maintain",
        "capability_owner": "VP Customer Success"
    }'::jsonb,
    '{
        "revenue_impact": {
            "direct_revenue": false,
            "annual_revenue_supported": 50000000,
            "customer_count_impacted": 500000,
            "transaction_volume": 15000
        },
        "customer_facing": true,
        "user_count": 200,
        "regulatory_requirements": ["GDPR", "CCPA"],
        "competitive_advantage": false
    }'::jsonb,
    'system.admin@company.com'
),

-- Capability #3: Internal Operations
(
    '550e8400-e29b-41d4-a716-446655440003',
    'Employee Operations & HR',
    'Human resources management, payroll processing, employee self-service, and organizational management.',
    '{
        "business_unit": "Human Resources",
        "total_monthly_cost": 125000,
        "cost_per_employee": 104.17,
        "budget_annual": 1500000,
        "variance_percentage": 0.8
    }'::jsonb,
    '{
        "capability_type": "supporting",
        "parent_capability_id": null,
        "strategic_importance": "medium",
        "maturity_level": "defined",
        "lifecycle_stage": "maintain",
        "capability_owner": "CHRO"
    }'::jsonb,
    '{
        "revenue_impact": {
            "direct_revenue": false,
            "annual_revenue_supported": 0,
            "customer_count_impacted": 0,
            "transaction_volume": 500
        },
        "customer_facing": false,
        "user_count": 1200,
        "regulatory_requirements": ["SOX", "GDPR"],
        "competitive_advantage": false
    }'::jsonb,
    'system.admin@company.com'
),

-- Capability #4: Data & Analytics
(
    '550e8400-e29b-41d4-a716-446655440004',
    'Business Intelligence & Analytics',
    'Data warehousing, business intelligence, reporting, and advanced analytics capabilities.',
    '{
        "business_unit": "IT & Data",
        "total_monthly_cost": 185000,
        "cost_per_employee": 6166.67,
        "budget_annual": 2220000,
        "variance_percentage": 5.2
    }'::jsonb,
    '{
        "capability_type": "supporting",
        "parent_capability_id": null,
        "strategic_importance": "high",
        "maturity_level": "managed",
        "lifecycle_stage": "enhance",
        "capability_owner": "Chief Data Officer"
    }'::jsonb,
    '{
        "revenue_impact": {
            "direct_revenue": false,
            "annual_revenue_supported": 125000000,
            "customer_count_impacted": 0,
            "transaction_volume": 0
        },
        "customer_facing": false,
        "user_count": 350,
        "regulatory_requirements": ["SOX", "GDPR"],
        "competitive_advantage": true
    }'::jsonb,
    'system.admin@company.com'
);

-- ==========================================
-- Business Services (Mid Layer)
-- ==========================================

INSERT INTO business_services (
    id, name, description,
    itil_attributes, tbm_attributes, bsm_attributes,
    technical_owner, platform_team,
    operational_status, created_by
) VALUES
-- Service #1: E-Commerce Platform (Tier 1 - Critical)
(
    '650e8400-e29b-41d4-a716-446655440001',
    'E-Commerce Platform',
    'Core online shopping experience including product catalog, shopping cart, checkout, and order management.',
    '{
        "service_owner": "product.owner@company.com",
        "service_type": "customer_facing",
        "service_hours": {"availability": "24x7", "timezone": "UTC"},
        "sla_targets": {"availability_percentage": 99.95, "response_time_ms": 500},
        "support_level": "l1",
        "incident_count_30d": 3,
        "change_count_30d": 8,
        "availability_30d": 99.97
    }'::jsonb,
    '{
        "total_monthly_cost": 285000,
        "cost_per_user": 0.57,
        "cost_per_transaction": 0.19,
        "cost_breakdown_by_tower": {
            "compute": 125000,
            "storage": 45000,
            "network": 35000,
            "software": 50000,
            "support": 30000
        },
        "cost_trend": "increasing"
    }'::jsonb,
    '{
        "business_criticality": "tier_1",
        "capabilities_enabled": ["Digital Commerce"],
        "value_streams": ["Online Sales", "Customer Acquisition"],
        "business_impact_score": 95,
        "risk_rating": "critical",
        "annual_revenue_supported": 125000000,
        "customer_count": 500000,
        "transaction_volume_daily": 50000,
        "compliance_requirements": ["PCI-DSS", "GDPR", "CCPA", "SOX"],
        "data_sensitivity": "highly_confidential",
        "sox_scope": true,
        "pci_scope": true,
        "recovery_time_objective": 30,
        "recovery_point_objective": 5,
        "disaster_recovery_tier": 1
    }'::jsonb,
    'platform.lead@company.com',
    'E-Commerce Platform Team',
    'operational',
    'system.admin@company.com'
),

-- Service #2: Customer Support Portal (Tier 2 - High)
(
    '650e8400-e29b-41d4-a716-446655440002',
    'Customer Support Portal',
    'Self-service customer support including knowledge base, ticket management, live chat, and case tracking.',
    '{
        "service_owner": "support.director@company.com",
        "service_type": "customer_facing",
        "service_hours": {"availability": "24x5", "timezone": "UTC"},
        "sla_targets": {"availability_percentage": 99.5, "response_time_ms": 1000},
        "support_level": "l2",
        "incident_count_30d": 5,
        "change_count_30d": 3,
        "availability_30d": 99.82
    }'::jsonb,
    '{
        "total_monthly_cost": 95000,
        "cost_per_user": 475.00,
        "cost_per_transaction": 6.33,
        "cost_breakdown_by_tower": {
            "compute": 35000,
            "storage": 15000,
            "network": 10000,
            "software": 25000,
            "support": 10000
        },
        "cost_trend": "stable"
    }'::jsonb,
    '{
        "business_criticality": "tier_2",
        "capabilities_enabled": ["Customer Support & Service"],
        "value_streams": ["Customer Retention", "Customer Satisfaction"],
        "business_impact_score": 75,
        "risk_rating": "high",
        "annual_revenue_supported": 50000000,
        "customer_count": 200000,
        "transaction_volume_daily": 15000,
        "compliance_requirements": ["GDPR", "CCPA"],
        "data_sensitivity": "confidential",
        "sox_scope": false,
        "pci_scope": false,
        "recovery_time_objective": 120,
        "recovery_point_objective": 30,
        "disaster_recovery_tier": 2
    }'::jsonb,
    'support.tech.lead@company.com',
    'Customer Experience Team',
    'operational',
    'system.admin@company.com'
),

-- Service #3: Internal HR System (Tier 3 - Medium)
(
    '650e8400-e29b-41d4-a716-446655440003',
    'Employee Self-Service Portal',
    'Internal HR system for employee information management, payroll, benefits, time tracking, and performance management.',
    '{
        "service_owner": "hr.director@company.com",
        "service_type": "internal",
        "service_hours": {"availability": "8x5", "timezone": "US/Pacific"},
        "sla_targets": {"availability_percentage": 99.0, "response_time_ms": 2000},
        "support_level": "l3",
        "incident_count_30d": 2,
        "change_count_30d": 4,
        "availability_30d": 99.45
    }'::jsonb,
    '{
        "total_monthly_cost": 65000,
        "cost_per_user": 54.17,
        "cost_per_transaction": 130.00,
        "cost_breakdown_by_tower": {
            "compute": 20000,
            "storage": 10000,
            "network": 5000,
            "software": 25000,
            "support": 5000
        },
        "cost_trend": "stable"
    }'::jsonb,
    '{
        "business_criticality": "tier_3",
        "capabilities_enabled": ["Employee Operations & HR"],
        "value_streams": ["Employee Productivity"],
        "business_impact_score": 55,
        "risk_rating": "medium",
        "annual_revenue_supported": 0,
        "customer_count": 0,
        "transaction_volume_daily": 500,
        "compliance_requirements": ["SOX", "GDPR"],
        "data_sensitivity": "confidential",
        "sox_scope": true,
        "pci_scope": false,
        "recovery_time_objective": 480,
        "recovery_point_objective": 240,
        "disaster_recovery_tier": 3
    }'::jsonb,
    'hr.tech.lead@company.com',
    'Enterprise Applications Team',
    'operational',
    'system.admin@company.com'
),

-- Service #4: Business Intelligence Platform (Tier 2 - High)
(
    '650e8400-e29b-41d4-a716-446655440004',
    'Executive BI & Analytics Platform',
    'Enterprise data warehouse, BI dashboards, executive reporting, and advanced analytics capabilities.',
    '{
        "service_owner": "cdo@company.com",
        "service_type": "internal",
        "service_hours": {"availability": "24x5", "timezone": "UTC"},
        "sla_targets": {"availability_percentage": 99.5, "response_time_ms": 3000},
        "support_level": "l2",
        "incident_count_30d": 1,
        "change_count_30d": 5,
        "availability_30d": 99.88
    }'::jsonb,
    '{
        "total_monthly_cost": 145000,
        "cost_per_user": 414.29,
        "cost_per_transaction": 0,
        "cost_breakdown_by_tower": {
            "compute": 55000,
            "storage": 40000,
            "network": 15000,
            "software": 30000,
            "support": 5000
        },
        "cost_trend": "increasing"
    }'::jsonb,
    '{
        "business_criticality": "tier_2",
        "capabilities_enabled": ["Business Intelligence & Analytics"],
        "value_streams": ["Data-Driven Decision Making"],
        "business_impact_score": 70,
        "risk_rating": "medium",
        "annual_revenue_supported": 125000000,
        "customer_count": 0,
        "transaction_volume_daily": 0,
        "compliance_requirements": ["SOX", "GDPR"],
        "data_sensitivity": "highly_confidential",
        "sox_scope": true,
        "pci_scope": false,
        "recovery_time_objective": 240,
        "recovery_point_objective": 60,
        "disaster_recovery_tier": 2
    }'::jsonb,
    'data.platform.lead@company.com',
    'Data Platform Team',
    'operational',
    'system.admin@company.com'
),

-- Service #5: Internal Collaboration Tools (Tier 4 - Low)
(
    '650e8400-e29b-41d4-a716-446655440005',
    'Team Collaboration Platform',
    'Internal communication, file sharing, video conferencing, and team collaboration tools.',
    '{
        "service_owner": "it.director@company.com",
        "service_type": "internal",
        "service_hours": {"availability": "24x7", "timezone": "UTC"},
        "sla_targets": {"availability_percentage": 98.5, "response_time_ms": 5000},
        "support_level": "l3",
        "incident_count_30d": 8,
        "change_count_30d": 2,
        "availability_30d": 98.92
    }'::jsonb,
    '{
        "total_monthly_cost": 42000,
        "cost_per_user": 35.00,
        "cost_per_transaction": 0,
        "cost_breakdown_by_tower": {
            "compute": 5000,
            "storage": 12000,
            "network": 5000,
            "software": 18000,
            "support": 2000
        },
        "cost_trend": "stable"
    }'::jsonb,
    '{
        "business_criticality": "tier_4",
        "capabilities_enabled": ["Employee Operations & HR"],
        "value_streams": ["Employee Productivity"],
        "business_impact_score": 35,
        "risk_rating": "low",
        "annual_revenue_supported": 0,
        "customer_count": 0,
        "transaction_volume_daily": 0,
        "compliance_requirements": ["GDPR"],
        "data_sensitivity": "internal",
        "sox_scope": false,
        "pci_scope": false,
        "recovery_time_objective": 1440,
        "recovery_point_objective": 720,
        "disaster_recovery_tier": 4
    }'::jsonb,
    'it.operations@company.com',
    'IT Operations Team',
    'operational',
    'system.admin@company.com'
);

-- ==========================================
-- Application Services (Bottom Layer)
-- ==========================================

INSERT INTO application_services (
    id, name, description,
    tbm_attributes, itil_attributes, application_attributes, quality_metrics,
    business_value_score, created_by
) VALUES
-- App #1: Web Application (E-Commerce Frontend)
(
    '750e8400-e29b-41d4-a716-446655440001',
    'E-Commerce Web Application',
    'React-based web application for product browsing, cart management, and checkout.',
    '{
        "solution_type": "application",
        "it_tower_alignment": "End User Experience",
        "total_monthly_cost": 95000,
        "cost_breakdown": {
            "infrastructure": 45000,
            "licenses": 15000,
            "labor": 30000,
            "support": 5000
        }
    }'::jsonb,
    '{
        "service_type": "technical_service",
        "service_owner": "frontend.lead@company.com",
        "lifecycle_stage": "operate",
        "release_version": "3.12.0",
        "change_schedule": "bi-weekly"
    }'::jsonb,
    '{
        "application_type": "web_application",
        "technology_stack": {
            "primary_language": "TypeScript",
            "frameworks": ["React 18", "Next.js 14", "TailwindCSS"],
            "databases": [],
            "messaging": ["RabbitMQ"],
            "caching": ["Redis"],
            "monitoring": ["Datadog", "Sentry"]
        },
        "deployment_model": "cloud_native",
        "architecture_pattern": "spa",
        "product_owner": "product.owner@company.com",
        "development_team": "Frontend Team",
        "vendor_product": false,
        "vendor_name": null
    }'::jsonb,
    '{
        "code_repository": "https://github.com/company/ecommerce-web",
        "test_coverage_percentage": 82,
        "defect_density": 1.2,
        "availability_percentage": 99.97,
        "response_time_p95": 450
    }'::jsonb,
    95,
    'system.admin@company.com'
),

-- App #2: API Gateway
(
    '750e8400-e29b-41d4-a716-446655440002',
    'API Gateway Service',
    'Kong-based API gateway for routing, authentication, rate limiting, and API management.',
    '{
        "solution_type": "middleware",
        "it_tower_alignment": "Application Infrastructure",
        "total_monthly_cost": 65000,
        "cost_breakdown": {
            "infrastructure": 35000,
            "licenses": 20000,
            "labor": 8000,
            "support": 2000
        }
    }'::jsonb,
    '{
        "service_type": "technical_service",
        "service_owner": "platform.lead@company.com",
        "lifecycle_stage": "operate",
        "release_version": "3.5.0",
        "change_schedule": "monthly"
    }'::jsonb,
    '{
        "application_type": "middleware",
        "technology_stack": {
            "primary_language": "Lua",
            "frameworks": ["Kong Gateway", "OpenResty"],
            "databases": ["PostgreSQL"],
            "messaging": [],
            "caching": ["Redis"],
            "monitoring": ["Datadog", "Prometheus"]
        },
        "deployment_model": "cloud_native",
        "architecture_pattern": "gateway",
        "product_owner": "platform.owner@company.com",
        "development_team": "Platform Team",
        "vendor_product": true,
        "vendor_name": "Kong Inc."
    }'::jsonb,
    '{
        "code_repository": "https://github.com/company/api-gateway-config",
        "test_coverage_percentage": 75,
        "defect_density": 0.8,
        "availability_percentage": 99.98,
        "response_time_p95": 25
    }'::jsonb,
    90,
    'system.admin@company.com'
),

-- App #3: Payment Processing Service
(
    '750e8400-e29b-41d4-a716-446655440003',
    'Payment Processing Microservice',
    'Node.js microservice handling payment authorization, capture, refunds, and PCI-compliant card tokenization.',
    '{
        "solution_type": "application",
        "it_tower_alignment": "Business Applications",
        "total_monthly_cost": 125000,
        "cost_breakdown": {
            "infrastructure": 45000,
            "licenses": 35000,
            "labor": 40000,
            "support": 5000
        }
    }'::jsonb,
    '{
        "service_type": "technical_service",
        "service_owner": "backend.lead@company.com",
        "lifecycle_stage": "operate",
        "release_version": "2.8.5",
        "change_schedule": "weekly"
    }'::jsonb,
    '{
        "application_type": "microservice",
        "technology_stack": {
            "primary_language": "Node.js",
            "frameworks": ["Express", "TypeScript"],
            "databases": ["PostgreSQL", "Redis"],
            "messaging": ["RabbitMQ", "Kafka"],
            "caching": ["Redis"],
            "monitoring": ["Datadog", "PagerDuty"]
        },
        "deployment_model": "cloud_native",
        "architecture_pattern": "microservices",
        "product_owner": "payment.owner@company.com",
        "development_team": "Payments Team",
        "vendor_product": false,
        "vendor_name": null
    }'::jsonb,
    '{
        "code_repository": "https://github.com/company/payment-service",
        "test_coverage_percentage": 95,
        "defect_density": 0.3,
        "availability_percentage": 99.99,
        "response_time_p95": 180
    }'::jsonb,
    98,
    'system.admin@company.com'
),

-- App #4: Order Management System
(
    '750e8400-e29b-41d4-a716-446655440004',
    'Order Management System',
    'Order lifecycle management including order creation, fulfillment tracking, inventory management, and shipping.',
    '{
        "solution_type": "application",
        "it_tower_alignment": "Business Applications",
        "total_monthly_cost": 85000,
        "cost_breakdown": {
            "infrastructure": 35000,
            "licenses": 25000,
            "labor": 22000,
            "support": 3000
        }
    }'::jsonb,
    '{
        "service_type": "technical_service",
        "service_owner": "backend.lead@company.com",
        "lifecycle_stage": "operate",
        "release_version": "4.2.1",
        "change_schedule": "bi-weekly"
    }'::jsonb,
    '{
        "application_type": "monolith",
        "technology_stack": {
            "primary_language": "Java",
            "frameworks": ["Spring Boot", "Hibernate"],
            "databases": ["PostgreSQL", "MongoDB"],
            "messaging": ["RabbitMQ"],
            "caching": ["Redis"],
            "monitoring": ["Datadog", "New Relic"]
        },
        "deployment_model": "hybrid",
        "architecture_pattern": "layered",
        "product_owner": "operations.owner@company.com",
        "development_team": "Backend Team",
        "vendor_product": false,
        "vendor_name": null
    }'::jsonb,
    '{
        "code_repository": "https://github.com/company/order-management",
        "test_coverage_percentage": 78,
        "defect_density": 1.5,
        "availability_percentage": 99.92,
        "response_time_p95": 650
    }'::jsonb,
    85,
    'system.admin@company.com'
),

-- App #5: Customer Support Ticketing System
(
    '750e8400-e29b-41d4-a716-446655440005',
    'Support Ticketing System',
    'Zendesk-based ticketing system for customer inquiries, issue tracking, and support workflow management.',
    '{
        "solution_type": "application",
        "it_tower_alignment": "Business Applications",
        "total_monthly_cost": 45000,
        "cost_breakdown": {
            "infrastructure": 5000,
            "licenses": 30000,
            "labor": 8000,
            "support": 2000
        }
    }'::jsonb,
    '{
        "service_type": "technical_service",
        "service_owner": "support.tech.lead@company.com",
        "lifecycle_stage": "operate",
        "release_version": "SaaS",
        "change_schedule": "vendor-managed"
    }'::jsonb,
    '{
        "application_type": "saas",
        "technology_stack": {
            "primary_language": "N/A",
            "frameworks": [],
            "databases": [],
            "messaging": [],
            "caching": [],
            "monitoring": ["Zendesk Analytics"]
        },
        "deployment_model": "saas",
        "architecture_pattern": "saas",
        "product_owner": "support.director@company.com",
        "development_team": "N/A - Vendor Managed",
        "vendor_product": true,
        "vendor_name": "Zendesk"
    }'::jsonb,
    '{
        "code_repository": "N/A",
        "test_coverage_percentage": 0,
        "defect_density": 0,
        "availability_percentage": 99.85,
        "response_time_p95": 850
    }'::jsonb,
    75,
    'system.admin@company.com'
),

-- App #6: Knowledge Base Portal
(
    '750e8400-e29b-41d4-a716-446655440006',
    'Self-Service Knowledge Base',
    'Customer-facing knowledge base with articles, FAQs, video tutorials, and search capabilities.',
    '{
        "solution_type": "application",
        "it_tower_alignment": "End User Experience",
        "total_monthly_cost": 25000,
        "cost_breakdown": {
            "infrastructure": 10000,
            "licenses": 8000,
            "labor": 5000,
            "support": 2000
        }
    }'::jsonb,
    '{
        "service_type": "technical_service",
        "service_owner": "content.team@company.com",
        "lifecycle_stage": "operate",
        "release_version": "2.5.0",
        "change_schedule": "continuous"
    }'::jsonb,
    '{
        "application_type": "web_application",
        "technology_stack": {
            "primary_language": "Python",
            "frameworks": ["Django", "Vue.js"],
            "databases": ["PostgreSQL", "Elasticsearch"],
            "messaging": [],
            "caching": ["Varnish"],
            "monitoring": ["Datadog"]
        },
        "deployment_model": "cloud_native",
        "architecture_pattern": "mvc",
        "product_owner": "support.director@company.com",
        "development_team": "Customer Experience Team",
        "vendor_product": false,
        "vendor_name": null
    }'::jsonb,
    '{
        "code_repository": "https://github.com/company/knowledge-base",
        "test_coverage_percentage": 68,
        "defect_density": 2.1,
        "availability_percentage": 99.75,
        "response_time_p95": 1200
    }'::jsonb,
    65,
    'system.admin@company.com'
),

-- App #7: HR Management System
(
    '750e8400-e29b-41d4-a716-446655440007',
    'HRIS - Workday',
    'Enterprise HR system for employee records, payroll, benefits, performance management, and recruiting.',
    '{
        "solution_type": "application",
        "it_tower_alignment": "Business Applications",
        "total_monthly_cost": 65000,
        "cost_breakdown": {
            "infrastructure": 0,
            "licenses": 55000,
            "labor": 8000,
            "support": 2000
        }
    }'::jsonb,
    '{
        "service_type": "technical_service",
        "service_owner": "hr.tech.lead@company.com",
        "lifecycle_stage": "operate",
        "release_version": "SaaS",
        "change_schedule": "vendor-managed"
    }'::jsonb,
    '{
        "application_type": "saas",
        "technology_stack": {
            "primary_language": "N/A",
            "frameworks": [],
            "databases": [],
            "messaging": [],
            "caching": [],
            "monitoring": ["Workday Analytics"]
        },
        "deployment_model": "saas",
        "architecture_pattern": "saas",
        "product_owner": "hr.director@company.com",
        "development_team": "N/A - Vendor Managed",
        "vendor_product": true,
        "vendor_name": "Workday"
    }'::jsonb,
    '{
        "code_repository": "N/A",
        "test_coverage_percentage": 0,
        "defect_density": 0,
        "availability_percentage": 99.5,
        "response_time_p95": 2500
    }'::jsonb,
    60,
    'system.admin@company.com'
),

-- App #8: Business Intelligence Platform
(
    '750e8400-e29b-41d4-a716-446655440008',
    'BI Platform - Tableau + Snowflake',
    'Enterprise data warehouse (Snowflake) and business intelligence dashboards (Tableau) for executive reporting.',
    '{
        "solution_type": "analytics",
        "it_tower_alignment": "Data Management",
        "total_monthly_cost": 145000,
        "cost_breakdown": {
            "infrastructure": 0,
            "licenses": 120000,
            "labor": 20000,
            "support": 5000
        }
    }'::jsonb,
    '{
        "service_type": "technical_service",
        "service_owner": "data.platform.lead@company.com",
        "lifecycle_stage": "operate",
        "release_version": "SaaS",
        "change_schedule": "vendor-managed"
    }'::jsonb,
    '{
        "application_type": "saas",
        "technology_stack": {
            "primary_language": "SQL",
            "frameworks": [],
            "databases": ["Snowflake"],
            "messaging": [],
            "caching": [],
            "monitoring": ["Snowflake Query Profiler", "Tableau Server Monitoring"]
        },
        "deployment_model": "saas",
        "architecture_pattern": "data_warehouse",
        "product_owner": "cdo@company.com",
        "development_team": "Data Platform Team",
        "vendor_product": true,
        "vendor_name": "Snowflake + Tableau"
    }'::jsonb,
    '{
        "code_repository": "https://github.com/company/data-pipelines",
        "test_coverage_percentage": 0,
        "defect_density": 0,
        "availability_percentage": 99.9,
        "response_time_p95": 3500
    }'::jsonb,
    80,
    'system.admin@company.com'
);

-- ==========================================
-- Service Dependencies
-- ==========================================

-- Business Service → Business Capability
INSERT INTO service_dependencies (source_type, source_id, target_type, target_id, dependency_type, dependency_strength, is_critical, discovered_by) VALUES
('business_service', '650e8400-e29b-41d4-a716-446655440001', 'business_capability', '550e8400-e29b-41d4-a716-446655440001', 'enables', 1.0, TRUE, 'system'),
('business_service', '650e8400-e29b-41d4-a716-446655440002', 'business_capability', '550e8400-e29b-41d4-a716-446655440002', 'enables', 1.0, TRUE, 'system'),
('business_service', '650e8400-e29b-41d4-a716-446655440003', 'business_capability', '550e8400-e29b-41d4-a716-446655440003', 'enables', 1.0, TRUE, 'system'),
('business_service', '650e8400-e29b-41d4-a716-446655440004', 'business_capability', '550e8400-e29b-41d4-a716-446655440004', 'enables', 1.0, TRUE, 'system');

-- Business Service → Application Service
INSERT INTO service_dependencies (source_type, source_id, target_type, target_id, dependency_type, dependency_strength, is_critical, discovered_by) VALUES
-- E-Commerce Platform dependencies
('business_service', '650e8400-e29b-41d4-a716-446655440001', 'application_service', '750e8400-e29b-41d4-a716-446655440001', 'depends_on', 1.0, TRUE, 'system'),
('business_service', '650e8400-e29b-41d4-a716-446655440001', 'application_service', '750e8400-e29b-41d4-a716-446655440002', 'depends_on', 1.0, TRUE, 'system'),
('business_service', '650e8400-e29b-41d4-a716-446655440001', 'application_service', '750e8400-e29b-41d4-a716-446655440003', 'depends_on', 1.0, TRUE, 'system'),
('business_service', '650e8400-e29b-41d4-a716-446655440001', 'application_service', '750e8400-e29b-41d4-a716-446655440004', 'depends_on', 0.9, TRUE, 'system'),

-- Customer Support Portal dependencies
('business_service', '650e8400-e29b-41d4-a716-446655440002', 'application_service', '750e8400-e29b-41d4-a716-446655440005', 'depends_on', 1.0, TRUE, 'system'),
('business_service', '650e8400-e29b-41d4-a716-446655440002', 'application_service', '750e8400-e29b-41d4-a716-446655440006', 'depends_on', 0.8, FALSE, 'system'),
('business_service', '650e8400-e29b-41d4-a716-446655440002', 'application_service', '750e8400-e29b-41d4-a716-446655440002', 'depends_on', 0.7, FALSE, 'system'),

-- Employee Self-Service dependencies
('business_service', '650e8400-e29b-41d4-a716-446655440003', 'application_service', '750e8400-e29b-41d4-a716-446655440007', 'depends_on', 1.0, TRUE, 'system'),

-- BI Platform dependencies
('business_service', '650e8400-e29b-41d4-a716-446655440004', 'application_service', '750e8400-e29b-41d4-a716-446655440008', 'depends_on', 1.0, TRUE, 'system');

-- Application Service → Application Service (inter-app dependencies)
INSERT INTO service_dependencies (source_type, source_id, target_type, target_id, dependency_type, dependency_strength, is_critical, discovered_by) VALUES
-- Web App depends on API Gateway
('application_service', '750e8400-e29b-41d4-a716-446655440001', 'application_service', '750e8400-e29b-41d4-a716-446655440002', 'depends_on', 1.0, TRUE, 'discovery'),

-- API Gateway routes to backend services
('application_service', '750e8400-e29b-41d4-a716-446655440002', 'application_service', '750e8400-e29b-41d4-a716-446655440003', 'routes_to', 0.9, TRUE, 'discovery'),
('application_service', '750e8400-e29b-41d4-a716-446655440002', 'application_service', '750e8400-e29b-41d4-a716-446655440004', 'routes_to', 0.9, TRUE, 'discovery'),

-- Payment Service depends on Order Management
('application_service', '750e8400-e29b-41d4-a716-446655440003', 'application_service', '750e8400-e29b-41d4-a716-446655440004', 'integrates_with', 0.8, TRUE, 'discovery'),

-- BI Platform reads from operational databases
('application_service', '750e8400-e29b-41d4-a716-446655440008', 'application_service', '750e8400-e29b-41d4-a716-446655440004', 'reads_from', 0.6, FALSE, 'discovery');

COMMIT;

-- ==========================================
-- Verification Queries
-- ==========================================

-- Count records created
SELECT
    'Business Capabilities' as table_name, COUNT(*) as record_count
FROM business_capabilities
UNION ALL
SELECT
    'Business Services', COUNT(*)
FROM business_services
UNION ALL
SELECT
    'Application Services', COUNT(*)
FROM application_services
UNION ALL
SELECT
    'Service Dependencies', COUNT(*)
FROM service_dependencies;

-- Show business services by criticality
SELECT
    bsm_attributes->>'business_criticality' as criticality_tier,
    COUNT(*) as service_count,
    SUM((tbm_attributes->>'total_monthly_cost')::numeric) as total_monthly_cost,
    AVG((bsm_attributes->>'business_impact_score')::integer) as avg_impact_score
FROM business_services
GROUP BY bsm_attributes->>'business_criticality'
ORDER BY criticality_tier;

-- Show application services by type
SELECT
    application_attributes->>'application_type' as app_type,
    COUNT(*) as count,
    SUM((tbm_attributes->>'total_monthly_cost')::numeric) as total_cost,
    AVG(business_value_score) as avg_business_value
FROM application_services
GROUP BY application_attributes->>'application_type'
ORDER BY total_cost DESC;

-- Show service dependency summary
SELECT
    dependency_type,
    is_critical,
    COUNT(*) as count,
    ROUND(AVG(dependency_strength)::numeric, 2) as avg_strength
FROM service_dependencies
GROUP BY dependency_type, is_critical
ORDER BY dependency_type, is_critical DESC;

-- Show complete service hierarchy
SELECT
    bc.name as capability,
    bs.name as business_service,
    bs.bsm_attributes->>'business_criticality' as tier,
    (bs.tbm_attributes->>'total_monthly_cost')::numeric as monthly_cost,
    bs.operational_status
FROM business_capabilities bc
JOIN service_dependencies sd1 ON sd1.target_id = bc.id AND sd1.target_type = 'business_capability'
JOIN business_services bs ON bs.id = sd1.source_id
ORDER BY bc.name, monthly_cost DESC;
