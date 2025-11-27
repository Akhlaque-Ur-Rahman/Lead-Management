import type { Lead } from '../../components/LeadsContext';
import type { User } from '../../components/AuthContext';
import {
    canSalesUserViewLeadInPool,
    canAdminOrTlViewLeadInPool,
    canSalesUserViewLeadInAssigned,
    hasFollowUps
} from '../role/visibility';

export type LeadView = 'pool' | 'assigned' | 'converted' | 'lost';

export const filterLeadsForView = (leads: Lead[], view: LeadView, user: User): Lead[] => {
    return leads.filter(lead => {
        // 1. Global Exclusions (unless view specific)
        // Converted and Lost leads should NOT appear in Pool or Assigned (unless specific logic says so)
        // But 'assigned' view for Sales User MIGHT show them if we didn't filter? 
        // Actually, Lost/Converted have their own views.

        // POOL VIEW
        if (view === 'pool') {
            if (lead.status === 'Converted' || lead.status === 'Lost') return false;

            if (user.role === 'sales_user') {
                return canSalesUserViewLeadInPool(user, lead);
            }
            return canAdminOrTlViewLeadInPool(user, lead);
        }

        // ASSIGNED VIEW
        if (view === 'assigned') {
            if (lead.status === 'Converted' || lead.status === 'Lost') return false;

            if (user.role === 'sales_user') {
                return canSalesUserViewLeadInAssigned(user, lead);
            }
            // Admin/TL see ALL assigned leads that have follow-ups
            // (Assigned leads with 0 follow-ups stay in Pool)
            return lead.isAssigned && hasFollowUps(lead);
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
