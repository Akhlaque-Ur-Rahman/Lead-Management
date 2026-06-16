const express = require('express');
const { query } = require('../db');
const { mapLeadRow, leadToDb } = require('../auth');
const { requireAuth } = require('../middleware');

const router = express.Router();
const MAX_LEADS = 5000;

router.use(requireAuth);

function buildLeadsSql(user, view, limitVal = MAX_LEADS) {
  if (user.role === 'super_admin' || user.role === 'platform_admin') {
    return {
      sql: 'SELECT * FROM leads ORDER BY created_at DESC LIMIT $1',
      params: [limitVal],
    };
  }
  if (user.role === 'sales_user') {
    if (view === 'lost') {
      return {
        sql: 'SELECT * FROM leads WHERE lost_by = $1 LIMIT $2',
        params: [user.id, limitVal],
      };
    }
    return {
      sql: 'SELECT * FROM leads WHERE assigned_to = $1 ORDER BY created_at DESC LIMIT $2',
      params: [user.id, limitVal],
    };
  }
  if (user.companyId) {
    return {
      sql: 'SELECT * FROM leads WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2',
      params: [user.companyId, limitVal],
    };
  }
  return { sql: 'SELECT * FROM leads LIMIT 10', params: [] };
}

router.get('/', async (req, res) => {
  const view = req.query.view || 'pool';
  const limitVal = Number(req.query.limit) || MAX_LEADS;
  const { sql, params } = buildLeadsSql(req.user, view, limitVal);
  const result = await query(sql, params);
  res.json({ leads: result.rows.map(mapLeadRow) });
});

router.get('/:id', async (req, res) => {
  const result = await query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Lead not found' });
  res.json({ lead: mapLeadRow(result.rows[0]) });
});

router.post('/check-duplicates', async (req, res) => {
  const { field, values } = req.body;
  const colMap = {
    cin: 'cin', companyEmail: 'company_email', companyName: 'company_name',
    din: 'din', mobile: 'mobile',
  };
  const col = colMap[field];
  if (!col || !values?.length) return res.json({ duplicates: [] });
  const result = await query(
    `SELECT ${col} AS value FROM leads WHERE ${col} = ANY($1::text[])`,
    [values]
  );
  res.json({ duplicates: result.rows.map((r) => r.value) });
});

router.post('/check-duplicates-scoped', async (req, res) => {
  const { companyId, cins } = req.body;
  if (!companyId || !cins?.length) return res.json({ duplicates: [] });
  const result = await query(
    'SELECT cin FROM leads WHERE company_id = $1 AND cin = ANY($2::text[])',
    [companyId, cins]
  );
  res.json({ duplicates: result.rows.map((r) => r.cin) });
});

router.post('/', async (req, res) => {
  try {
    const lead = req.body;
    const companyId = lead.companyId || req.user.companyId;
    const result = await query(
      `INSERT INTO leads (
        company_id, cin, company_name, authorised_capital, paid_up_capital,
        date_of_incorporation, registered_address, company_email, directors,
        din, director_first_name, director_last_name, mobile, director_email,
        status, is_assigned, assigned_to, uploaded_by, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *`,
      [
        companyId, lead.cin || '', lead.companyName, lead.authorisedCapital || null,
        lead.paidUpCapital || null, lead.dateOfIncorporation || null,
        lead.registeredAddress || null, lead.companyEmail || null,
        JSON.stringify(lead.directors || []), lead.din || null,
        lead.directorFirstName || null, lead.directorLastName || null,
        lead.mobile || null, lead.directorEmail || null,
        lead.status || 'Cold', !!lead.isAssigned, lead.assignedTo || null,
        lead.uploadedBy || req.user.id, lead.notes || null,
      ]
    );
    res.status(201).json({ lead: mapLeadRow(result.rows[0]) });
  } catch (err) {
    console.error('create lead error', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/batch', async (req, res) => {
  const leads = req.body.leads || [];
  let count = 0;
  for (const lead of leads) {
    const companyId = lead.companyId || req.user.companyId;
    await query(
      `INSERT INTO leads (company_id, cin, company_name, directors, status, is_assigned, assigned_to, uploaded_by, notes,
        authorised_capital, paid_up_capital, date_of_incorporation, registered_address, company_email,
        din, director_first_name, director_last_name, mobile, director_email)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [
        companyId, lead.cin || '', lead.companyName, JSON.stringify(lead.directors || []),
        lead.status || 'Cold', !!lead.isAssigned, lead.assignedTo || null,
        lead.uploadedBy || req.user.id, lead.notes || null,
        lead.authorisedCapital || null, lead.paidUpCapital || null,
        lead.dateOfIncorporation || null, lead.registeredAddress || null, lead.companyEmail || null,
        lead.din || null, lead.directorFirstName || null, lead.directorLastName || null,
        lead.mobile || null, lead.directorEmail || null,
      ]
    );
    count++;
  }
  res.json({ count });
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.directors) {
      const existing = await query('SELECT * FROM leads WHERE id = $1', [id]);
      if (!existing.rows[0]) return res.status(404).json({ error: 'Lead not found' });
      const current = mapLeadRow(existing.rows[0]);
      if (req.user.role === 'sales_user' && current.assignedTo !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      const currentDirectors = current.directors || [];
      const mergedDirectors = updates.directors.map((formDir) => {
        const dbDir = currentDirectors.find((d) => d.id === formDir.id);
        return dbDir ? { ...formDir, followUps: dbDir.followUps || [] } : formDir;
      });
      updates.directors = mergedDirectors;
    }

    const dbFields = leadToDb(updates);
    const cols = Object.keys(dbFields);
    if (!cols.length) return res.status(400).json({ error: 'No updates' });
    const sets = cols.map((c, i) => `${c} = $${i + 1}`);
    const values = cols.map((c) => dbFields[c]);
    values.push(id);
    await query(`UPDATE leads SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
    const result = await query('SELECT * FROM leads WHERE id = $1', [id]);
    res.json({ lead: mapLeadRow(result.rows[0]) });
  } catch (err) {
    console.error('update lead error', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/assign', async (req, res) => {
  const { userId } = req.body;
  await query(
    'UPDATE leads SET is_assigned = TRUE, assigned_to = $1, assigned_at = NOW() WHERE id = $2',
    [userId, req.params.id]
  );
  res.json({ success: true });
});

router.post('/:id/unassign', async (req, res) => {
  await query(
    'UPDATE leads SET is_assigned = FALSE, assigned_to = NULL, assigned_at = NULL WHERE id = $1',
    [req.params.id]
  );
  res.json({ success: true });
});

router.post('/:id/follow-up', async (req, res) => {
  const { followUp, leadUpdates } = req.body;
  const leadResult = await query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
  if (!leadResult.rows[0]) return res.status(404).json({ error: 'Lead not found' });
  const leadData = mapLeadRow(leadResult.rows[0]);
  if (!leadData.isAssigned) return res.status(400).json({ error: 'Cannot add follow-up to unassigned lead' });

  const newFollowUp = {
    ...followUp,
    id: `fu-${Date.now()}`,
    createdAt: new Date().toISOString(),
    createdBy: req.user.id,
    status: 'active',
  };

  const updatedDirectors = leadData.directors.map((d) => {
    if (d.id === followUp.talkedToId) {
      const updatedFollowUps = (d.followUps || []).map((f) =>
        !f.status || f.status === 'active' ? { ...f, status: 'updated' } : f
      );
      return { ...d, followUps: [...updatedFollowUps, newFollowUp] };
    }
    const updatedFollowUps = (d.followUps || []).map((f) =>
      !f.status || f.status === 'active' ? { ...f, status: 'updated' } : f
    );
    return { ...d, followUps: updatedFollowUps };
  });

  const payload = { ...leadUpdates, directors: updatedDirectors };
  if (leadUpdates?.status === 'Lost') {
    payload.lostAt = new Date().toISOString();
    payload.lostBy = req.user.id;
  }
  const dbFields = leadToDb(payload);
  const cols = Object.keys(dbFields);
  const sets = cols.map((c, i) => `${c} = $${i + 1}`);
  const values = cols.map((c) => dbFields[c]);
  values.push(req.params.id);
  await query(`UPDATE leads SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
  res.json({ success: true });
});

router.post('/:id/follow-up/update', async (req, res) => {
  const { followUp, leadUpdates } = req.body;
  const leadResult = await query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
  if (!leadResult.rows[0]) return res.status(404).json({ error: 'Lead not found' });
  const leadData = mapLeadRow(leadResult.rows[0]);

  const updatedDirectors = leadData.directors.map((d) => ({
    ...d,
    followUps: (d.followUps || []).map((f) => (f.id === followUp.id ? { ...followUp } : f)),
  }));

  const payload = { ...leadUpdates, directors: updatedDirectors };
  const dbFields = leadToDb(payload);
  const cols = Object.keys(dbFields);
  const sets = cols.map((c, i) => `${c} = $${i + 1}`);
  const values = cols.map((c) => dbFields[c]);
  values.push(req.params.id);
  await query(`UPDATE leads SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
  res.json({ success: true });
});

router.post('/:id/mark-lost', async (req, res) => {
  const { remark, userId } = req.body;
  await query(
    `UPDATE leads SET status = 'Lost', lost_remark = $1, lost_by = $2, lost_at = NOW() WHERE id = $3`,
    [remark, userId, req.params.id]
  );
  res.json({ success: true });
});

router.post('/:id/restore-lost', async (req, res) => {
  await query(
    `UPDATE leads SET status = 'Cold', lost_remark = NULL, lost_by = NULL, lost_at = NULL WHERE id = $1`,
    [req.params.id]
  );
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  await query('DELETE FROM leads WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

router.post('/:id/mark-converted', async (req, res) => {
  const { invoiceNo, projectValue, userId } = req.body;
  await query(
    `UPDATE leads SET status = 'Converted', invoice_no = $1, project_value = $2,
     converted_by = $3, converted_at = NOW() WHERE id = $4`,
    [invoiceNo, projectValue, userId, req.params.id]
  );
  res.json({ success: true });
});

module.exports = router;
