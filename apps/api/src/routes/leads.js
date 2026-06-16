const express = require('express');
const { query } = require('../db');
const { mapLeadRow, leadToDb } = require('../auth');
const { requireAuth } = require('../middleware');
const {
  hasPermission,
  isPlatformRole,
  canAssignToUser,
  assertLeadAccess,
  assertCompanyAccess,
  resolveCompanyId,
  stripFinancialFields,
  leadToDbSafe,
  requirePermission,
} = require('../rbac');

const router = express.Router();
const MAX_LEADS = 5000;
const MAX_BATCH = 500;
const IMPORT_STATUSES = new Set(['Hot', 'Warm', 'Cold']);

router.use(requireAuth);

function clampLimit(raw) {
  const n = Number(raw) || MAX_LEADS;
  return Math.min(Math.max(1, n), MAX_LEADS);
}

function buildLeadsSql(user, view, limitVal = MAX_LEADS) {
  if (isPlatformRole(user.role)) {
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
  return { sql: 'SELECT * FROM leads WHERE FALSE', params: [] };
}

router.get('/', async (req, res) => {
  const view = req.query.view || 'pool';
  const limitVal = clampLimit(req.query.limit);
  const { sql, params } = buildLeadsSql(req.user, view, limitVal);
  const result = await query(sql, params);
  const leads = result.rows.map(mapLeadRow).map((l) => stripFinancialFields(l, req.user));
  res.json({ leads });
});

router.get('/:id', async (req, res) => {
  const access = await assertLeadAccess(req.user, req.params.id, 'read');
  if (access.status) return res.status(access.status).json({ error: access.error });
  res.json({ lead: stripFinancialFields(access.lead, req.user) });
});

router.post('/check-duplicates', requirePermission('IMPORT_LEADS'), async (req, res) => {
  const companyId = resolveCompanyId(req.user, req.body.companyId);
  if (!companyId) return res.status(400).json({ error: 'companyId required' });

  const { field, values } = req.body;
  const colMap = {
    cin: 'cin', companyEmail: 'company_email', companyName: 'company_name',
    din: 'din', mobile: 'mobile',
  };
  const col = colMap[field];
  if (!col || !values?.length) return res.json({ duplicates: [] });
  const result = await query(
    `SELECT ${col} AS value FROM leads WHERE company_id = $1 AND ${col} = ANY($2::text[])`,
    [companyId, values]
  );
  res.json({ duplicates: result.rows.map((r) => r.value) });
});

router.post('/check-duplicates-scoped', requirePermission('IMPORT_LEADS'), async (req, res) => {
  const companyId = resolveCompanyId(req.user, req.body.companyId);
  const { cins } = req.body;
  if (!companyId || !cins?.length) return res.json({ duplicates: [] });
  if (!assertCompanyAccess(req.user, companyId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const result = await query(
    'SELECT cin FROM leads WHERE company_id = $1 AND cin = ANY($2::text[])',
    [companyId, cins]
  );
  res.json({ duplicates: result.rows.map((r) => r.cin) });
});

router.post('/', async (req, res) => {
  try {
    if (!hasPermission(req.user.role, 'IMPORT_LEADS') && !isPlatformRole(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const lead = req.body;
    const companyId = resolveCompanyId(req.user, lead.companyId);
    if (!companyId) return res.status(400).json({ error: 'companyId required' });
    if (!assertCompanyAccess(req.user, companyId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const status = lead.status || 'Cold';
    if (!IMPORT_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Invalid status for new lead' });
    }

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
        status, !!lead.isAssigned, lead.assignedTo || null,
        req.user.id, lead.notes || null,
      ]
    );
    res.status(201).json({ lead: stripFinancialFields(mapLeadRow(result.rows[0]), req.user) });
  } catch (err) {
    console.error('create lead error', err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

router.post('/batch', async (req, res) => {
  if (!hasPermission(req.user.role, 'IMPORT_LEADS') && !isPlatformRole(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const leads = req.body.leads || [];
  if (leads.length > MAX_BATCH) {
    return res.status(400).json({ error: `Batch limit is ${MAX_BATCH} leads` });
  }

  let count = 0;
  for (const lead of leads) {
    const companyId = resolveCompanyId(req.user, lead.companyId);
    if (!companyId || !assertCompanyAccess(req.user, companyId)) continue;

    const status = lead.status || 'Cold';
    if (!IMPORT_STATUSES.has(status)) continue;

    await query(
      `INSERT INTO leads (company_id, cin, company_name, directors, status, is_assigned, assigned_to, uploaded_by, notes,
        authorised_capital, paid_up_capital, date_of_incorporation, registered_address, company_email,
        din, director_first_name, director_last_name, mobile, director_email)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [
        companyId, lead.cin || '', lead.companyName, JSON.stringify(lead.directors || []),
        status, false, null,
        req.user.id, lead.notes || null,
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
    const access = await assertLeadAccess(req.user, req.params.id, 'write');
    if (access.status) return res.status(access.status).json({ error: access.error });

    const updates = { ...req.body };
    const isAssignedSalesUser = req.user.role === 'sales_user';

    if (updates.directors) {
      const current = access.lead;
      const currentDirectors = current.directors || [];
      updates.directors = updates.directors.map((formDir) => {
        const dbDir = currentDirectors.find((d) => d.id === formDir.id);
        return dbDir ? { ...formDir, followUps: dbDir.followUps || [] } : formDir;
      });
    }

    const safe = leadToDbSafe(updates, req.user, { isAssignedSalesUser });
    const dbFields = leadToDb(safe);
    const cols = Object.keys(dbFields);
    if (!cols.length) return res.status(400).json({ error: 'No updates' });
    const sets = cols.map((c, i) => `${c} = $${i + 1}`);
    const values = cols.map((c) => dbFields[c]);
    values.push(req.params.id);
    await query(`UPDATE leads SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
    const result = await query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    res.json({ lead: stripFinancialFields(mapLeadRow(result.rows[0]), req.user) });
  } catch (err) {
    console.error('update lead error', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

router.post('/:id/assign', async (req, res) => {
  if (!hasPermission(req.user.role, 'ASSIGN_LEADS')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const access = await assertLeadAccess(req.user, req.params.id, 'assign');
  if (access.status) return res.status(access.status).json({ error: access.error });

  const { userId } = req.body;
  const target = await query('SELECT role, company_id FROM users WHERE id = $1', [userId]);
  if (!target.rows[0]) return res.status(400).json({ error: 'Invalid user' });
  if (access.row.company_id !== target.rows[0].company_id) {
    return res.status(400).json({ error: 'User not in lead company' });
  }
  if (!canAssignToUser(req.user.role, target.rows[0].role)) {
    return res.status(403).json({ error: 'Cannot assign to this user' });
  }

  await query(
    'UPDATE leads SET is_assigned = TRUE, assigned_to = $1, assigned_at = NOW() WHERE id = $2',
    [userId, req.params.id]
  );
  res.json({ success: true });
});

router.post('/:id/unassign', async (req, res) => {
  if (!hasPermission(req.user.role, 'ASSIGN_LEADS')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const access = await assertLeadAccess(req.user, req.params.id, 'assign');
  if (access.status) return res.status(access.status).json({ error: access.error });

  await query(
    'UPDATE leads SET is_assigned = FALSE, assigned_to = NULL, assigned_at = NULL WHERE id = $1',
    [req.params.id]
  );
  res.json({ success: true });
});

router.post('/:id/follow-up', async (req, res) => {
  const access = await assertLeadAccess(req.user, req.params.id, 'write');
  if (access.status) return res.status(access.status).json({ error: access.error });

  const leadData = access.lead;
  if (!leadData.isAssigned) return res.status(400).json({ error: 'Cannot add follow-up to unassigned lead' });

  const { followUp, leadUpdates } = req.body;
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

  const payload = leadToDbSafe({ ...leadUpdates, directors: updatedDirectors }, req.user, {
    isAssignedSalesUser: req.user.role === 'sales_user',
  });
  if (leadUpdates?.status === 'Lost') {
    payload.lostAt = new Date().toISOString();
    payload.lostBy = req.user.id;
    payload.status = 'Lost';
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
  const access = await assertLeadAccess(req.user, req.params.id, 'write');
  if (access.status) return res.status(access.status).json({ error: access.error });

  const { followUp, leadUpdates } = req.body;
  const updatedDirectors = access.lead.directors.map((d) => ({
    ...d,
    followUps: (d.followUps || []).map((f) => (f.id === followUp.id ? { ...followUp } : f)),
  }));

  const payload = leadToDbSafe({ ...leadUpdates, directors: updatedDirectors }, req.user, {
    isAssignedSalesUser: req.user.role === 'sales_user',
  });
  const dbFields = leadToDb(payload);
  const cols = Object.keys(dbFields);
  const sets = cols.map((c, i) => `${c} = $${i + 1}`);
  const values = cols.map((c) => dbFields[c]);
  values.push(req.params.id);
  await query(`UPDATE leads SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
  res.json({ success: true });
});

router.post('/:id/mark-lost', async (req, res) => {
  const access = await assertLeadAccess(req.user, req.params.id, 'write');
  if (access.status) return res.status(access.status).json({ error: access.error });

  const { remark } = req.body;
  await query(
    `UPDATE leads SET status = 'Lost', lost_remark = $1, lost_by = $2, lost_at = NOW() WHERE id = $3`,
    [remark, req.user.id, req.params.id]
  );
  res.json({ success: true });
});

router.post('/:id/restore-lost', async (req, res) => {
  if (!hasPermission(req.user.role, 'RESTORE_LOST_LEADS')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const access = await assertLeadAccess(req.user, req.params.id, 'write');
  if (access.status) return res.status(access.status).json({ error: access.error });

  await query(
    `UPDATE leads SET status = 'Cold', lost_remark = NULL, lost_by = NULL, lost_at = NULL WHERE id = $1`,
    [req.params.id]
  );
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  if (!hasPermission(req.user.role, 'DELETE_LOST_LEADS')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const access = await assertLeadAccess(req.user, req.params.id, 'write');
  if (access.status) return res.status(access.status).json({ error: access.error });
  if (access.lead.status !== 'Lost') {
    return res.status(400).json({ error: 'Only lost leads can be permanently deleted' });
  }

  await query('DELETE FROM leads WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

router.post('/:id/mark-converted', async (req, res) => {
  const access = await assertLeadAccess(req.user, req.params.id, 'write');
  if (access.status) return res.status(access.status).json({ error: access.error });

  const { invoiceNo, projectValue } = req.body;
  await query(
    `UPDATE leads SET status = 'Converted', invoice_no = $1, project_value = $2,
     converted_by = $3, converted_at = NOW() WHERE id = $4`,
    [invoiceNo || null, projectValue || null, req.user.id, req.params.id]
  );
  res.json({ success: true });
});

module.exports = router;
