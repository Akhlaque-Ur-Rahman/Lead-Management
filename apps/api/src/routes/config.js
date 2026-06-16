const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware');

const router = express.Router();

router.get('/branding', requireAuth, async (_req, res) => {
  const result = await query("SELECT value FROM system_config WHERE key = 'globalBranding'");
  const value = result.rows[0]?.value || { systemName: 'Lead Management' };
  res.json({ systemName: value.systemName || 'Lead Management' });
});

router.put('/branding', requireAuth, async (req, res) => {
  const { systemName } = req.body;
  await query(
    `INSERT INTO system_config (key, value, updated_at) VALUES ('globalBranding', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [JSON.stringify({ systemName })]
  );
  res.json({ systemName });
});

module.exports = router;
