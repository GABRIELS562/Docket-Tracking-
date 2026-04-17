-- Migration: 009_create_tenants_table.sql
-- Purpose: Create multi-tenant foundation tables
-- Phase 1: Multi-Tenant Foundation

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TENANTS TABLE (Master tenant registry)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Tenant identification
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,

    -- Contact information
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),

    -- Subscription & billing
    subscription_tier VARCHAR(50) NOT NULL DEFAULT 'trial',
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'active',
    max_items INTEGER NOT NULL DEFAULT 1000,
    max_users INTEGER NOT NULL DEFAULT 5,
    max_zones INTEGER NOT NULL DEFAULT 10,
    max_readers INTEGER NOT NULL DEFAULT 5,

    -- Branding
    logo_url VARCHAR(500),
    primary_color VARCHAR(7) DEFAULT '#3B82F6',
    secondary_color VARCHAR(7) DEFAULT '#1E40AF',

    -- Feature flags (JSONB for flexibility)
    features JSONB NOT NULL DEFAULT '{
        "realtime_tracking": true,
        "analytics_dashboard": false,
        "spatial_intelligence": false,
        "digital_twin": false,
        "api_access": false,
        "custom_fields": false,
        "export_reports": false,
        "mobile_app": false
    }'::jsonb,

    -- Configuration (tenant-specific settings)
    settings JSONB NOT NULL DEFAULT '{
        "timezone": "Africa/Johannesburg",
        "date_format": "DD/MM/YYYY",
        "item_number_format": "NNNNNN/YY",
        "reference_id_format": "DD/NN/YY",
        "default_retention_days": 90,
        "alert_email_enabled": true
    }'::jsonb,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Status flags
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trial_ends_at TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT check_subscription_tier CHECK (subscription_tier IN ('trial', 'starter', 'professional', 'enterprise')),
    CONSTRAINT check_subscription_status CHECK (subscription_status IN ('active', 'suspended', 'cancelled', 'trial')),
    CONSTRAINT check_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
    CONSTRAINT check_primary_color_format CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT check_secondary_color_format CHECK (secondary_color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Indexes for tenants
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX idx_tenants_is_active ON tenants(is_active);
CREATE INDEX idx_tenants_created_at ON tenants(created_at);

-- =============================================================================
-- TENANT_USERS TABLE (Users belonging to tenants)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- User identification
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    -- Profile
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    avatar_url VARCHAR(500),
    phone VARCHAR(50),

    -- Role & permissions
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Security
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(45),
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,

    -- MFA (future)
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret VARCHAR(255),

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verified_at TIMESTAMPTZ,

    -- Preferences
    preferences JSONB NOT NULL DEFAULT '{
        "notifications": {
            "email": true,
            "push": false,
            "sms": false
        },
        "ui": {
            "theme": "light",
            "language": "en",
            "timezone": null
        }
    }'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_role CHECK (role IN ('owner', 'admin', 'manager', 'operator', 'viewer')),
    CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email)
);

-- Indexes for tenant_users
CREATE INDEX idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_email ON tenant_users(email);
CREATE INDEX idx_tenant_users_role ON tenant_users(role);
CREATE INDEX idx_tenant_users_is_active ON tenant_users(is_active);
CREATE INDEX idx_tenant_users_last_login ON tenant_users(last_login_at);

-- =============================================================================
-- API_KEYS TABLE (For programmatic access)
-- =============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,

    -- Key identification
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(8) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,

    -- Permissions
    scopes JSONB NOT NULL DEFAULT '["read"]'::jsonb,

    -- Rate limiting
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
    rate_limit_per_hour INTEGER NOT NULL DEFAULT 1000,

    -- Usage tracking
    last_used_at TIMESTAMPTZ,
    last_used_ip VARCHAR(45),
    total_requests BIGINT NOT NULL DEFAULT 0,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT unique_key_name_per_tenant UNIQUE (tenant_id, name)
);

-- Indexes for api_keys
CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);

-- =============================================================================
-- ADD TENANT_ID TO EXISTING TABLES
-- =============================================================================

-- Add tenant_id to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Add tenant_id to zones table
ALTER TABLE zones ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Add tenant_id to readers table
ALTER TABLE readers ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Add foreign key constraints (after default tenant is created)
-- These will be executed after seed data creates default tenant

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenant_users_updated_at ON tenant_users;
CREATE TRIGGER update_tenant_users_updated_at
    BEFORE UPDATE ON tenant_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TENANT ISOLATION POLICIES (Row Level Security)
-- =============================================================================

-- Enable RLS on tenant-scoped tables
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE readers ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies will be created per-table in a separate migration
-- after the application sets up the tenant context properly

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE tenants IS 'Master table for all tenants in the multi-tenant SaaS platform';
COMMENT ON TABLE tenant_users IS 'Users belonging to specific tenants with role-based access';
COMMENT ON TABLE api_keys IS 'API keys for programmatic access to tenant data';

COMMENT ON COLUMN tenants.slug IS 'URL-friendly unique identifier (e.g., acme-corp)';
COMMENT ON COLUMN tenants.features IS 'Feature flags controlling tenant capabilities';
COMMENT ON COLUMN tenants.settings IS 'Tenant-specific configuration settings';
COMMENT ON COLUMN tenant_users.permissions IS 'Fine-grained permissions beyond role';
COMMENT ON COLUMN api_keys.key_hash IS 'Bcrypt hash of the actual API key';
