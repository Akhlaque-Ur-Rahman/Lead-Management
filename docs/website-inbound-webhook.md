# Website inbound leads (edunexservices.in)

**Date:** 2026-08-07

Website contact + callback forms on **edunexservices.in** create LMS leads via a dedicated inbound webhook (no browser JWT).

---

## Flow

```
edunexservices.in form
  → EduNex_Services API (Postgres insert + SMTP email)
  → POST /api/webhooks/website-leads (X-API-Key)
  → LMS lead (status Warm, uploaded_by = Website Inbound Bot)
```

Default assignment: **unassigned** (Lead Pool). Optional auto-assign is configured in Settings.

---

## API

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/webhooks/website-leads` | `X-API-Key` or `Authorization: Bearer <WEBHOOK_API_KEY>` |

**Env (lms-api):**

| Variable | Purpose |
|----------|---------|
| `WEBHOOK_API_KEY` | Shared secret with EduNex_Services |
| `WEBSITE_LEAD_COMPANY_ID` | Target tenant (EDUNEX = `CO_20251123_EFQE`) |
| `WEBSITE_BOT_USER_ID` | `uploaded_by` user (`website-bot@edunexservices.in`) |

**Example body**

```json
{
  "type": "contact",
  "externalId": "<edunex contact_submissions.id>",
  "name": "Testman",
  "email": "testman@test.com",
  "phone": "7894561230",
  "company": "Testman Co.",
  "service": "web-development",
  "message": "…",
  "source": "contact_page",
  "createdAt": "…"
}
```

`type: "callback"` only requires `phone` (+ optional `source` / `pagePath`).

Idempotency: if `notes` already contain `EduNex ID: <externalId>`, returns `{ ok: true, duplicate: true }`.

---

## Auto-assign setting

Stored in `system_config` key `websiteLeadSettings:{companyId}`:

```json
{ "autoAssignEnabled": false, "autoAssignUserId": null }
```

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/api/config/website-lead-settings/:companyId` | `MANAGE_SETTINGS` |
| `PUT` | `/api/config/website-lead-settings/:companyId` | `MANAGE_SETTINGS` |

UI: **Settings → General → Website leads (edunexservices.in)**

---

## Code

| File | Role |
|------|------|
| `apps/api/src/routes/webhooks.js` | Inbound webhook |
| `apps/api/src/routes/config.js` | Website lead settings GET/PUT |
| `apps/api/src/index.js` | Mounts `/api/webhooks` |
| `src/components/Settings.tsx` | Auto-assign UI |
| `src/api/client.ts` | `getWebsiteLeadSettings` / `setWebsiteLeadSettings` |

---

## Related

- [API reference](api-reference.md)
- [Settings page](pages/settings.md)
- [Lead Pool](pages/leads.md)
