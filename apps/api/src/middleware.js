const { verifyToken } = require('./auth');
const { query } = require('./db');
const { mapUserRow } = require('./auth');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = verifyToken(token);
    const result = await query('SELECT * FROM users WHERE id = $1', [payload.sub]);
    if (!result.rows[0] || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    req.user = mapUserRow(result.rows[0]);
    req.token = token;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { requireAuth };
