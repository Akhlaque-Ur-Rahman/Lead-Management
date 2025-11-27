// Role Configuration with Unique Identifiers
// This file defines all user roles in the system with their identifiers, labels, and permissions

export const ROLES = {
  SUPER_ADMIN: {
    id: 1,
    key: 'super_admin',
    label: 'Super Admin',
    description: 'Platform administrator with full access to all companies',
    level: 5, // Highest permission level
  },
  PLATFORM_ADMIN: {
    id: 2,
    key: 'platform_admin',
    label: 'Platform Admin',
    description: 'Platform administrator with access to all companies except financial data',
    level: 4,
  },
  COMPANY_ADMIN: {
    id: 3,
    key: 'company_admin',
    label: 'Company Admin',
    description: 'Company administrator with full access to company data',
    level: 3,
  },
  TEAM_LEAD: {
    id: 4,
    key: 'team_lead',
    label: 'Team Leader',
    description: 'Team leader with access to team management and reports',
    level: 2,
  },
  SALES_USER: {
    id: 5,
    key: 'sales_user',
    label: 'Sales User',
    description: 'Sales user with access to assigned leads',
    level: 1, // Base permission level
  }
} as const;

// Type definitions
export type RoleKey = 'super_admin' | 'platform_admin' | 'company_admin' | 'team_lead' | 'sales_user';
export type RoleId = 1 | 2 | 3 | 4 | 5;

export interface RoleConfig {
  id: RoleId;
  key: RoleKey;
  label: string;
  description: string;
  level: number;
}

// Helper functions
export const getRoleById = (id: RoleId): RoleConfig | undefined => {
  return Object.values(ROLES).find(role => role.id === id);
};

export const getRoleByKey = (key: RoleKey): RoleConfig | undefined => {
  return Object.values(ROLES).find(role => role.key === key);
};

export const getRoleLabel = (key: RoleKey): string => {
  const role = getRoleByKey(key);
  return role ? role.label : key;
};

export const getRoleId = (key: RoleKey): RoleId | undefined => {
  const role = getRoleByKey(key);
  return role?.id;
};

export const getRoleKeyById = (id: RoleId): RoleKey | undefined => {
  const role = getRoleById(id);
  return role?.key;
};

export const hasHigherOrEqualRole = (userRole: RoleKey, requiredRole: RoleKey): boolean => {
  const userRoleConfig = getRoleByKey(userRole);
  const requiredRoleConfig = getRoleByKey(requiredRole);

  if (!userRoleConfig || !requiredRoleConfig) return false;

  return userRoleConfig.level >= requiredRoleConfig.level;
};

export const canManageRole = (userRole: RoleKey, targetRole: RoleKey): boolean => {
  // Super admin can manage all roles
  if (userRole === 'super_admin') return true;

  // Platform admin can manage company admin, team lead and sales user
  if (userRole === 'platform_admin' && ['company_admin', 'team_lead', 'sales_user'].includes(targetRole)) {
    return true;
  }

  // Company admin can manage team leads and sales users
  if (userRole === 'company_admin' && ['team_lead', 'sales_user'].includes(targetRole)) {
    return true;
  }

  // Team lead can manage sales users
  if (userRole === 'team_lead' && targetRole === 'sales_user') {
    return true;
  }

  return false;
};

// Permission checks
export const PERMISSIONS = {
  VIEW_SUPER_DASHBOARD: ['super_admin', 'platform_admin'] as RoleKey[],
  VIEW_DASHBOARD: ['super_admin', 'platform_admin', 'company_admin', 'team_lead', 'sales_user'] as RoleKey[],
  VIEW_LEAD_POOL: ['super_admin', 'platform_admin', 'company_admin', 'team_lead', 'sales_user'] as RoleKey[],
  VIEW_ASSIGNED_LEADS: ['super_admin', 'platform_admin', 'company_admin', 'team_lead', 'sales_user'] as RoleKey[],
  VIEW_CALENDAR: ['super_admin', 'platform_admin', 'company_admin', 'team_lead', 'sales_user'] as RoleKey[],
  VIEW_LOST_LEADS: ['super_admin', 'platform_admin', 'company_admin', 'team_lead', 'sales_user'] as RoleKey[],
  VIEW_REPORTS: ['super_admin', 'platform_admin', 'company_admin', 'team_lead', 'sales_user'] as RoleKey[],
  VIEW_CONVERTED_LEADS: ['super_admin', 'platform_admin', 'company_admin'] as RoleKey[],
  VIEW_FINANCIAL_DATA: ['super_admin', 'company_admin'] as RoleKey[],
  DELETE_LOST_LEADS_PERMANENT: ['super_admin', 'company_admin'] as RoleKey[],
  MANAGE_USERS: ['super_admin', 'platform_admin', 'company_admin', 'team_lead'] as RoleKey[],
  MANAGE_COMPANIES: ['super_admin', 'platform_admin'] as RoleKey[],
  MANAGE_SETTINGS: ['super_admin', 'platform_admin', 'company_admin'] as RoleKey[],
  MANAGE_SUBSCRIPTION_PLANS: ['super_admin'] as RoleKey[],
  DELETE_LOST_LEADS: ['super_admin'] as RoleKey[],
  RESTORE_LOST_LEADS: ['super_admin', 'platform_admin', 'company_admin'] as RoleKey[],
  ASSIGN_LEADS: ['platform_admin', 'company_admin', 'team_lead'] as RoleKey[],
  EDIT_ALL_LEADS: ['super_admin', 'platform_admin', 'company_admin', 'team_lead'] as RoleKey[],
  EDIT_ASSIGNED_LEADS: ['sales_user'] as RoleKey[],
  IMPORT_LEADS: ['company_admin', 'team_lead'] as RoleKey[],
};

export const hasPermission = (userRole: RoleKey, permission: keyof typeof PERMISSIONS): boolean => {
  return PERMISSIONS[permission].includes(userRole);
};

// Check if a user can assign a lead to a specific target user
export const canAssignToUser = (assignerRole: RoleKey, targetUserRole: RoleKey): boolean => {
  // Super Admin cannot assign leads (read-only)
  if (assignerRole === 'super_admin') return false;

  // Platform Admin can assign to anyone (Platform Admin, Company Admin, Team Leader, Sales User)
  if (assignerRole === 'platform_admin') {
    return ['platform_admin', 'company_admin', 'team_lead', 'sales_user'].includes(targetUserRole);
  }

  // Company Admin can assign to anyone (Company Admin, Team Leader, Sales User)
  if (assignerRole === 'company_admin') {
    return ['company_admin', 'team_lead', 'sales_user'].includes(targetUserRole);
  }

  // Team Leader can assign to Sales Users AND themselves
  if (assignerRole === 'team_lead') {
    return ['sales_user', 'team_lead'].includes(targetUserRole);
  }

  // Sales User cannot assign leads
  return false;
};

// Get all roles as array for dropdowns
export const getAllRoles = (): RoleConfig[] => {
  return Object.values(ROLES);
};

// Get roles available for a user to assign
export const getAssignableRoles = (userRole: RoleKey): RoleConfig[] => {
  if (userRole === 'super_admin') {
    return []; // Super Admin is read-only
  } else if (userRole === 'platform_admin') {
    return [ROLES.PLATFORM_ADMIN, ROLES.COMPANY_ADMIN, ROLES.TEAM_LEAD, ROLES.SALES_USER];
  } else if (userRole === 'company_admin') {
    return [ROLES.COMPANY_ADMIN, ROLES.TEAM_LEAD, ROLES.SALES_USER];
  } else if (userRole === 'team_lead') {
    return [ROLES.SALES_USER, ROLES.TEAM_LEAD]; // Team Lead can assign to Sales User and Self
  }
  return [];
};

// Badge variant mapping for UI
export const getRoleBadgeVariant = (key: RoleKey): 'destructive' | 'default' | 'secondary' | 'outline' => {
  switch (key) {
    case 'super_admin': return 'destructive';
    case 'platform_admin': return 'default';
    case 'company_admin': return 'default';
    case 'team_lead': return 'secondary';
    case 'sales_user': return 'outline';
    default: return 'secondary';
  }
};
