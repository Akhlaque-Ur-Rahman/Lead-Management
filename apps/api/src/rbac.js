const { query } = require('./db');
const { mapLeadRow } = require('./auth');

const ROLE_IDS = {
  super_admin: 1,
  platform_admin: 2,
  company_admin: 3,
  team_lead: 4,
  sales_user: 5,
};

const PERMISSIONS = {
  MANAGE_USERS: ['super_admin', 'platform_admin', 'company_admin', 'team_lead'],
  MANAGE_COMPANIES: ['super_admin', 'platform_admin'],
  MANAGE_SETTINGS: ['super_admin', 'platform_admin', 'company_admin'],
  MANAGE_BRANDING: ['super_admin'],
  MANAGE_SUBSCRIPTION_PLANS: ['super_admin'],
  ASSIGN_LEADS: ['platform_admin', 'company_admin', 'team_lead'],
  IMPORT_LEADS: ['company_admin', 'team_lead'],
  EDIT_ALL_LEADS: ['super_admin', 'platform_admin', 'company_admin', 'team_lead'],
  DELETE_LOST_LEADS: ['super_admin'],
  RESTORE_LOST_LEADS: ['super_admin', 'platform_admin', 'company_admin'],
  VIEW_FINANCIAL_DATA: ['super_admin', 'company_admin'],
};

function hasPermission(role, permission) {
  return (PERMISSIONS[permission] || []).includes(role);
}

function isPlatformRole(role) {
  return role === 'super_admin' || role === 'platform_admin';
}

function canManageRole(actorRole, targetRole) {
  if (actorRole === 'super_admin') return true;
  if (actorRole === 'platform_admin') {
    return ['company_admin', 'team_lead', 'sales_user'].includes(targetRole);
  }
  if (actorRole === 'company_admin') {
    return ['team_lead', 'sales_user'].includes(targetRole);
  }
  if (actorRole === 'team_lead') return targetRole === 'sales_user';
  return false;
}

function canAssignToUser(assignerRole, targetRole) {
  if (assignerRole === 'super_admin') return false;
  if (assignerRole === 'platform_admin') {
    return ['platform_admin', 'company_admin', 'team_lead', 'sales_user'].includes(targetRole);
  }
  if (assignerRole === 'company_admin') {
    return ['company_admin', 'team_lead', 'sales_user'].includes(targetRole);
  }
  if (assignerRole === 'team_lead') {
    return ['sales_user', 'team_lead'].includes(targetRole);
  }
  return false;
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function resolveCompanyId(user, bodyCompanyId) {
  if (isPlatformRole(user.role)) {
    return bodyCompanyId || user.companyId || null;
  }
  return user.companyId;
}

function assertCompanyAccess(user, companyId) {
  if (!companyId) return false;
  if (isPlatformRole(user.role)) return true;
  return user.companyId === companyId;
}

async function fetchLeadRow(id) {
  const result = await query('SELECT * FROM leads WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function assertLeadAccess(user, leadId, action = 'read') {
  const row = await fetchLeadRow(leadId);
  if (!row) return { status: 404, error: 'Lead not found' };

  if (isPlatformRole(user.role)) {
    return { lead: mapLeadRow(row), row };
  }

  if (user.role === 'sales_user') {
    if (row.assigned_to === user.id) {
      return { lead: mapLeadRow(row), row };
    }
    return { status: 403, error: 'Forbidden' };
  }

  if (user.companyId && row.company_id === user.companyId) {
    if (action === 'assign' && !hasPermission(user.role, 'ASSIGN_LEADS')) {
      return { status: 403, error: 'Forbidden' };
    }
    return { lead: mapLeadRow(row), row };
  }

  return { status: 403, error: 'Forbidden' };
}

function stripFinancialFields(lead, user) {
  if (hasPermission(user.role, 'VIEW_FINANCIAL_DATA')) return lead;
  const { invoiceNo, projectValue, ...rest } = lead;
  return rest;
}

function leadToDbSafe(updates, user, options = {}) {
  const allowed = new Set([
    'cin', 'companyName', 'authorisedCapital', 'paidUpCapital', 'dateOfIncorporation',
    'registeredAddress', 'companyEmail', 'directors', 'din', 'directorFirstName',
    'directorLastName', 'mobile', 'directorEmail', 'status', 'notes',
    'followUpDate', 'nextFollowUpDate',
  ]);

  if (hasPermission(user.role, 'EDIT_ALL_LEADS') || options.isAssignedSalesUser) {
  } else {
    return {};
  }

  if (hasPermission(user.role, 'ASSIGN_LEADS')) {
    allowed.add('isAssigned');
    allowed.add('assignedTo');
  }

  if (hasPermission(user.role, 'VIEW_FINANCIAL_DATA')) {
    allowed.add('invoiceNo');
    allowed.add('projectValue');
  }

  const filtered = {};
  for (const [key, val] of Object.entries(updates)) {
    if (allowed.has(key)) filtered[key] = val;
  }
  return filtered;
}

const USER_SELECT =
  'id, name, email, role, role_id, company_id, is_active, deactivated_by_company, created_at, last_login_at';

module.exports = {
  ROLE_IDS,
  hasPermission,
  isPlatformRole,
  canManageRole,
  canAssignToUser,
  requirePermission,
  requireRoles,
  resolveCompanyId,
  assertCompanyAccess,
  assertLeadAccess,
  stripFinancialFields,
  leadToDbSafe,
  USER_SELECT,
};
