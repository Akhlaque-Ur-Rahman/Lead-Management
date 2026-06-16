const express = require('express');
const { query } = require('../db');
const { hashPassword, mapUserRow } = require('../auth');
const { requireAuth } = require('../middleware');

const router = express.Router();
const ROLE_IDS = {
  super_admin: 1,
  platform_admin: 2,
  company_admin: 3,
  team_lead: 4,
  sales_user: 5,
};

router.use(requireAuth);

router.get('/', async (_req, res) => {
  const result = await query(
    'SELECT id, name, email, role, role_id, company_id, is_active, deactivated_by_company, created_at, last_login_at FROM users ORDER BY created_at DESC'
  );
  res.json({ users: result.rows.map(mapUserRow) });
});

router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, companyId } = req.body;
    const roleId = ROLE_IDS[role];
    if (!roleId) return res.status(400).json({ error: 'Invalid role' });
    const normalizedEmail = email.toLowerCase();
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Email is already in use' });
    }
    const passwordHash = await hashPassword(password);
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, role_id, company_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, role_id, company_id, is_active, deactivated_by_company, created_at, last_login_at`,
      [name, normalizedEmail, passwordHash, role, roleId, companyId || null]
    );
    res.status(201).json({ user: mapUserRow(result.rows[0]) });
  } catch (err) {
    console.error('create user error', err);
    res.status(500).json({ error: err.message || 'Failed to create user' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const fields = [];
    const values = [];
    let i = 1;
    if (updates.name !== undefined) { fields.push(`name = $${i++}`); values.push(updates.name); }
    if (updates.email !== undefined) { fields.push(`email = $${i++}`); values.push(updates.email.toLowerCase()); }
    if (updates.role !== undefined) {
      fields.push(`role = $${i++}`); values.push(updates.role);
      fields.push(`role_id = $${i++}`); values.push(ROLE_IDS[updates.role]);
    }
    if (updates.companyId !== undefined) { fields.push(`company_id = $${i++}`); values.push(updates.companyId); }
    if (updates.isActive !== undefined) { fields.push(`is_active = $${i++}`); values.push(updates.isActive); }
    if (updates.deactivatedByCompany !== undefined) {
      fields.push(`deactivated_by_company = $${i++}`);
      values.push(updates.deactivatedByCompany);
    }
    if (updates.password) {
      fields.push(`password_hash = $${i++}`);
      values.push(await hashPassword(updates.password));
    }
    if (!fields.length) return res.status(400).json({ error: 'No updates provided' });
    fields.push('updated_at = NOW()');
    values.push(id);
    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`, values);
    const result = await query(
      'SELECT id, name, email, role, role_id, company_id, is_active, deactivated_by_company, created_at, last_login_at FROM users WHERE id = $1',
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: mapUserRow(result.rows[0]) });
  } catch (err) {
    console.error('update user error', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/:id', async (req, res) => {
  await query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

router.delete('/by-company/:companyId', async (req, res) => {
  await query('DELETE FROM users WHERE company_id = $1', [req.params.companyId]);
  res.json({ success: true });
});

module.exports = router;
