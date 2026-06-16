const express = require('express');
const { query } = require('../db');
const { mapCompanyRow } = require('../auth');
const { requireAuth } = require('../middleware');

const router = express.Router();

function generateCompanyId() {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CO_${dateStr}_${randomStr}`;
}

router.use(requireAuth);

router.get('/', async (_req, res) => {
  const result = await query(
    'SELECT * FROM companies WHERE is_deleted = FALSE ORDER BY created_at DESC'
  );
  res.json({ companies: result.rows.map(mapCompanyRow) });
});

router.get('/:id', async (req, res) => {
  const result = await query('SELECT * FROM companies WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Company not found' });
  res.json({ company: mapCompanyRow(result.rows[0]) });
});

router.post('/', async (req, res) => {
  try {
    const c = req.body;
    const id = generateCompanyId();
    const dupName = await query('SELECT id FROM companies WHERE LOWER(name) = LOWER($1) AND is_deleted = FALSE', [c.name]);
    if (dupName.rows.length) return res.status(409).json({ error: 'Company name already exists' });
    const dupEmail = await query('SELECT id FROM companies WHERE LOWER(email) = LOWER($1) AND is_deleted = FALSE', [c.email]);
    if (dupEmail.rows.length) return res.status(409).json({ error: 'Company email already exists' });
    const result = await query(
      `INSERT INTO companies (id, name, email, phone, address, logo, is_active, subscription_plan, max_users, monthly_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id, c.name, c.email, c.phone || '', c.address || '', c.logo || null, c.isActive !== false,
        c.subscriptionPlan || 'basic', c.maxUsers || 10, c.monthlyPrice || null]
    );
    res.status(201).json({ company: mapCompanyRow(result.rows[0]) });
  } catch (err) {
    console.error('create company error', err);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const u = req.body;
    const fields = [];
    const values = [];
    let i = 1;
    const map = {
      name: 'name', email: 'email', phone: 'phone', address: 'address', logo: 'logo',
      isActive: 'is_active', isDeleted: 'is_deleted', blockReason: 'block_reason',
      subscriptionPlan: 'subscription_plan', maxUsers: 'max_users', monthlyPrice: 'monthly_price',
      companyNameCustom: 'company_name_custom',
    };
    for (const [key, col] of Object.entries(map)) {
      if (u[key] !== undefined) { fields.push(`${col} = $${i++}`); values.push(u[key]); }
    }
    if (!fields.length) return res.status(400).json({ error: 'No updates' });
    fields.push('updated_at = NOW()');
    values.push(id);
    await query(`UPDATE companies SET ${fields.join(', ')} WHERE id = $${i}`, values);

    if (u.isActive === false) {
      await query(
        'UPDATE users SET is_active = FALSE, deactivated_by_company = TRUE, updated_at = NOW() WHERE company_id = $1',
        [id]
      );
    } else if (u.isActive === true) {
      await query(
        `UPDATE users SET is_active = TRUE, deactivated_by_company = FALSE, updated_at = NOW()
         WHERE company_id = $1 AND deactivated_by_company = TRUE`,
        [id]
      );
    }

    const result = await query('SELECT * FROM companies WHERE id = $1', [id]);
    res.json({ company: mapCompanyRow(result.rows[0]) });
  } catch (err) {
    console.error('update company error', err);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

router.delete('/:id', async (req, res) => {
  await query('DELETE FROM companies WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

router.post('/:id/soft-delete', async (req, res) => {
  await query('UPDATE companies SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
