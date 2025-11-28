import type { Lead } from '../../components/LeadsContext';
import type { User } from '../../components/AuthContext';
import {
    canSalesUserViewLeadInPool,
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

            // Sales User Logic
            if (user.role === 'sales_user') {
                return canSalesUserViewLeadInPool(user, lead);
            }

            // Admin / Team Lead Logic
            // 1. Unassigned leads -> Visible
            if (!lead.isAssigned) return true;

            // 2. Assigned to SELF with 0 follow-ups -> Visible in Pool (Special Rule)
            // This ensures that if they assign to themselves, it stays in pool until worked on.
            if (lead.assignedTo === user.id && !hasFollowUps(lead)) {
                return true;
            }

            // 3. Assigned to OTHERS -> Visible in Pool if 0 follow-ups?
            // Usually, if assigned to others, it might disappear from Pool for the admin?
            // Original logic: "Admin/TLs: Pool = Unassigned OR Assigned with 0 follow-ups"
            // So if assigned to ANYONE and has 0 follow-ups, it stays in pool.
            return !hasFollowUps(lead);
        }

        // ASSIGNED VIEW
        if (view === 'assigned') {
            if (lead.status === 'Converted' || lead.status === 'Lost') return false;

            // Sales User Logic
            if (user.role === 'sales_user') {
                return canSalesUserViewLeadInAssigned(user, lead);
            }

            // Admin / Team Lead Logic
            // 1. Assigned to SELF -> Visible ONLY if has follow-ups (moved from Pool)
            if (lead.assignedTo === user.id) {
                return hasFollowUps(lead);
            }

            // 2. Assigned to OTHERS -> Visible (Admins see all assigned leads)
            // But usually we only show "active" assigned leads here?
            // Prompt says: "Assigned Leads Condition: assigned = lead.isAssigned && followUpsCount >= 1"
            // "No exceptions for roles — once follow-up added, lead must move away from pool."
            // So for Assigned View, we ONLY show leads that have follow-ups?
            // "Team Lead sees all assigned leads", "Company Admin sees all assigned leads".
            // If a lead is assigned to Sales User but has 0 follow-ups, does Admin see it in Assigned View?
            // Prompt: "Assigned (0 follow-ups) -> visible in Lead Pool" (for Sales User).
            // "Team Lead / Company Admin ... 1. The lead SHOULD stay in Lead Pool as long as it has 0 follow-ups".
            // This implies Assigned View should ONLY show leads with >= 1 follow-ups.

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
