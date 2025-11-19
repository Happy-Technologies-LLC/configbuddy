-- ============================================
-- Metabase Database Initialization
-- ============================================
-- This script creates the Metabase application database
-- and a dedicated user for Metabase.
--
-- Run this script ONCE before starting Metabase for the first time:
--   psql -U postgres -f init-metabase-db.sql
-- ============================================

-- Create metabase database user
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'metabase_user') THEN
    CREATE ROLE metabase_user WITH LOGIN PASSWORD 'metabase_password_change_me';
    RAISE NOTICE 'Created metabase_user role';
  ELSE
    RAISE NOTICE 'metabase_user role already exists';
  END IF;
END
$$;

-- Create metabase database
SELECT 'CREATE DATABASE metabase OWNER metabase_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'metabase')\gexec

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE metabase TO metabase_user;

-- Create grafana database and user (if not already created)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'grafana_user') THEN
    CREATE ROLE grafana_user WITH LOGIN PASSWORD 'grafana_password_change_me';
    RAISE NOTICE 'Created grafana_user role';
  ELSE
    RAISE NOTICE 'grafana_user role already exists';
  END IF;
END
$$;

SELECT 'CREATE DATABASE grafana OWNER grafana_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'grafana')\gexec

GRANT ALL PRIVILEGES ON DATABASE grafana TO grafana_user;

-- Output success message
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Metabase and Grafana databases initialized';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Metabase Database: metabase';
  RAISE NOTICE 'Metabase User: metabase_user';
  RAISE NOTICE 'Grafana Database: grafana';
  RAISE NOTICE 'Grafana User: grafana_user';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Change default passwords in production!';
  RAISE NOTICE 'Set METABASE_DB_PASSWORD and GRAFANA_ADMIN_PASSWORD in .env file';
  RAISE NOTICE '============================================';
END
$$;
