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

    const followUpsCount = countActiveFollowUps(lead);

    if (user.role === 'sales_user') {
        // Sales User Pool Rules:
        // - lead.assignedTo === user.id
        // - activeFollowupCount === 0
        // - lead.status NOT IN ("Lost", "Converted")
        return lead.assignedTo === user.id && followUpsCount === 0;
    }

    if (user.role === 'team_lead' || user.role === 'company_admin') {
        // TL/Admin Pool Rules:
        // - Unassigned leads (assignedTo === null)
        // - OR leads assigned to THEMSELVES with activeFollowupCount === 0
        // - NOT leads assigned to sales users
        // - NOT Lost/Converted

        // 1. Unassigned
        if (!lead.isAssigned) return true;

        // 2. Assigned to SELF with 0 follow-ups
        if (lead.assignedTo === user.id && followUpsCount === 0) return true;

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

    if (user.role === 'sales_user') {
        // Sales User Assigned Rules:
        // - lead.assignedTo === user.id
        // - ANY number of follow-ups
        // - NOT Lost/Converted
        return lead.assignedTo === user.id;
    }

    if (user.role === 'team_lead' || user.role === 'company_admin') {
        // TL/Admin Assigned Rules:
        // - Must be assigned and in company
        if (!lead.isAssigned || lead.companyId !== user.companyId) return false;

        // - If assigned to SELF: Show ONLY if has active follow-ups (otherwise it's in Pool)
        if (lead.assignedTo === user.id) {
            return countActiveFollowUps(lead) > 0;
        }

        // - If assigned to OTHERS: Show always (monitoring)
        return true;
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
