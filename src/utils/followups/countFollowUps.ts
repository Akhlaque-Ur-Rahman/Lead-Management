import { Lead } from '../../components/LeadsContext';

// returns number of ACTIVE follow-ups for the lead (treat missing status as active)
export const countActiveFollowUps = (lead: Lead): number => {
    let count = 0;
    (lead.directors || []).forEach(d => {
        (d.followUps || []).forEach(f => {
            if (!f.status || f.status === "active") count++;
        });
    });
    return count;
};
