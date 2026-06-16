const express = require('express');
const { query } = require('../db');
const { hashPassword, mapUserRow } = require('../auth');
const { requireAuth } = require('../middleware');
const {
  ROLE_IDS,
  hasPermission,
  isPlatformRole,
  canManageRole,
  assertCompanyAccess,
  requirePermission,
  requireRoles,
  USER_SELECT,
} = require('../rbac');

const router = express.Router();

router.use(requireAuth);

function usersListSql(user) {
  if (user.role === 'super_admin') {
    return { sql: `SELECT ${USER_SELECT} FROM users ORDER BY created_at DESC`, params: [] };
  }
  if (user.role === 'platform_admin') {
    return {
      sql: `SELECT ${USER_SELECT} FROM users WHERE role != 'super_admin' ORDER BY created_at DESC`,
      params: [],
    };
  }
  if (user.companyId) {
    return {
      sql: `SELECT ${USER_SELECT} FROM users WHERE company_id = $1 ORDER BY created_at DESC`,
      params: [user.companyId],
    };
  }
  return { sql: `SELECT ${USER_SELECT} FROM users WHERE id = $1`, params: [user.id] };
}

router.get('/', requirePermission('MANAGE_USERS'), async (req, res) => {
  const { sql, params } = usersListSql(req.user);
  const result = await query(sql, params);
  res.json({ users: result.rows.map(mapUserRow) });
});

router.post('/', requirePermission('MANAGE_USERS'), async (req, res) => {
  try {
    const { name, email, password, role, companyId } = req.body;
    if (!canManageRole(req.user.role, role)) {
      return res.status(403).json({ error: 'Cannot assign this role' });
    }
    const roleId = ROLE_IDS[role];
    if (!roleId) return res.status(400).json({ error: 'Invalid role' });

    let targetCompanyId = companyId || null;
    if (!isPlatformRole(req.user.role)) {
      targetCompanyId = req.user.companyId;
    }
    if (role !== 'super_admin' && role !== 'platform_admin' && !targetCompanyId) {
      return res.status(400).json({ error: 'companyId required' });
    }

    const normalizedEmail = email.toLowerCase();
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Email is already in use' });
    }
    const passwordHash = await hashPassword(password);
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, role_id, company_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${USER_SELECT}`,
      [name, normalizedEmail, passwordHash, role, roleId, targetCompanyId]
    );
    res.status(201).json({ user: mapUserRow(result.rows[0]) });
  } catch (err) {
    console.error('create user error', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.patch('/:id', requirePermission('MANAGE_USERS'), async (req, res) => {
  try {
    const { id } = req.params;
    const target = await query(`SELECT ${USER_SELECT} FROM users WHERE id = $1`, [id]);
    if (!target.rows[0]) return res.status(404).json({ error: 'User not found' });
    const targetUser = mapUserRow(target.rows[0]);

    if (!isPlatformRole(req.user.role) && targetUser.companyId !== req.user.companyId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (targetUser.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates = req.body;
    const fields = [];
    const values = [];
    let i = 1;

    if (updates.name !== undefined) { fields.push(`name = $${i++}`); values.push(updates.name); }
    if (updates.email !== undefined) { fields.push(`email = $${i++}`); values.push(updates.email.toLowerCase()); }

    if (updates.role !== undefined) {
      if (!canManageRole(req.user.role, updates.role)) {
        return res.status(403).json({ error: 'Cannot assign this role' });
      }
      fields.push(`role = $${i++}`); values.push(updates.role);
      fields.push(`role_id = $${i++}`); values.push(ROLE_IDS[updates.role]);
    }

    if (updates.companyId !== undefined && isPlatformRole(req.user.role)) {
      fields.push(`company_id = $${i++}`); values.push(updates.companyId);
    }

    if (updates.isActive !== undefined) {
      if (req.user.id === id) return res.status(400).json({ error: 'Cannot deactivate yourself' });
      fields.push(`is_active = $${i++}`); values.push(updates.isActive);
    }

    if (updates.deactivatedByCompany !== undefined && isPlatformRole(req.user.role)) {
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
    const result = await query(`SELECT ${USER_SELECT} FROM users WHERE id = $1`, [id]);
    res.json({ user: mapUserRow(result.rows[0]) });
  } catch (err) {
    console.error('update user error', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/:id', requirePermission('MANAGE_USERS'), async (req, res) => {
  if (req.user.id === req.params.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  const target = await query(`SELECT company_id, role FROM users WHERE id = $1`, [req.params.id]);
  if (!target.rows[0]) return res.status(404).json({ error: 'User not found' });
  if (!isPlatformRole(req.user.role) && target.rows[0].company_id !== req.user.companyId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (target.rows[0].role === 'super_admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

router.delete('/by-company/:companyId', requireRoles('super_admin', 'platform_admin'), async (req, res) => {
  await query('DELETE FROM users WHERE company_id = $1', [req.params.companyId]);
  res.json({ success: true });
});

module.exports = router;
