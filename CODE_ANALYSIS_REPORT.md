# 🔍 Lead Management System - Code Analysis Report

## 📋 Table of Contents
1. [Mark Lead as Lost Functions](#1-mark-lead-as-lost-functions)
2. [Follow-Up Management Functions](#2-follow-up-management-functions)
3. [Lead Update Functions](#3-lead-update-functions)
4. [Active Leads Auto-Movement Logic](#4-active-leads-auto-movement-logic)
5. [Active Leads Filtering Logic](#5-active-leads-filtering-logic)
6. [Director Follow-Up Placement](#6-director-follow-up-placement)
7. [Field Assignment Logic](#7-field-assignment-logic)
8. [Permission Logic](#8-permission-logic)

---

## 1. Mark Lead as Lost Functions

### 🔹 `markAsLost()` - LeadsContext.tsx (Lines 779-801)

**Location**: [LeadsContext.tsx:779-801](file:///d:/Officials/Development/Projects/lead-management/src/components/LeadsContext.tsx#L779-L801)

```typescript
const markAsLost = async (leadId: string, remark: string, userId: string, isPermanent = false): Promise<boolean> => {
  try {
    const leadRef = doc(db, "leads", leadId);
    const lostRef = await addDoc(collection(db, "lostLeads"), {
      leadId,
      lostBy: userId,
      lostDate: serverTimestamp(),
      lostRemark: remark,
      isPermanent,
    });
    await updateDoc(leadRef, {
      status: "Lost",
      lostRemark: remark,
      lostBy: userId,
      lostAt: serverTimestamp(),
    } as any);
    await setDoc(doc(db, "lostLeads", lostRef.id), { id: lostRef.id }, { merge: true });
    return true;
  } catch (err) {
    console.error("markAsLost error:", err);
    return false;
  }
};
```

**What it does**:
- Creates a new document in `lostLeads` collection
- Updates the lead document with `status: "Lost"`, `lostRemark`, `lostBy`, and `lostAt`
- Supports permanent vs temporary lost leads via `isPermanent` flag
- Returns `true` on success, `false` on failure

---

### 🔹 `handleMarkAsLost()` - LeadDetail.tsx (Lines 210-254)

**Location**: [LeadDetail.tsx:210-254](file:///d:/Officials/Development/Projects/lead-management/src/components/LeadDetail.tsx#L210-L254)

```typescript
const handleMarkAsLost = async () => {
  if (!lostRemark.trim()) {
    toast.error('Please provide a reason for marking this lead as lost');
    return;
  }

  try {
    const followUpData = {
      date: followUpDate || new Date().toISOString().split('T')[0],
      time: followUpTime || new Date().toTimeString().slice(0, 5),
      remark: followUpRemark || 'Lead Lost',
      talkedTo: talkedTo || 'N/A',
      talkedToId: talkedToId || '',
      talkedToName: talkedToName || '',
      followUpStatus: 'Lost' as const
    };

    const permanent = user?.role === 'company_admin' && isPermanentLost;

    await addFollowUp(lead.id, followUpData, {
      status: 'Lost',
      lostRemark,
      lostBy: user?.id || '',
    });

    toast.success('Lead marked as lost');
    setShowLostDialog(false);
    setShowFollowUpDialog(false);
    setLostRemark('');
    setIsPermanentLost(false);
    resetFollowUpForm();
    onClose();
  } catch (error) {
    console.error('Error marking lead as lost:', error);
    toast.error('Failed to mark lead as lost');
  }
};
```

**What it does**:
- Validates that a lost remark is provided
- Creates a follow-up with `followUpStatus: 'Lost'`
- Calls `addFollowUp()` with lead updates (`status: 'Lost'`, `lostRemark`, `lostBy`)
- Only Company Admins can mark leads as permanently lost
- Closes dialogs and resets form on success

---

### 🔹 `restoreLostLead()` - LeadsContext.tsx (Lines 803-827)

**Location**: [LeadsContext.tsx:803-827](file:///d:/Officials/Development/Projects/lead-management/src/components/LeadsContext.tsx#L803-L827)

```typescript
const restoreLostLead = async (lostId: string): Promise<boolean> => {
  try {
    const lostDocRef = doc(db, "lostLeads", lostId);
    const lostSnap = await getDoc(lostDocRef);
    if (!lostSnap.exists()) throw new Error("Lost lead entry not found");
    const payload = lostSnap.data();
    const leadId = payload.leadId;
    const leadRef = doc(db, "leads", leadId);
    await updateDoc(leadRef, {
      status: "Cold",
      lostRemark: null,
      lostBy: null,
      lostAt: null,
    } as any);
    try {
      await deleteDoc(lostDocRef);
    } catch (e) {
      await updateDoc(lostDocRef, { isRestored: true, restoredAt: serverTimestamp() } as any);
    }
    return true;
  } catch (err) {
    console.error("restoreLostLead error:", err);
    return false;
  }
};
```

**What it does**:
- Restores a lost lead back to `status: "Cold"`
- Clears `lostRemark`, `lostBy`, and `lostAt` fields
- Deletes the `lostLeads` document (or marks as restored if deletion fails)

---

## 2. Follow-Up Management Functions

### 🔹 `addFollowUp()` - LeadsContext.tsx (Lines 550-635)

**Location**: [LeadsContext.tsx:550-635](file:///d:/Officials/Development/Projects/lead-management/src/components/LeadsContext.tsx#L550-L635)

```typescript
const addFollowUp = async (
  leadId: string,
  followUpData: Omit<FollowUp, "id" | "createdAt" | "createdBy" | "status">,
  leadUpdates?: Partial<Lead>
): Promise<boolean> => {
  if (!user) return false;

  try {
    const leadRef = doc(db, "leads", leadId);
    
    await runTransaction(db, async (transaction) => {
      const leadDoc = await transaction.get(leadRef);
      if (!leadDoc.exists()) throw new Error("Lead not found");

      const leadData = leadDoc.data() as Lead;
      const directors = leadData.directors || [];
      
      // Infer director from talkedTo name
      const talkedToName = followUpData.talkedTo;
      const directorIndex = directors.findIndex(d => 
        `${d.firstName} ${d.lastName}` === talkedToName || 
        d.firstName === talkedToName // Fallback for single name
      );
      
      if (directorIndex === -1) throw new Error(`Director not found for name: ${talkedToName}`);

      // 1) COMPANY-LEVEL SINGLETON: Mark ALL follow-ups across ALL directors as 'updated'
      directors.forEach((director, idx) => {
        const updatedFollowUps = (director.followUps || []).map(f => {
          if (!f.status || f.status === "active") {
            return { ...f, status: "updated" as const };
          }
          return f;
        });
        directors[idx].followUps = updatedFollowUps;
      });

      const newFollowUp: FollowUp = {
        ...followUpData,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        createdBy: user.id,
        status: "active", // Always active when created
      };

      // Add new follow-up to the inferred director
      directors[directorIndex].followUps = directors[directorIndex].followUps || [];
      directors[directorIndex].followUps.push(newFollowUp);

      // Calculate next follow-up date (based on active follow-ups only)
      const nextDate = calculateNextFollowUpDate({ ...leadData, directors });

      // Prepare updates
      const updates: any = {
        directors,
        nextFollowUpDate: nextDate
      };

      // Apply additional lead updates (e.g. status change, unassignment)
      if (leadUpdates) {
        Object.assign(updates, leadUpdates);
        
        // Special handling for Converted status
        if (leadUpdates.status === 'Converted') {
          updates.assignedTo = null;
          updates.isAssigned = false;
          updates.assignedAt = null;
          updates.convertedAt = new Date().toISOString();
          updates.convertedBy = user.id;
        }
        
        // Special handling for Lost status
        if (leadUpdates.status === 'Lost') {
           updates.lostAt = new Date().toISOString();
           updates.lostBy = user.id;
        }
      }

      transaction.update(leadRef, updates);
    });
    return true;
  } catch (error) {
    console.error("Error adding follow-up:", error);
    throw error;
  }
};
```

**What it does**:
- **Company-Level Singleton Rule**: Marks ALL existing active follow-ups across ALL directors as `status: "updated"`
- Creates a new follow-up with `status: "active"`
- Infers the director from `talkedTo` name
- Calculates and updates `nextFollowUpDate`
- Handles special status changes (Converted, Lost) by updating lead fields
- Uses Firestore transaction for atomicity

---

### 🔹 `updateFollowUp()` - LeadsContext.tsx (Lines 637-742)

**Location**: [LeadsContext.tsx:637-742](file:///d:/Officials/Development/Projects/lead-management/src/components/LeadsContext.tsx#L637-L742)

```typescript
const updateFollowUp = async (
  leadId: string,
  followUp: FollowUp,
  leadUpdates?: Partial<Lead>
): Promise<boolean> => {
  try {
    // Validate date - prevent past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followUpDate = new Date(followUp.date);
    if (followUpDate < today) {
      throw new Error("Cannot schedule follow-ups in the past");
    }

    const leadRef = doc(db, "leads", leadId);
    
    await runTransaction(db, async (transaction) => {
      const leadDoc = await transaction.get(leadRef);
      if (!leadDoc.exists()) throw new Error("Lead not found");

      const leadData = leadDoc.data() as Lead;
      const directors = leadData.directors || [];
      
      // Find which director currently has this follow-up
      let currentDirectorIndex = -1;
      let followUpIndex = -1;
      
      directors.forEach((d, dIdx) => {
        const fIdx = (d.followUps || []).findIndex(f => f.id === followUp.id);
        if (fIdx !== -1) {
          currentDirectorIndex = dIdx;
          followUpIndex = fIdx;
        }
      });

      if (currentDirectorIndex === -1) throw new Error("Follow-up not found");

      // Infer NEW director from talkedTo name
      const talkedToName = followUp.talkedTo;
      const newDirectorIndex = directors.findIndex(d => 
        `${d.firstName} ${d.lastName}` === talkedToName || 
        d.firstName === talkedToName
      );
      
      if (newDirectorIndex === -1) throw new Error(`Director not found for name: ${talkedToName}`);

      // 1) COMPANY-LEVEL SINGLETON: Mark ALL follow-ups across ALL directors as 'updated'
      // (Except the one we are updating, which will become the new active one)
      directors.forEach((director, idx) => {
        const updatedFollowUps = (director.followUps || []).map(f => {
          if (f.id !== followUp.id && (!f.status || f.status === "active")) {
            return { ...f, status: "updated" as const };
          }
          return f;
        });
        directors[idx].followUps = updatedFollowUps;
      });

      // Remove from old director
      const [existingFollowUp] = directors[currentDirectorIndex].followUps!.splice(followUpIndex, 1);

      // Update follow-up data
      const updatedFollowUp: FollowUp = {
        ...existingFollowUp,
        ...followUp,
        status: "active", // Ensure it's active
      };

      // Add to new director (or same if didn't change)
      directors[newDirectorIndex].followUps = directors[newDirectorIndex].followUps || [];
      directors[newDirectorIndex].followUps.push(updatedFollowUp);

      // Calculate next follow-up date
      const nextDate = calculateNextFollowUpDate({ ...leadData, directors });

      // Prepare updates
      const updates: any = {
        directors,
        nextFollowUpDate: nextDate
      };

      if (leadUpdates) {
        Object.assign(updates, leadUpdates);
        
        if (leadUpdates.status === 'Converted') {
          updates.assignedTo = null;
          updates.isAssigned = false;
          updates.assignedAt = null;
          updates.convertedAt = new Date().toISOString();
          updates.convertedBy = user?.id;
        }
        
        if (leadUpdates.status === 'Lost') {
           updates.lostAt = new Date().toISOString();
           updates.lostBy = user?.id;
        }
      }

      transaction.update(leadRef, updates);
    });
    return true;
  } catch (error) {
    console.error("Error updating follow-up:", error);
    throw error;
  }
};
```

**What it does**:
- Validates that follow-up date is not in the past
- Finds the current director holding the follow-up
- Infers the new director from `talkedTo` name (allows moving follow-ups between directors)
- **Company-Level Singleton Rule**: Marks all other active follow-ups as `status: "updated"`
- Sets the updated follow-up to `status: "active"`
- Recalculates `nextFollowUpDate`

---

### 🔹 `handleAddFollowUp()` - LeadDetail.tsx (Lines 149-186)

**Location**: [LeadDetail.tsx:149-186](file:///d:/Officials/Development/Projects/lead-management/src/components/LeadDetail.tsx#L149-L186)

```typescript
const handleAddFollowUp = async () => {
  if (!followUpDate || !followUpTime || !followUpRemark || !talkedTo) {
    toast.error('Please fill in all required fields');
    return;
  }

  // If status is Converted or Lost, we don't save here - the modals handle it
  if (followUpStatus === 'Converted') {
    setShowConvertedDialog(true);
    return;
  }

  if (followUpStatus === 'Lost') {
    setShowLostDialog(true);
    return;
  }

  try {
    const followUpData = {
      date: followUpDate,
      time: followUpTime,
      remark: followUpRemark,
      talkedTo,
      talkedToId,
      talkedToName,
      followUpStatus: followUpStatus as any
    };

    await addFollowUp(lead.id, followUpData);

    toast.success('Follow-up added successfully');
    setShowFollowUpDialog(false);
    resetFollowUpForm();
  } catch (error) {
    console.error('Error adding follow-up:', error);
    toast.error('Failed to add follow-up');
  }
};
```

**What it does**:
- Validates all required fields
- If `followUpStatus` is "Converted" or "Lost", opens respective dialogs instead of saving directly
- For normal statuses (Hot, Warm, Cold), calls `addFollowUp()` directly

---

## 3. Lead Update Functions

### 🔹 `updateLead()` - LeadsContext.tsx (Lines 470-514)

**Location**: [LeadsContext.tsx:470-514](file:///d:/Officials/Development/Projects/lead-management/src/components/LeadsContext.tsx#L470-L514)

```typescript
const updateLead = async (leadId: string, updates: Partial<Lead>): Promise<boolean> => {
  try {
    const leadDocRef = doc(db, "leads", leadId);

    // If we're updating directors, we need a transaction to preserve follow-ups
    // that might have been added in the background (race condition fix)
    if (updates.directors) {
      await runTransaction(db, async (t) => {
        const snap = await t.get(leadDocRef);
        if (!snap.exists()) throw new Error("Lead not found");
        
        const currentData = snap.data() as Lead;
        const currentDirectors = currentData.directors || [];
        
        // Merge logic: Use form data but preserve existing follow-ups from DB
        const mergedDirectors = updates.directors!.map(formDir => {
          const dbDir = currentDirectors.find(d => d.id === formDir.id);
          if (dbDir) {
            // Director exists in DB: Update details but keep DB follow-ups
            return {
              ...formDir,
              followUps: dbDir.followUps || []
            };
          }
          // New director: Keep as is
          return formDir;
        });

        // Apply the update with merged directors
        t.update(leadDocRef, {
          ...updates,
          directors: mergedDirectors
        });
      });
    } else {
      // Standard update for non-director fields
      await updateDoc(leadDocRef, { ...updates } as any);
    }
    
    return true;
  } catch (err) {
    console.error("updateLead error:", err);
    return false;
  }
};
```

**What it does**:
- Updates lead document in Firestore
- **Special handling for directors**: Uses transaction to preserve existing follow-ups (prevents race conditions)
- Merges form data with database follow-ups when updating directors
- For non-director updates, uses simple `updateDoc()`

---

### 🔹 `handleStatusChange()` - LeadDetail.tsx (Lines 188-208)

**Location**: [LeadDetail.tsx:188-208](file:///d:/Officials/Development/Projects/lead-management/src/components/LeadDetail.tsx#L188-L208)

```typescript
const handleStatusChange = (newStatus: string) => {
  if (newStatus === 'Lost') {
    setShowLostDialog(true);
    setSelectedStatus(lead.status); // Reset to current status
  } else if (newStatus === 'Converted') {
    // Company Admin, Sales User, and Team Lead can mark as converted
    if (!['company_admin', 'sales_user', 'team_lead'].includes(user?.role || '')) {
      toast.error('You do not have permission to mark leads as converted');
      setSelectedStatus(lead.status);
      return;
    }
    setShowConvertedDialog(true);
    setSelectedStatus(lead.status); // Reset to current status
  } else {
    // Hot, Warm, Cold - update directly
    updateLead(lead.id, { status: newStatus as Lead['status'] });
    setSelectedStatus(newStatus as Lead['status']);
    toast.success(`Lead status updated to ${newStatus}`);
  }
};
```

**What it does**:
- For "Lost": Opens lost dialog (requires remark)
- For "Converted": Checks permissions and opens converted dialog (requires invoice/project value)
- For "Hot", "Warm", "Cold": Updates status directly via `updateLead()`

---

## 4. Active Leads Auto-Movement Logic

### 🔹 Auto-Movement via `addFollowUp()` - LeadsContext.tsx

**How it works**:

1. **Lead Pool → Active Leads**: When the FIRST follow-up is added to a lead
   - `addFollowUp()` is called
   - The lead now has `followUpHistory.length > 0`
   - Active Leads filter checks: `hasFollowUps = (lead.followUpHistory?.length || 0) > 0`
   - Lead automatically appears in Active Leads page

2. **Active Leads → Converted**: When a lead is marked as converted
   - `handleMarkAsConverted()` calls `addFollowUp()` with `leadUpdates: { status: 'Converted', invoiceNo, projectValue }`
   - Inside `addFollowUp()`, special handling for Converted status:
     ```typescript
     if (leadUpdates.status === 'Converted') {
       updates.assignedTo = null;
       updates.isAssigned = false;
       updates.assignedAt = null;
       updates.convertedAt = new Date().toISOString();
       updates.convertedBy = user.id;
     }
     ```
   - Active Leads filter excludes: `if (lead.status === 'Converted') return false;`
   - Lead moves to Converted Leads page

3. **Active Leads → Lost**: When a lead is marked as lost
   - `handleMarkAsLost()` calls `addFollowUp()` with `leadUpdates: { status: 'Lost', lostRemark, lostBy }`
   - Inside `addFollowUp()`, special handling for Lost status:
     ```typescript
     if (leadUpdates.status === 'Lost') {
        updates.lostAt = new Date().toISOString();
        updates.lostBy = user.id;
     }
     ```
   - Active Leads filter excludes: `if (lead.status === 'Lost') return false;`
   - Lead moves to Lost Leads page

---

## 5. Active Leads Filtering Logic

### 🔹 Active Leads Filter - ActiveLeads.tsx (Lines 39-89)

**Location**: [ActiveLeads.tsx:39-89](file:///d:/Officials/Development/Projects/lead-management/src/components/ActiveLeads.tsx#L39-L89)

```typescript
const filteredLeads = useMemo(() => {
  return leads
    .filter(lead => {
      // Active Leads Definition:
      // 1. Must have at least 1 follow-up
      // 2. Must NOT be Converted
      // 3. Must NOT be Lost
      const hasFollowUps = (lead.followUpHistory?.length || 0) > 0;
      if (!hasFollowUps) return false;
      if (lead.status === 'Converted') return false;
      if (lead.status === 'Lost') return false;

      // Role-based filtering
      let hasAccess = false;
      if (user.role === 'super_admin' || user.role === 'company_admin' || user.role === 'team_lead') {
           // Admins and Team Leads see all active leads in their company
           if (user.companyId && lead.companyId === user.companyId) {
               hasAccess = true;
           } else if (!user.companyId && user.role === 'super_admin') {
               hasAccess = true; // Super admin sees all
           }
      } else if (user.role === 'sales_user') {
          // Sales Users see only their assigned leads
          if (lead.assignedTo === user.id) {
              hasAccess = true;
          }
      }

      if (!hasAccess) return false;

      const matchesSearch = 
        lead.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.cin && lead.cin.toLowerCase().includes(searchQuery.toLowerCase())) ||
        lead.directors.some(d => 
          `${d.firstName} ${d.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
        );
      
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Sort by latest follow-up (newest first)
      const lastFUA = a.followUpHistory?.at(-1);
      const lastFUB = b.followUpHistory?.at(-1);
      const dateA = lastFUA ? new Date(lastFUA.createdAt).getTime() : 0;
      const dateB = lastFUB ? new Date(lastFUB.createdAt).getTime() : 0;
      return dateB - dateA;
    });
}, [leads, searchQuery, statusFilter, user]);
```

**Active Leads Definition**:
1. ✅ `hasFollowUps = (lead.followUpHistory?.length || 0) > 0`
2. ❌ `lead.status !== 'Converted'`
3. ❌ `lead.status !== 'Lost'`

**Role-Based Visibility**:
- **Super Admin**: Sees all active leads across all companies
- **Company Admin / Team Lead**: Sees all active leads in their company
- **Sales User**: Sees only their assigned active leads (`lead.assignedTo === user.id`)

**Sorting**: By latest follow-up date (newest first)

---

### 🔹 Assigned Leads Filter - AssignedLeads.tsx (Lines 64-95)

**Location**: [AssignedLeads.tsx:64-95](file:///d:/Officials/Development/Projects/lead-management/src/components/AssignedLeads.tsx#L64-L95)

```typescript
const filteredLeads = useMemo(() => {
  return leads
    .filter(lead => {
      // Assigned Leads Definition:
      // 1. Must have at least 1 follow-up
      // 2. Must NOT be Converted
      // 3. Must NOT be Lost
      const hasFollowUps = (lead.followUpHistory?.length || 0) > 0;
      if (!hasFollowUps) return false;
      if (lead.status === 'Converted') return false;
      if (lead.status === 'Lost') return false;

      const matchesSearch = 
        lead.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.cin && lead.cin.toLowerCase().includes(searchQuery.toLowerCase())) ||
        lead.directors.some(d => 
          `${d.firstName} ${d.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
        );
      
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Sort by latest follow-up (newest first)
      const lastFUA = a.followUpHistory?.at(-1);
      const lastFUB = b.followUpHistory?.at(-1);
      const dateA = lastFUA ? new Date(lastFUA.createdAt).getTime() : 0;
      const dateB = lastFUB ? new Date(lastFUB.createdAt).getTime() : 0;
      return dateB - dateA;
    });
}, [leads, searchQuery, statusFilter]);
```

**Note**: Assigned Leads uses the same filtering criteria as Active Leads, but applies to a pre-filtered set based on assignment.

---

## 6. Director Follow-Up Placement

### 🔹 Follow-Ups Storage Location

**Follow-ups are stored inside `lead.directors[x].followUps[]`**

```typescript
// From LeadsContext.tsx - Director interface (Lines 40-50)
export interface Director {
  id: string;
  din: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  followUps?: FollowUp[];  // ← Follow-ups stored here
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
}
```

### 🔹 How Follow-Ups Are Assigned to Directors

**In `addFollowUp()` (Lines 567-597)**:

```typescript
// Infer director from talkedTo name
const talkedToName = followUpData.talkedTo;
const directorIndex = directors.findIndex(d => 
  `${d.firstName} ${d.lastName}` === talkedToName || 
  d.firstName === talkedToName // Fallback for single name
);

if (directorIndex === -1) throw new Error(`Director not found for name: ${talkedToName}`);

// Add new follow-up to the inferred director
directors[directorIndex].followUps = directors[directorIndex].followUps || [];
directors[directorIndex].followUps.push(newFollowUp);
```

**Logic**:
1. User selects "Talked To" from dropdown (populated with all directors)
2. System finds the director by matching `talkedTo` name with `${director.firstName} ${director.lastName}`
3. Follow-up is added to that director's `followUps[]` array

**There is NO `lead.followUpHistory` field** - this appears to be a legacy reference or documentation error. All follow-ups are stored within individual directors.

---

## 7. Field Assignment Logic

### 🔹 `isAssigned`, `assignedTo`, `assignedAt`

**Set by `assignLead()` - LeadsContext.tsx (Lines 516-533)**:

```typescript
const assignLead = async (leadId: string, userId: string): Promise<boolean> => {
  try {
    const leadRef = doc(db, "leads", leadId);
    await runTransaction(db, async (t) => {
      const snap = await t.get(leadRef);
      if (!snap.exists()) throw new Error("Lead not found");
      t.update(leadRef, {
        assignedTo: userId,           // ← User ID
        assignedAt: serverTimestamp(), // ← Timestamp
        isAssigned: true,              // ← Boolean flag
      });
    });
    return true;
  } catch (err) {
    console.error("assignLead error:", err);
    return false;
  }
};
```

**Cleared by `unassignLead()` - LeadsContext.tsx (Lines 535-548)**:

```typescript
const unassignLead = async (leadId: string): Promise<boolean> => {
  try {
    const leadRef = doc(db, "leads", leadId);
    await updateDoc(leadRef, {
      assignedTo: null,
      assignedAt: null,
      isAssigned: false,
    } as any);
    return true;
  } catch (err) {
    console.error("unassignLead error:", err);
    return false;
  }
};
```

**Also cleared when converting a lead** (in `addFollowUp()` when `status: 'Converted'`):

```typescript
if (leadUpdates.status === 'Converted') {
  updates.assignedTo = null;
  updates.isAssigned = false;
  updates.assignedAt = null;
  updates.convertedAt = new Date().toISOString();
  updates.convertedBy = user.id;
}
```

---

### 🔹 `lostBy`, `lostAt`, `lostRemark`

**Set by `markAsLost()` - LeadsContext.tsx (Lines 789-794)**:

```typescript
await updateDoc(leadRef, {
  status: "Lost",
  lostRemark: remark,    // ← Reason for marking as lost
  lostBy: userId,        // ← User ID who marked as lost
  lostAt: serverTimestamp(), // ← Timestamp
} as any);
```

**Also set by `addFollowUp()` when `status: 'Lost'`**:

```typescript
if (leadUpdates.status === 'Lost') {
   updates.lostAt = new Date().toISOString();
   updates.lostBy = user.id;
}
```

**Cleared by `restoreLostLead()` - LeadsContext.tsx (Lines 811-816)**:

```typescript
await updateDoc(leadRef, {
  status: "Cold",
  lostRemark: null,
  lostBy: null,
  lostAt: null,
} as any);
```

---

### 🔹 `followUpHistory`

**⚠️ IMPORTANT**: This field appears to be **legacy/unused** in the current codebase.

- Not set anywhere in the code
- Referenced in filters but likely always empty
- Follow-ups are actually stored in `lead.directors[x].followUps[]`

**Recommendation**: Either:
1. Remove references to `followUpHistory` from filters
2. Or implement a computed property/helper that aggregates all director follow-ups

---

### 🔹 `nextFollowUpDate`

**Set by `calculateNextFollowUpDate()` - LeadsContext.tsx (Lines 398-421)**:

```typescript
const calculateNextFollowUpDate = (lead: Lead): string | null => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const futureActiveFollowUps: { date: string, time: string }[] = [];
  
  lead.directors?.forEach(director => {
    (director.followUps || []).forEach(followUp => {
      const isActive = !followUp.status || followUp.status === "active";
      if (isActive && new Date(followUp.date) >= today) {
        futureActiveFollowUps.push({ date: followUp.date, time: followUp.time });
      }
    });
  });
  
  if (futureActiveFollowUps.length === 0) return null;
  
  // Sort and return earliest
  futureActiveFollowUps.sort((a, b) => {
    return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
  });
  
  return futureActiveFollowUps[0].date;
};
```

**Called by**:
- `addFollowUp()` after adding a new follow-up
- `updateFollowUp()` after updating a follow-up

**Logic**:
- Finds all **active** follow-ups across all directors
- Filters for **future** dates only
- Returns the **earliest** future follow-up date

---

## 8. Permission Logic

### 🔹 Permission Checks in Code

**No `canEditLead()` function exists** - permissions are checked inline using role comparisons.

### 🔹 Edit Lead Permission - LeadDetail.tsx (Lines 383-388, 757-762)

```typescript
{(user?.role === 'company_admin' || user?.role === 'team_lead') && (
  <Button onClick={onEdit} variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none">
    <Edit className="h-4 w-4" />
    <span className="hidden sm:inline">Edit</span>
  </Button>
)}
```

**Who can edit leads**:
- ✅ Company Admin
- ✅ Team Lead
- ❌ Sales User
- ❌ Super Admin (view-only in lead detail)

---

### 🔹 Mark as Converted Permission - LeadDetail.tsx (Lines 193-199)

```typescript
if (!['company_admin', 'sales_user', 'team_lead'].includes(user?.role || '')) {
  toast.error('You do not have permission to mark leads as converted');
  setSelectedStatus(lead.status);
  return;
}
```

**Who can mark as converted**:
- ✅ Company Admin
- ✅ Team Lead
- ✅ Sales User
- ❌ Super Admin

---

### 🔹 Restore Lost Lead Permission - LostLeads.tsx (Lines 62-66)

```typescript
if (user?.role === 'sales_user') {
  toast.error('You do not have permission to restore lost leads.');
  return;
}
```

**Who can restore lost leads**:
- ✅ Company Admin
- ✅ Team Lead
- ✅ Super Admin
- ❌ Sales User

---

### 🔹 Delete Lost Lead Permission - LostLeads.tsx (Lines 92-96)

```typescript
if (!user?.role || !['super_admin', 'company_admin', 'team_lead'].includes(user.role)) {
  toast.error('You don\'t have permission to permanently delete lost leads.');
  return;
}
```

**Who can permanently delete lost leads**:
- ✅ Super Admin
- ✅ Company Admin
- ✅ Team Lead
- ❌ Sales User

---

### 🔹 Lost Leads Visibility - LostLeads.tsx (Lines 53-58)

```typescript
if (['super_admin', 'company_admin', 'team_lead'].includes(user?.role || '')) {
  return matchesSearch;
} else if (user?.role === 'sales_user') {
  return matchesSearch && lostLead.lostBy === user?.id;
}
```

**Who can see lost leads**:
- **Super Admin / Company Admin / Team Lead**: All lost leads
- **Sales User**: Only leads they marked as lost

---

### 🔹 Reassign Lead Permission - AssignedLeads.tsx (Lines 117-124)

```typescript
if (!canAssignToUser(user.role, targetUser.role)) {
  if (user.role === 'team_lead') {
    toast.error('Team Leaders can only reassign leads to Sales Users.');
  } else {
    toast.error('You cannot assign leads to this user');
  }
  return;
}
```

Uses `canAssignToUser()` from `src/types/roles.ts`:

```typescript
// From roles.ts
export function canAssignToUser(assignerRole: RoleKey, targetRole: RoleKey): boolean {
  const assignerLevel = ROLE_HIERARCHY[assignerRole];
  const targetLevel = ROLE_HIERARCHY[targetRole];
  
  // Team Leads can only assign to Sales Users
  if (assignerRole === 'team_lead') {
    return targetRole === 'sales_user';
  }
  
  // Company Admins can assign to Team Leads and Sales Users
  if (assignerRole === 'company_admin') {
    return targetRole === 'team_lead' || targetRole === 'sales_user';
  }
  
  // Super Admins can assign to anyone
  return assignerRole === 'super_admin';
}
```

**Assignment Rules**:
- **Super Admin**: Can assign to anyone
- **Company Admin**: Can assign to Team Leads and Sales Users
- **Team Lead**: Can assign to Sales Users only
- **Sales User**: Cannot assign

---

### 🔹 View Financial Data Permission - LeadDetail.tsx (Lines 696)

```typescript
{user?.role && hasPermission(user.role, 'VIEW_FINANCIAL_DATA') ? (
  // Show invoice and project value
) : (
  // Show restricted message
)}
```

Uses `hasPermission()` from `src/types/roles.ts`:

```typescript
// From roles.ts
export function hasPermission(role: RoleKey, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

// Permissions
const ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  super_admin: ['VIEW_FINANCIAL_DATA', 'MANAGE_USERS', 'MANAGE_COMPANIES', ...],
  company_admin: ['VIEW_FINANCIAL_DATA', 'MANAGE_USERS', ...],
  team_lead: [], // No financial data access
  sales_user: [], // No financial data access
};
```

**Who can view financial data (invoice, project value)**:
- ✅ Super Admin
- ✅ Company Admin
- ❌ Team Lead
- ❌ Sales User

---

## 📊 Summary Tables

### Lead Status Transitions

| From Status | To Status | Triggered By | Function | Auto-Unassigns? |
|------------|-----------|--------------|----------|-----------------|
| Any | Lost | User action | `handleMarkAsLost()` → `addFollowUp()` | No |
| Any | Converted | User action | `handleMarkAsConverted()` → `addFollowUp()` | Yes |
| Lost | Cold | Restore action | `restoreLostLead()` | No |
| Any | Hot/Warm/Cold | Status dropdown | `handleStatusChange()` → `updateLead()` | No |

### Follow-Up Lifecycle

| Status | Meaning | Set When | Displayed In |
|--------|---------|----------|--------------|
| `active` | Current/latest follow-up | New follow-up created or updated | Calendar, Lead Detail (Active section) |
| `updated` | Superseded by newer follow-up | Another follow-up becomes active | History Modal only |
| `undefined` | Legacy (treated as active) | Old follow-ups before status field | Treated as `active` |

### Permission Matrix

| Action | Super Admin | Company Admin | Team Lead | Sales User |
|--------|-------------|---------------|-----------|------------|
| Edit Lead | ❌ (View only) | ✅ | ✅ | ❌ |
| Mark as Converted | ❌ | ✅ | ✅ | ✅ |
| Mark as Lost | ✅ | ✅ | ✅ | ✅ |
| Restore Lost Lead | ✅ | ✅ | ✅ | ❌ |
| Delete Lost Lead | ✅ | ✅ | ✅ | ❌ |
| View Financial Data | ✅ | ✅ | ❌ | ❌ |
| Assign to Anyone | ✅ | ❌ | ❌ | ❌ |
| Assign to Team Lead/Sales | ❌ | ✅ | ❌ | ❌ |
| Assign to Sales User | ❌ | ✅ | ✅ | ❌ |

---

## 🐛 Potential Issues Found

### 1. **`followUpHistory` Field is Unused**

**Problem**: Active Leads and Assigned Leads filters check:
```typescript
const hasFollowUps = (lead.followUpHistory?.length || 0) > 0;
```

But `followUpHistory` is never populated. Follow-ups are stored in `lead.directors[x].followUps[]`.

**Impact**: Active Leads and Assigned Leads pages will always be empty!

**Fix**: Replace with:
```typescript
const hasFollowUps = lead.directors?.some(d => (d.followUps?.length || 0) > 0) || false;
```

---

### 2. **No Permission Check for Marking as Lost**

**Problem**: Any role can mark leads as lost (no permission check in `handleMarkAsLost()`).

**Current Behavior**: Sales Users, Team Leads, Company Admins, and Super Admins can all mark leads as lost.

**Recommendation**: Clarify if this is intentional or add role restrictions.

---

### 3. **Super Admin Cannot Edit Leads**

**Problem**: Super Admin is excluded from edit permissions in `LeadDetail.tsx`.

**Current Code**:
```typescript
{(user?.role === 'company_admin' || user?.role === 'team_lead') && (
  <Button onClick={onEdit}>Edit Lead</Button>
)}
```

**Recommendation**: Add Super Admin to edit permissions if they should have full access.

---

## 🎯 Key Takeaways

1. **Follow-ups are stored per-director** in `lead.directors[x].followUps[]`
2. **Company-level singleton rule**: Only ONE active follow-up per company (enforced by marking others as "updated")
3. **Auto-movement** happens via status changes in `addFollowUp()`
4. **Active Leads definition**: Has follow-ups AND not Converted/Lost
5. **Permission checks** are inline (no centralized `canEditLead()` function)
6. **Critical bug**: `followUpHistory` field is checked but never populated

---

*Report generated on 2025-11-26*
