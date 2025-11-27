import type { Lead } from '../../components/LeadsContext';
import type { User } from '../../components/AuthContext';

export function hasFollowUps(lead: Lead): boolean {
    return (lead.directors || []).some(d => (d.followUps || []).length > 0);
}

export function canSalesUserViewLeadInAssigned(user: User, lead: Lead): boolean {
    // Sales User: ONLY assigned to me, and NOT Lost/Converted
    // AND must have at least one follow-up (Business Rule)
    if (user?.role !== 'sales_user') return false;
    if (lead.assignedTo !== user.id) return false;
    if (lead.status === 'Lost' || lead.status === 'Converted') return false;

    return hasFollowUps(lead);
}

export function canSalesUserViewLeadInPool(user: User, lead: Lead): boolean {
    // Lead Pool for sales_user:
    // 1. Unassigned leads (visible to everyone usually, or maybe just admins? Assuming visible for now based on previous logic)
    // 2. Assigned to me BUT has 0 follow-ups (New Workflow)

    if (user?.role !== 'sales_user') return false;

    // Case 1: Unassigned
    if (!lead.isAssigned) return true;

    // Case 2: Assigned to me + No follow-ups
    if (lead.assignedTo === user.id && !hasFollowUps(lead)) {
        return true;
    }

    return false;
}

export function canAdminOrTlViewLeadInPool(user: User, lead: Lead): boolean {
    // Admins/TLs: Pool = Unassigned OR Assigned with 0 follow-ups
    // This ensures newly assigned leads stay in pool until worked on.
    if (!lead.isAssigned) return true;

    // If assigned, check for follow-ups
    return !hasFollowUps(lead);
}

export function canViewLeadInCalendar(user: User, lead: Lead): boolean {
    // Sales Users & Team Leads: Only own assigned leads
    if (user.role === 'sales_user' || user.role === 'team_lead') {
        return lead.assignedTo === user.id;
    }
    // Admins: All
    return true;
}
