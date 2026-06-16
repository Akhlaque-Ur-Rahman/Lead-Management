const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware');
const { requirePermission } = require('../rbac');

const router = express.Router();

router.get('/branding', requireAuth, async (_req, res) => {
  const result = await query("SELECT value FROM system_config WHERE key = 'globalBranding'");
  const value = result.rows[0]?.value || { systemName: 'Lead Management' };
  res.json({ systemName: value.systemName || 'Lead Management' });
});

router.put('/branding', requireAuth, requirePermission('MANAGE_BRANDING'), async (req, res) => {
  const { systemName } = req.body;
  await query(
    `INSERT INTO system_config (key, value, updated_at) VALUES ('globalBranding', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [JSON.stringify({ systemName })]
  );
  res.json({ systemName });
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

module.exports = router;
