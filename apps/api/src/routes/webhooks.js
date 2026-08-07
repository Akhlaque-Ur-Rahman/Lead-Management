const express = require('express');
const rateLimit = require('express-rate-limit');
const { query } = require('../db');
const { mapLeadRow } = require('../auth');

const router = express.Router();

const COMPANY_ID = process.env.WEBSITE_LEAD_COMPANY_ID || 'CO_20251123_EFQE';
const BOT_USER_ID = process.env.WEBSITE_BOT_USER_ID || null;

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many webhook requests' },
});

function requireWebhookApiKey(req, res, next) {
  const expected = process.env.WEBHOOK_API_KEY;
  if (!expected) {
    console.error('[webhooks] WEBHOOK_API_KEY is not configured');
    return res.status(503).json({ error: 'Webhook not configured' });
  }

  const headerKey = req.get('x-api-key');
  const auth = req.get('authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  const provided = headerKey || bearer;

  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

function splitName(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { firstName: null, lastName: null };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function normalizeMobile(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length >= 10) return digits.slice(-10);
  return digits || null;
}

function buildNotes(payload) {
  const lines = [
    `Source: website_${payload.type || 'contact'}`,
    payload.source ? `Form source: ${payload.source}` : null,
    payload.service ? `Service: ${payload.service}` : null,
    payload.pagePath ? `Page: ${payload.pagePath}` : null,
    payload.message ? `Message: ${payload.message}` : null,
    payload.createdAt ? `Submitted: ${payload.createdAt}` : null,
    payload.externalId ? `EduNex ID: ${payload.externalId}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

async function loadWebsiteLeadSettings(companyId) {
  const key = `websiteLeadSettings:${companyId}`;
  const result = await query('SELECT value FROM system_config WHERE key = $1', [key]);
  const value = result.rows[0]?.value || {};
  return {
    autoAssignEnabled: Boolean(value.autoAssignEnabled),
    autoAssignUserId: value.autoAssignUserId || null,
  };
}

async function resolveAssignee(companyId, settings) {
  if (!settings.autoAssignEnabled || !settings.autoAssignUserId) {
    return { isAssigned: false, assignedTo: null };
  }

  const target = await query(
    `SELECT id, role, company_id, is_active
     FROM users
     WHERE id = $1`,
    [settings.autoAssignUserId]
  );
  const user = target.rows[0];
  if (!user || !user.is_active || user.company_id !== companyId) {
    console.warn('[webhooks] auto-assign user invalid; leaving lead unassigned', {
      userId: settings.autoAssignUserId,
      companyId,
    });
    return { isAssigned: false, assignedTo: null };
  }

  return { isAssigned: true, assignedTo: user.id };
}

/**
 * POST /api/webhooks/website-leads
 * Inbound leads from edunexservices.in (contact + callback forms).
 */
router.post('/website-leads', webhookLimiter, requireWebhookApiKey, async (req, res) => {
  try {
    const payload = req.body || {};
    const type = payload.type === 'callback' ? 'callback' : 'contact';
    const externalId = payload.externalId ? String(payload.externalId).trim() : null;
    const phone = normalizeMobile(payload.phone || payload.normalizedPhone);
    const email = payload.email ? String(payload.email).trim().toLowerCase() : null;
    const companyNameRaw = payload.company ? String(payload.company).trim() : '';
    const fullName = payload.name ? String(payload.name).trim() : '';

    if (type === 'contact' && !fullName && !phone && !email) {
      return res.status(400).json({ error: 'name, phone, or email required' });
    }
    if (type === 'callback' && !phone) {
      return res.status(400).json({ error: 'phone required for callback leads' });
    }

    if (externalId) {
      const existing = await query(
        `SELECT id FROM leads
         WHERE company_id = $1 AND notes LIKE $2
         LIMIT 1`,
        [COMPANY_ID, `%EduNex ID: ${externalId}%`]
      );
      if (existing.rows[0]) {
        return res.status(200).json({
          ok: true,
          duplicate: true,
          leadId: existing.rows[0].id,
        });
      }
    }

    const { firstName, lastName } = splitName(
      fullName || (phone ? `Callback ${phone}` : 'Website Lead')
    );
    const companyName =
      companyNameRaw ||
      fullName ||
      (phone ? `Callback +91${phone}` : 'Website Lead');

    const settings = await loadWebsiteLeadSettings(COMPANY_ID);
    const assignment = await resolveAssignee(COMPANY_ID, settings);
    const notes = buildNotes({ ...payload, type, externalId });

    const directors = [
      {
        id: 'dir-website-1',
        din: '',
        firstName: firstName || 'Lead',
        lastName: lastName || '',
        mobile: phone || '',
        email: email || '',
        followUps: [],
      },
    ];

    const result = await query(
      `INSERT INTO leads (
        company_id, cin, company_name, directors,
        director_first_name, director_last_name, mobile, director_email, company_email,
        status, is_assigned, assigned_to, assigned_at, uploaded_by, notes
      ) VALUES (
        $1, $2, $3, $4::jsonb,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15
      )
      RETURNING *`,
      [
        COMPANY_ID,
        '',
        companyName,
        JSON.stringify(directors),
        firstName,
        lastName,
        phone,
        email,
        email,
        'Warm',
        assignment.isAssigned,
        assignment.assignedTo,
        assignment.isAssigned ? new Date().toISOString() : null,
        BOT_USER_ID,
        notes,
      ]
    );

    const lead = mapLeadRow(result.rows[0]);
    return res.status(201).json({
      ok: true,
      leadId: lead.id,
      assigned: assignment.isAssigned,
      assignedTo: assignment.assignedTo,
    });
  } catch (err) {
    console.error('[webhooks] website-leads error', err);
    return res.status(500).json({ error: 'Failed to import lead' });
  }
});

module.exports = router;
