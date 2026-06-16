#!/usr/bin/env node
/**
 * Import firebase-export.json into PostgreSQL (lms database).
 * Usage: DATABASE_URL=... node tools/import-to-postgres.js [--force] [exportFile]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const args = process.argv.slice(2);
const forceTruncate = args.includes('--force');
const exportArg = args.find((a) => a !== '--force');
const EXPORT_FILE = exportArg
  || path.join(__dirname, '../backups/firebase-export.json');

const ROLE_IDS = {
  super_admin: 1,
  platform_admin: 2,
  company_admin: 3,
  team_lead: 4,
  sales_user: 5,
};

const VALID_PLANS = new Set(['basic', 'professional', 'enterprise', 'custom']);
const VALID_STATUSES = new Set(['Hot', 'Warm', 'Cold', 'Converted', 'Lost']);
const VALID_EVENT_TYPES = new Set(['LEAD_UPDATE', 'LEAD_ASSIGN', 'LEAD_DELETE', 'FOLLOWUP_ADD']);

function ts(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val._seconds != null) return new Date(val._seconds * 1000).toISOString();
  return null;
}

function pool() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  return new Pool({ connectionString: url });
}

async function main() {
  if (!fs.existsSync(EXPORT_FILE)) {
    console.error('Export file not found:', EXPORT_FILE);
    console.error('Run: node tools/export-firebase.js first');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));
  const db = pool();
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Clear existing data (keep schema)
    if (!forceTruncate) {
      console.error('Refusing to truncate database without --force flag');
      process.exit(1);
    }
    await client.query('TRUNCATE events, leads, users, companies, system_config RESTART IDENTITY CASCADE');

    const companyIds = new Set();
    const userIds = new Set();

    // --- Companies ---
    let companies = 0;
    for (const c of data.companies || []) {
      const id = c.id || c.companyId;
      if (!id) continue;
      companyIds.add(id);
      const plan = VALID_PLANS.has(c.subscriptionPlan) ? c.subscriptionPlan : 'basic';
      await client.query(
        `INSERT INTO companies (
          id, name, email, phone, address, logo, is_active, is_deleted, block_reason,
          subscription_plan, max_users, monthly_price, company_name_custom, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          id,
          c.name || c.companyName || 'Unnamed',
          c.email || `${id}@placeholder.local`,
          c.phone || '',
          c.address || '',
          c.logo || null,
          c.isActive !== false,
          c.isDeleted === true,
          c.blockReason || null,
          plan,
          c.maxUsers ?? 10,
          c.monthlyPrice ?? null,
          c.companyNameCustom || c.companyName || null,
          ts(c.createdAt) || new Date().toISOString(),
          ts(c.updatedAt) || ts(c.createdAt) || new Date().toISOString(),
        ]
      );
      companies++;
    }
    console.log(`Imported companies: ${companies}`);

    // --- Users ---
    let users = 0;
    for (const u of data.users || []) {
      const id = u.id || u.uid;
      if (!id) continue;
      userIds.add(id);
      const role = u.role || 'sales_user';
      const roleId = u.roleId || ROLE_IDS[role] || 5;
      let companyId = u.companyId || null;
      if (companyId && !companyIds.has(companyId)) companyId = null;

      const passwordHash = u.password || u.password_hash;
      if (!passwordHash) {
        console.warn(`  SKIP user ${id} (${u.email}): no password hash`);
        continue;
      }

      await client.query(
        `INSERT INTO users (
          id, name, email, password_hash, role, role_id, company_id,
          is_active, deactivated_by_company, created_at, updated_at, last_login_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          id,
          u.name || u.displayName || u.email,
          (u.email || '').toLowerCase(),
          passwordHash,
          role,
          roleId,
          companyId,
          u.isActive !== false,
          u.deactivatedByCompany === true,
          ts(u.createdAt) || new Date().toISOString(),
          ts(u.updatedAt) || ts(u.createdAt) || new Date().toISOString(),
          ts(u.lastLoginAt),
        ]
      );
      users++;
    }
    console.log(`Imported users: ${users}`);

    // --- Leads ---
    let leads = 0;
    let leadsSkipped = 0;
    for (const l of data.leads || []) {
      const id = l.id;
      if (!id) continue;
      let companyId = l.companyId;
      if (!companyId || !companyIds.has(companyId)) {
        leadsSkipped++;
        continue;
      }

      const fk = (uid) => (uid && userIds.has(uid) ? uid : null);
      const status = VALID_STATUSES.has(l.status) ? l.status : 'Cold';

      await client.query(
        `INSERT INTO leads (
          id, company_id, cin, company_name, authorised_capital, paid_up_capital,
          date_of_incorporation, registered_address, company_email, directors,
          din, director_first_name, director_last_name, mobile, director_email,
          status, is_assigned, assigned_to, assigned_at, follow_up_date, next_follow_up_date,
          notes, uploaded_by, invoice_no, project_value, converted_by, converted_at,
          lost_remark, lost_by, lost_at, created_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31
        )`,
        [
          id, companyId, l.cin || '', l.companyName || '',
          l.authorisedCapital || null, l.paidUpCapital || null,
          l.dateOfIncorporation || null, l.registeredAddress || null, l.companyEmail || null,
          JSON.stringify(l.directors || []),
          l.din || null, l.directorFirstName || null, l.directorLastName || null,
          l.mobile || null, l.directorEmail || null,
          status, !!l.isAssigned, fk(l.assignedTo), ts(l.assignedAt),
          l.followUpDate || null, l.nextFollowUpDate || null,
          l.notes || null, fk(l.uploadedBy), l.invoiceNo || null, l.projectValue || null,
          fk(l.convertedBy), ts(l.convertedAt),
          l.lostRemark || null, fk(l.lostBy), ts(l.lostAt),
          ts(l.createdAt) || new Date().toISOString(),
        ]
      );
      leads++;
    }
    console.log(`Imported leads: ${leads} (skipped ${leadsSkipped} — missing company)`);

    // --- Events (optional, skip invalid FKs) ---
    let events = 0;
    for (const e of data.events || []) {
      if (!VALID_EVENT_TYPES.has(e.type)) continue;
      if (!e.companyId || !companyIds.has(e.companyId)) continue;
      if (!e.actorId || !userIds.has(e.actorId)) continue;
      await client.query(
        `INSERT INTO events (id, type, company_id, actor_id, payload, created_at)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6)
         ON CONFLICT (id) DO NOTHING`,
        [
          e.id || undefined,
          e.type,
          e.companyId,
          e.actorId,
          JSON.stringify(e.payload || {}),
          ts(e.createdAt) || new Date().toISOString(),
        ]
      );
      events++;
    }
    console.log(`Imported events: ${events}`);

    // --- System config ---
    if (data.systemConfig?.systemName) {
      await client.query(
        `INSERT INTO system_config (key, value, updated_at) VALUES ('globalBranding', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [JSON.stringify({ systemName: data.systemConfig.systemName })]
      );
      console.log(`System name: ${data.systemConfig.systemName}`);
    }

    await client.query('COMMIT');
    console.log('\nImport complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await db.end();
  }
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
