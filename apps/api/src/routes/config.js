const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware');
const { requirePermission } = require('../rbac');

const router = express.Router();

router.get('/branding/public', async (_req, res) => {
  const result = await query("SELECT value FROM system_config WHERE key = 'globalBranding'");
  const value = result.rows[0]?.value || { systemName: 'Lead Management' };
  res.json({
    systemName: value.systemName || 'Lead Management',
    logoUrl: value.logoUrl || null,
  });
});

router.get('/branding', requireAuth, async (_req, res) => {
  const result = await query("SELECT value FROM system_config WHERE key = 'globalBranding'");
  const value = result.rows[0]?.value || { systemName: 'Lead Management' };
  res.json({
    systemName: value.systemName || 'Lead Management',
    logoUrl: value.logoUrl || null,
  });
});

router.put('/branding', requireAuth, requirePermission('MANAGE_BRANDING'), async (req, res) => {
  const { systemName, logoUrl } = req.body;
  const existing = await query("SELECT value FROM system_config WHERE key = 'globalBranding'");
  const current = existing.rows[0]?.value || {};
  const next = {
    systemName: systemName ?? current.systemName ?? 'Lead Management',
    logoUrl: logoUrl !== undefined ? logoUrl : (current.logoUrl ?? null),
  };
  await query(
    `INSERT INTO system_config (key, value, updated_at) VALUES ('globalBranding', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [JSON.stringify(next)]
  );
  res.json(next);
});

router.get('/field-config/:companyId', requireAuth, async (req, res) => {
  const { assertCompanyAccess } = require('../rbac');
  if (!assertCompanyAccess(req.user, req.params.companyId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const key = `fieldConfig:${req.params.companyId}`;
  const result = await query('SELECT value FROM system_config WHERE key = $1', [key]);
  res.json({ fieldConfigs: result.rows[0]?.value || null });
});

router.put('/field-config/:companyId', requireAuth, async (req, res) => {
  const { assertCompanyAccess, hasPermission } = require('../rbac');
  if (!assertCompanyAccess(req.user, req.params.companyId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!hasPermission(req.user.role, 'MANAGE_SETTINGS')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const key = `fieldConfig:${req.params.companyId}`;
  await query(
    `INSERT INTO system_config (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, JSON.stringify(req.body.fieldConfigs)]
  );
  res.json({ success: true });
});

router.get('/plan-pricing', requireAuth, requirePermission('MANAGE_SUBSCRIPTION_PLANS'), async (_req, res) => {
  const result = await query("SELECT value FROM system_config WHERE key = 'planPricing'");
  res.json({ planPricing: result.rows[0]?.value || null });
});

router.put('/plan-pricing', requireAuth, requirePermission('MANAGE_SUBSCRIPTION_PLANS'), async (req, res) => {
  await query(
    `INSERT INTO system_config (key, value, updated_at) VALUES ('planPricing', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [JSON.stringify(req.body.planPricing)]
  );
  res.json({ success: true });
});

router.get('/website-lead-settings/:companyId', requireAuth, async (req, res) => {
  const { assertCompanyAccess, hasPermission } = require('../rbac');
  if (!assertCompanyAccess(req.user, req.params.companyId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!hasPermission(req.user.role, 'MANAGE_SETTINGS')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const key = `websiteLeadSettings:${req.params.companyId}`;
  const result = await query('SELECT value FROM system_config WHERE key = $1', [key]);
  const value = result.rows[0]?.value || {};
  res.json({
    autoAssignEnabled: Boolean(value.autoAssignEnabled),
    autoAssignUserId: value.autoAssignUserId || null,
  });
});

router.put('/website-lead-settings/:companyId', requireAuth, async (req, res) => {
  const { assertCompanyAccess, hasPermission } = require('../rbac');
  if (!assertCompanyAccess(req.user, req.params.companyId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!hasPermission(req.user.role, 'MANAGE_SETTINGS')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const autoAssignEnabled = Boolean(req.body.autoAssignEnabled);
  const autoAssignUserId = req.body.autoAssignUserId
    ? String(req.body.autoAssignUserId).trim()
    : null;

  if (autoAssignEnabled) {
    if (!autoAssignUserId) {
      return res.status(400).json({ error: 'Select a user for auto-assign' });
    }
    const target = await query(
      'SELECT id, company_id, is_active, role FROM users WHERE id = $1',
      [autoAssignUserId]
    );
    const user = target.rows[0];
    if (!user || !user.is_active || user.company_id !== req.params.companyId) {
      return res.status(400).json({ error: 'Auto-assign user must be an active user in this company' });
    }
    if (!['company_admin', 'team_lead', 'sales_user'].includes(user.role)) {
      return res.status(400).json({ error: 'Auto-assign user role not allowed' });
    }
  }

  const next = {
    autoAssignEnabled,
    autoAssignUserId: autoAssignEnabled ? autoAssignUserId : null,
  };
  const key = `websiteLeadSettings:${req.params.companyId}`;
  await query(
    `INSERT INTO system_config (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, JSON.stringify(next)]
  );
  res.json(next);
});

module.exports = router;
