const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/latest', async (req, res) => {
  const companyId = req.user.companyId;
  if (!companyId) return res.json({ event: null });
  const since = req.query.since;
  let result;
  if (since) {
    result = await query(
      `SELECT id, type, company_id, actor_id, payload, created_at
       FROM events WHERE company_id = $1 AND created_at > $2
       ORDER BY created_at DESC LIMIT 1`,
      [companyId, since]
    );
  } else {
    result = await query(
      `SELECT id, type, company_id, actor_id, payload, created_at
       FROM events WHERE company_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [companyId]
    );
  }
  const row = result.rows[0];
  if (!row) return res.json({ event: null });
  res.json({
    event: {
      id: row.id,
      type: row.type,
      companyId: row.company_id,
      actorId: row.actor_id,
      payload: row.payload,
      createdAt: row.created_at?.toISOString?.(),
    },
  });
});

router.post('/', async (req, res) => {
  const { type, payload } = req.body;
  const companyId = req.user.companyId;
  if (!companyId) return res.json({ success: true });
  const result = await query(
    `INSERT INTO events (type, company_id, actor_id, payload) VALUES ($1,$2,$3,$4) RETURNING id`,
    [type, companyId, req.user.id, JSON.stringify(payload || {})]
  );
  res.status(201).json({ id: result.rows[0].id });
});

module.exports = router;
