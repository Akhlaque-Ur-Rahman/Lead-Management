import type { Lead } from '../../components/LeadsContext';
import type { User } from '../../components/AuthContext';
import { countActiveFollowUps } from '../followups/countFollowUps';

export type LeadView = 'pool' | 'assigned' | 'converted' | 'lost';

export type MarkPermission = 'MARK_AS_CONVERTED' | 'MARK_AS_LOST';

const MARK_PERMISSIONS: Record<MarkPermission, string[]> = {
  MARK_AS_CONVERTED: ['super_admin', 'company_admin', 'team_lead', 'sales_user'],
  MARK_AS_LOST: ['super_admin', 'company_admin', 'team_lead', 'sales_user'],
};

export function hasMarkPermission(role: string, permission: MarkPermission): boolean {
  return MARK_PERMISSIONS[permission].includes(role);
}

export function hasFollowUps(lead: Lead): boolean {
  return (lead.directors || []).some((d) => (d.followUps || []).length > 0);
}

export function isPlatformRole(role: string): boolean {
  return role === 'super_admin' || role === 'platform_admin';
}

export function canSalesUserViewLeadInAssigned(user: User, lead: Lead): boolean {
  if (user?.role !== 'sales_user') return false;
  if (lead.assignedTo !== user.id) return false;
  if (lead.status === 'Lost' || lead.status === 'Converted') return false;
  return hasFollowUps(lead);
}

export function canSalesUserViewLeadInPool(user: User, lead: Lead): boolean {
  if (user?.role !== 'sales_user') return false;
  if (!lead.isAssigned) return true;
  if (lead.assignedTo === user.id && !hasFollowUps(lead)) return true;
  return false;
}

export function canAdminOrTlViewLeadInPool(_user: User, lead: Lead): boolean {
  if (!lead.isAssigned) return true;
  return !hasFollowUps(lead);
}

export function canViewLeadInCalendar(user: User, lead: Lead): boolean {
  if (user.role === 'sales_user' || user.role === 'team_lead') {
    return lead.assignedTo === user.id;
  }
  return true;
}

export const isLeadInPoolForUser = (user: User, lead: Lead) => {
  if (lead.status === 'Converted' || lead.status === 'Lost') return false;

  const activeFollowUps = countActiveFollowUps(lead);

  if (user.role === 'sales_user') {
    return lead.assignedTo === user.id && activeFollowUps === 0;
  }

  if (user.role === 'team_lead' || user.role === 'company_admin') {
    if (lead.assignedTo === user.id) return activeFollowUps === 0;
    if (lead.assignedTo && lead.assignedTo !== user.id) return false;
    if (!lead.assignedTo) return true;
    return false;
  }

  if (isPlatformRole(user.role)) {
    return true;
  }

  return false;
};

export const isLeadInAssignedForUser = (user: User, lead: Lead) => {
  if (lead.status === 'Converted' || lead.status === 'Lost') return false;

  if (user.role === 'sales_user') {
    return lead.assignedTo === user.id;
  }

  if (user.role === 'team_lead' || user.role === 'company_admin') {
    if (!lead.assignedTo) return false;
    return lead.companyId === user.companyId;
  }

  if (isPlatformRole(user.role)) {
    return lead.isAssigned;
  }

  return false;
};

export const filterLeadsForView = (leads: Lead[], view: LeadView, user: User): Lead[] => {
  return leads.filter((lead) => {
    if (view === 'pool') return isLeadInPoolForUser(user, lead);
    if (view === 'assigned') return isLeadInAssignedForUser(user, lead);

    if (view === 'converted') {
      if (lead.status !== 'Converted') return false;
      if (user.role === 'sales_user') return false;
      return true;
    }

    if (view === 'lost') {
      if (lead.status !== 'Lost') return false;
      if (user.role === 'sales_user') return lead.lostBy === user.id;
      return true;
    }

    return false;
  });
};
