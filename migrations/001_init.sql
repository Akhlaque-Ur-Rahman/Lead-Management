-- Lead Management System — PostgreSQL schema
-- Database: lms (on shared edunex-postgres)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  logo TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  block_reason TEXT,
  subscription_plan TEXT NOT NULL DEFAULT 'basic'
    CHECK (subscription_plan IN ('basic', 'professional', 'enterprise', 'custom')),
  max_users INTEGER NOT NULL DEFAULT 10,
  monthly_price NUMERIC,
  company_name_custom TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS companies_email_lower_idx ON companies (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS companies_name_lower_idx ON companies (LOWER(name));

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL
    CHECK (role IN ('super_admin', 'platform_admin', 'company_admin', 'team_lead', 'sales_user')),
  role_id SMALLINT NOT NULL CHECK (role_id BETWEEN 1 AND 5),
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deactivated_by_company BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS users_company_id_idx ON users (company_id);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES companies(id),
  cin TEXT NOT NULL DEFAULT '',
  company_name TEXT NOT NULL,
  authorised_capital TEXT,
  paid_up_capital TEXT,
  date_of_incorporation TEXT,
  registered_address TEXT,
  company_email TEXT,
  directors JSONB NOT NULL DEFAULT '[]'::jsonb,
  din TEXT,
  director_first_name TEXT,
  director_last_name TEXT,
  mobile TEXT,
  director_email TEXT,
  status TEXT NOT NULL DEFAULT 'Cold'
    CHECK (status IN ('Hot', 'Warm', 'Cold', 'Converted', 'Lost')),
  is_assigned BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  follow_up_date TEXT,
  next_follow_up_date TEXT,
  notes TEXT,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  invoice_no TEXT,
  project_value TEXT,
  converted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  lost_remark TEXT,
  lost_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  lost_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leads_company_id_created_at_idx ON leads (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_assigned_to_created_at_idx ON leads (assigned_to, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_lost_by_idx ON leads (lost_by);
CREATE INDEX IF NOT EXISTS leads_cin_idx ON leads (cin);
CREATE INDEX IF NOT EXISTS leads_company_email_idx ON leads (company_email);
CREATE INDEX IF NOT EXISTS leads_company_name_idx ON leads (company_name);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT NOT NULL
    CHECK (type IN ('LEAD_UPDATE', 'LEAD_ASSIGN', 'LEAD_DELETE', 'FOLLOWUP_ADD')),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_company_created_at_idx ON events (company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_config (key, value)
VALUES ('globalBranding', '{"systemName": "Lead Management"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
