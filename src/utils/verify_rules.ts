// @ts-nocheck

// --- LOGIC FROM leadVisibility.ts ---
function hasFollowUps(lead) {
    return (lead.directors || []).some(d => (d.followUps || []).length > 0);
}

function canSalesUserViewLeadInAssigned(user, lead) {
    // Sales User: ONLY assigned to me, and NOT Lost/Converted
    return user?.role === 'sales_user' && lead.assignedTo === user.id && lead.status !== 'Lost' && lead.status !== 'Converted';
}

function canSalesUserViewLeadInPool(user, lead) {
    // Lead Pool for sales_user = only assigned-to-me & no follow-ups
    // Note: We reuse canSalesUserViewLeadInAssigned to ensure they own it and it's active
    return canSalesUserViewLeadInAssigned(user, lead) && !hasFollowUps(lead);
}

function canAdminOrTlViewLeadInPool(user, lead) {
    // unassigned OR assigned-but-no-follow-ups (company-scoped implied by query)
    return (!lead.isAssigned) || (lead.isAssigned && !hasFollowUps(lead));
}
// ------------------------------------

// Mock Data
const salesUser = { id: 'sales1', role: 'sales_user', companyId: 'comp1' };
const adminUser = { id: 'admin1', role: 'company_admin', companyId: 'comp1' };
const tlUser = { id: 'tl1', role: 'team_lead', companyId: 'comp1' };

const leadAssignedToMe = {
    id: 'l1',
    assignedTo: 'sales1',
    isAssigned: true,
    status: 'Cold',
    directors: []
};

const leadAssignedToOther = {
    id: 'l2',
    assignedTo: 'sales2',
    isAssigned: true,
    status: 'Cold',
    directors: []
};

const leadUnassigned = {
    id: 'l3',
    assignedTo: null,
    isAssigned: false,
    status: 'Cold',
    directors: []
};

const leadWithFollowUp = {
    id: 'l4',
    assignedTo: 'sales1',
    isAssigned: true,
    status: 'Cold',
    directors: [{ followUps: [{ status: 'active' }] }]
};

const leadLost = {
    id: 'l5',
    assignedTo: 'sales1',
    isAssigned: true,
    status: 'Lost',
    directors: []
};

console.log('--- VERIFICATION START ---');

// 1. Sales User - Lead Pool
console.log('\n1. Sales User - Lead Pool (Should only see own assigned w/o follow-ups)');
console.log('Own Assigned, No Follow-up (Expect TRUE):', canSalesUserViewLeadInPool(salesUser, leadAssignedToMe));
console.log('Own Assigned, Has Follow-up (Expect FALSE):', canSalesUserViewLeadInPool(salesUser, leadWithFollowUp));
console.log('Other Assigned (Expect FALSE):', canSalesUserViewLeadInPool(salesUser, leadAssignedToOther));
console.log('Unassigned (Expect FALSE):', canSalesUserViewLeadInPool(salesUser, leadUnassigned));

// 2. Sales User - Assigned Leads
console.log('\n2. Sales User - Assigned Leads (Should see own assigned)');
console.log('Own Assigned (Expect TRUE):', canSalesUserViewLeadInAssigned(salesUser, leadAssignedToMe));
console.log('Own Assigned, Has Follow-up (Expect TRUE):', canSalesUserViewLeadInAssigned(salesUser, leadWithFollowUp));
console.log('Other Assigned (Expect FALSE):', canSalesUserViewLeadInAssigned(salesUser, leadAssignedToOther));
console.log('Lost Lead (Expect FALSE):', canSalesUserViewLeadInAssigned(salesUser, leadLost));

// 3. Admin/TL - Lead Pool
console.log('\n3. Admin/TL - Lead Pool (Unassigned OR Assigned w/o Follow-ups)');
console.log('Unassigned (Expect TRUE):', canAdminOrTlViewLeadInPool(adminUser, leadUnassigned));
console.log('Assigned, No Follow-up (Expect TRUE):', canAdminOrTlViewLeadInPool(adminUser, leadAssignedToMe));
console.log('Assigned, Has Follow-up (Expect FALSE):', canAdminOrTlViewLeadInPool(adminUser, leadWithFollowUp));

console.log('\n--- VERIFICATION END ---');
