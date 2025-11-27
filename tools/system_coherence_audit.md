# System Logic Coherence Audit Report

## Executive Summary
A comprehensive audit of the Lead Management System was conducted to ensure system integrity following recent critical RBAC security fixes and lifecycle enhancements. The audit focused on `LeadsContext.tsx`, `LeadDetail.tsx`, and core UI components (`AssignedLeads`, `LeadManagement`, `LostLeads`, `ConvertedLeads`).

**Overall Status:** **90% Coherent**, with **one critical regression** identified in `LeadDetail.tsx` that blocks Sales Users from viewing their own Lost and Converted leads.

## Critical Findings & Regressions

### 1. [CRITICAL] `LeadDetail` Security Guard is Too Strict
**Location:** `src/components/LeadDetail.tsx` (Lines 63-70)
**Issue:** The newly added immediate security guard blocks Sales Users from viewing *any* lead not assigned to them.
```typescript
if (user?.role === 'sales_user' && lead.assignedTo !== user.id) {
  return <UnauthorizedAccess />;
}
```
**Impact:**
*   **Lost Leads:** When a lead is marked as "Lost", `assignedTo` is set to `null`. Sales Users cannot view leads they marked as lost, even though they have permission to view them in the `LostLeads` list.
*   **Converted Leads:** When a lead is "Converted", `assignedTo` is set to `null`. Sales Users cannot view leads they converted.
*   **Unassigned Leads (Pool):** Sales Users cannot view details of unassigned leads in the pool (if they are allowed to see them).

**Recommended Fix:**
Update the guard to allow access if:
1.  The lead is assigned to the user.
2.  **OR** The lead is **Lost** AND was marked lost by the user (`lead.lostBy === user.id`).
3.  **OR** The lead is **Converted** AND the user has `VIEW_CONVERTED_LEADS` permission (or `lead.convertedBy === user.id`).

### 2. [MEDIUM] Sales User "Lead Pool" Visibility
**Location:** `src/components/LeadManagement.tsx` & `src/utils/leadVisibility.ts`
**Observation:** The "Lead Pool" for Sales Users is effectively "My Pending Leads" (assigned to them but no follow-ups).
*   **Current Logic:** `canSalesUserViewLeadInPool` checks `lead.assignedTo === user.id && !hasFollowUps(lead)`.
*   **Coherence Check:** This is consistent with the "Strict Isolation" policy. Sales Users should *not* see unassigned company leads.
*   **Action:** No code change needed, but the UI label "Lead Pool" might be confusing. It was already renamed to "My Pending Leads" in a previous step, which is correct.

## Component-Specific Analysis

### `LeadsContext.tsx`
*   **`addFollowUp`:** Correctly handles "Lost" and "Converted" status transitions by unassigning the lead and creating auxiliary documents (`lostLeads`, `convertedLeads`).
*   **`loadLeadsPaginated`:** Correctly enforces server-side role constraints (`where("assignedTo", "==", user.id)` for Sales Users).
*   **`updateLead`:** Correctly restricts Sales Users to updating only their assigned leads.

### `LeadDetail.tsx`
*   **Follow-Up Dialog:** Correctly implements the "Talked To" field, populating both ID and Name.
*   **Status Changes:** "Converted" and "Lost" status changes correctly trigger their respective dialogs and call `addFollowUp` with the correct status, ensuring atomic updates.

### `LostLeads.tsx`
*   **Filtering:** Correctly filters leads for Sales Users (`lostLead.lostBy === user.id`).
*   **Actions:** Correctly restricts "Restore" and "Permanent Delete" actions for Sales Users.

### `ConvertedLeads.tsx`
*   **Filtering:** Correctly uses `getConvertedLeads` and checks `VIEW_CONVERTED_LEADS` permission.
*   **Financial Data:** Correctly hides invoice/project value for users without `VIEW_FINANCIAL_DATA` permission.

### `CalendarView.tsx`
*   **Filtering:** Correctly filters follow-ups for Sales Users to only show their assigned leads.
*   **Singleton Rule:** Correctly implements the "One Active Follow-up Per Company" display logic.

## Next Steps
1.  **Apply Fix for `LeadDetail.tsx`:** Relax the security guard to allow viewing of Lost and Converted leads that the user has permission to see.
2.  **Final Verification:** Manually verify that a Sales User can:
    *   Mark a lead as Lost.
    *   Go to "Lost Leads".
    *   Click "View" and successfully see the lead details.
