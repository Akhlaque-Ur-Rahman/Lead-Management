import type { Lead } from '../components/LeadsContext';
import type { User } from '../components/AuthContext';

export function hasFollowUps(lead: Lead): boolean {
    return (lead.directors || []).some(d => (d.followUps || []).length > 0);
}

export function canSalesUserViewLeadInAssigned(user: User, lead: Lead): boolean {
    // Sales User: ONLY assigned to me, and NOT Lost/Converted
    return user?.role === 'sales_user' && lead.assignedTo === user.id && lead.status !== 'Lost' && lead.status !== 'Converted';
}

export function canSalesUserViewLeadInPool(user: User, lead: Lead): boolean {
    // Lead Pool for sales_user = only assigned-to-me & no follow-ups
    // Note: We reuse canSalesUserViewLeadInAssigned to ensure they own it and it's active
    return canSalesUserViewLeadInAssigned(user, lead) && !hasFollowUps(lead);
}

export function canAdminOrTlViewLeadInPool(user: User, lead: Lead): boolean {
    // Admins/TLs: Pool = Unassigned Only.
    // Assigned leads should strictly go to Assigned Leads page.
    return !lead.isAssigned;
}

export type Permission = 'MARK_AS_CONVERTED' | 'MARK_AS_LOST';

export function hasPermission(role: string, permission: Permission): boolean {
    const permissions: Record<Permission, string[]> = {
        'MARK_AS_CONVERTED': ['super_admin', 'company_admin', 'team_lead', 'sales_user'],
        'MARK_AS_LOST': ['super_admin', 'company_admin', 'team_lead', 'sales_user']
    };
    return permissions[permission].includes(role);
}
