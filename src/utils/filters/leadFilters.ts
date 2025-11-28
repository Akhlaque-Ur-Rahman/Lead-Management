import type { Lead } from '../../components/LeadsContext';
import type { User } from '../../components/AuthContext';
import {
    canSalesUserViewLeadInPool,
    canSalesUserViewLeadInAssigned,
    hasFollowUps
} from '../role/visibility';
import { countActiveFollowUps } from '../followups/countFollowUps';

export type LeadView = 'pool' | 'assigned' | 'converted' | 'lost';

export const isLeadInPoolForUser = (user: any, lead: Lead) => {
    // Never include Converted or Lost in pool
    if (lead.status === 'Converted' || lead.status === 'Lost') return false;

    const activeFollowUps = countActiveFollowUps(lead);

    // Sales User Lead Pool
    if (user.role === 'sales_user') {
        // "Lead Pool must include ONLY: Leads assigned to the sales user AND with 0 active follow-ups"
        return lead.assignedTo === user.id && activeFollowUps === 0;
    }

    // Team Leader + Company Admin
    if (user.role === 'team_lead' || user.role === 'company_admin') {
        // 1. Assigned to self -> Show ONLY if activeFollowUps === 0
        if (lead.assignedTo === user.id) {
            return activeFollowUps === 0;
        }

        // 2. Assigned to others -> NEVER show in pool
        if (lead.assignedTo && lead.assignedTo !== user.id) {
            return false;
        }

        // 3. Unassigned -> Always remain in Pool
        if (!lead.assignedTo) return true;

        return false;
    }

    // Super admin - keep read-only behaviour
    if (user.role === 'super_admin') {
        if (lead.status === 'Converted' || lead.status === 'Lost') return false;
        return true;
    }

    return false;
};

export const isLeadInAssignedForUser = (user: any, lead: Lead) => {
    // Assigned view restrictions:
    if (lead.status === 'Converted' || lead.status === 'Lost') return false;

    // Sales User
    if (user.role === 'sales_user') {
        return lead.assignedTo === user.id;
    }

    // Team Leader + Company Admin
    if (user.role === 'team_lead' || user.role === 'company_admin') {
        // 1. Show all assigned leads in company
        // 2. Do NOT show unassigned leads
        if (!lead.assignedTo) return false;

        // Ensure company check (implied by "in company")
        return lead.companyId === user.companyId;
    }

    if (user.role === 'super_admin') {
        return lead.isAssigned;
    }

    return false;
};

export const filterLeadsForView = (leads: Lead[], view: LeadView, user: User): Lead[] => {
    return leads.filter(lead => {
        // POOL VIEW
        if (view === 'pool') {
            return isLeadInPoolForUser(user, lead);
        }

        // ASSIGNED VIEW
        if (view === 'assigned') {
            return isLeadInAssignedForUser(user, lead);
        }

        // CONVERTED VIEW
        if (view === 'converted') {
            if (lead.status !== 'Converted') return false;
            // Sales Users: Do NOT see converted leads (Business Rule)
            if (user.role === 'sales_user') return false;
            return true;
        }

        // LOST VIEW
        if (view === 'lost') {
            if (lead.status !== 'Lost') return false;
            // Sales Users: See ONLY leads they marked as lost
            if (user.role === 'sales_user') {
                return lead.lostBy === user.id;
            }
            return true;
        }

        return false;
    });
};
