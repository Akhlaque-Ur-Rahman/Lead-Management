require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const express = require('express');
const cors = require('cors');
const { query } = require('./db');
const { hashPassword } = require('./auth');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const companiesRoutes = require('./routes/companies');
const leadsRoutes = require('./routes/leads');
const eventsRoutes = require('./routes/events');
const configRoutes = require('./routes/config');

const app = express();
const PORT = process.env.API_PORT || 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'error' });
  }
});
app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'postgresql' });
  } catch {
    res.status(503).json({ status: 'error' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/config', configRoutes);

async function ensureSeedAdmin() {
  const existing = await query('SELECT id FROM users LIMIT 1');
  if (existing.rows.length) return;
  const passwordHash = await hashPassword('admin123');
  await query(
    `INSERT INTO users (name, email, password_hash, role, role_id)
     VALUES ('Super Admin', 'admin@lms.local', $1, 'super_admin', 1)`,
    [passwordHash]
  );
  console.log('Seeded default super admin: admin@lms.local / admin123');
}

async function start() {
  await ensureSeedAdmin();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LMS API listening on :${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start API', err);
  process.exit(1);
});
