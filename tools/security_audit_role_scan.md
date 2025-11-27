# Security Audit: Role & Security Scan

**Date:** 2025-11-27
**Scope:** `src/**` (Focus: RBAC, Data Isolation, Mutation Permissions)

## Executive Summary
The application has a solid foundation for role-based access control (RBAC), particularly in **read operations**. Server-side queries for Sales Users are strictly scoped to their assigned leads. However, **write operations** (mutations) in `LeadsContext.tsx` lack sufficient context-level permission checks, relying heavily on client-side UI guards. This presents a security risk where authorized users could potentially manipulate data outside their scope via direct API calls or UI bugs.

---

## Findings

### 1. Sales User Isolation (Read Access)
*   **Status:** ✅ **SECURE**
*   **Verification:** `LeadsContext.tsx` (`loadLeadsPaginated`) strictly enforces `where("assignedTo", "==", user.id)` for `sales_user`.
*   **Notes:** Client-side filters in `AssignedLeads.tsx` and `LeadManagement.tsx` correctly layer on top of these server-side constraints.

### 2. LeadDetail Access Guard
*   **Status:** ⚠️ **MEDIUM RISK**
*   **Location:** `src/components/LeadDetail.tsx` (Lines 64-71)
*   **Violation:** The access guard runs inside `useEffect`.
    ```typescript
    useEffect(() => {
      if (user?.role === 'sales_user' && lead.assignedTo !== user.id) { ... }
    }, ...);
    ```
*   **Risk:** The component renders its content (including potentially sensitive lead data) *before* the redirect happens.
*   **Fix:** Move the check to the render body or a parent guard.

### 3. Assignment Permissions (Write Access)
*   **Status:** 🔴 **HIGH RISK**
*   **Location:** `src/components/LeadsContext.tsx` (`assignLead`, `unassignLead`)
*   **Violation:** These functions accept `leadId` and `userId` but perform **NO** permission checks on the caller.
    ```typescript
    const assignLead = async (leadId: string, userId: string) => {
      // Missing: if (!canAssignToUser(user.role, targetRole)) throw Error;
      ...
    }
    ```
*   **Risk:** A Sales User (or any authenticated user) could theoretically trigger these functions to assign/unassign leads if they bypass the UI.

### 4. Lead Mutation Permissions (Write Access)
*   **Status:** 🔴 **HIGH RISK**
*   **Location:** `src/components/LeadsContext.tsx` (`updateLead`)
*   **Violation:** `updateLead` allows any authenticated user to update any lead if they have the ID.
*   **Risk:** Sales Users could update leads they are not assigned to.
*   **Fix:** Inside the transaction, verify:
    ```typescript
    if (user.role === 'sales_user' && currentData.assignedTo !== user.id) {
      throw new Error("Unauthorized");
    }
    ```

### 5. Follow-up Permissions
*   **Status:** ✅ **SECURE**
*   **Location:** `src/components/LeadsContext.tsx` (`addFollowUp`)
*   **Verification:** Explicit checks exist for `super_admin`, `MARK_AS_CONVERTED`, and `MARK_AS_LOST`.

### 6. Direct DB Access
*   **Status:** ✅ **SECURE**
*   **Verification:** No instances of `setDoc`, `updateDoc`, or `deleteDoc` found in components outside of `LeadsContext.tsx`.

---

## Quick Fixes

### Fix 1: Secure `assignLead` (LeadsContext.tsx)
```typescript
const assignLead = async (leadId: string, userId: string): Promise<boolean> => {
  // 1. Get Target User Role (Need to fetch user or pass role)
  // Ideally, pass targetRole or fetch it. For now, assuming we can fetch:
  // const targetUser = users.find(u => u.id === userId); 
  // if (!canAssignToUser(user.role, targetUser.role)) return false;
  
  // ALTERNATIVE: Just enforce that Sales Users cannot call this AT ALL.
  if (user.role === 'sales_user') return false; 
  if (user.role === 'super_admin') return false;
  
  // ... rest of function
};
```

### Fix 2: Secure `updateLead` (LeadsContext.tsx)
```typescript
// Inside runTransaction...
const currentData = snap.data() as Lead;

// SECURITY CHECK
if (user.role === 'sales_user' && currentData.assignedTo !== user.id) {
  throw new Error("Unauthorized: You can only update your own leads.");
}
```

### Fix 3: Harden `LeadDetail` Guard (LeadDetail.tsx)
```typescript
export function LeadDetail({ lead, onClose, onEdit }: LeadDetailProps) {
  const { user } = useAuth();
  
  // IMMEDIATE GUARD
  if (user?.role === 'sales_user' && lead.assignedTo !== user.id) {
    // Optional: Trigger redirect via effect if needed, but don't render content
    return (
      <div className="p-6 text-center text-red-500">
        Unauthorized Access
      </div>
    );
  }
  
  // ... rest of component
}
```

---

## Tests to Run (QA)

1.  **Sales User Isolation**: Login as Sales User. Verify `Assigned Leads` only shows leads assigned to them.
2.  **Lead Detail Block**: As Sales User, try to manually open a Lead Detail URL (if routable) or modify code to pass a lead ID not assigned to them. Verify "Unauthorized" message.
3.  **Assignment Attack**: As Sales User, try to call `assignLead` via browser console (if exposed) or React DevTools. Verify it fails (after applying fix).
4.  **Update Attack**: As Sales User, try to call `updateLead` for a lead ID belonging to another user. Verify it fails.
5.  **Super Admin Read-Only**: Verify Super Admin cannot add follow-ups or assign leads (UI should hide buttons, backend should reject).

## Confidence Level
*   **High**: For `LeadsContext` mutation fixes. These are critical and straightforward.
*   **Medium**: For `LeadDetail` guard. The UI behavior might need tweaking to be user-friendly (e.g., auto-close vs error message).
