const express = require('express');
const { query } = require('../db');
const { comparePassword, signToken, mapUserRow } = require('../auth');
const { requireAuth } = require('../middleware');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const normalizedEmail = email.toLowerCase();
    const result = await query('SELECT * FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    const row = result.rows[0];
    if (!row) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const valid = await comparePassword(password, row.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!row.is_active) {
      return res.status(403).json({ error: 'This account has been deactivated' });
    }
    if (row.company_id) {
      const company = await query('SELECT is_active FROM companies WHERE id = $1', [row.company_id]);
      if (company.rows[0] && !company.rows[0].is_active) {
        return res.status(403).json({ error: 'Your company account is inactive' });
      }
    }
    await query('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [row.id]);
    const user = mapUserRow(row);
    const token = signToken(user);
    res.json({ user, token });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', requireAuth, (_req, res) => {
  res.json({ success: true });
});

module.exports = router;
