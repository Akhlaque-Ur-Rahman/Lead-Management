# Role Identifier System

This document outlines the role identifier system implemented in the Lead Management System.

## Role Definitions

Each role in the system has been assigned a unique identifier for better management and permissions handling.

| Role ID | Role Key | Role Label | Description | Permission Level |
|---------|----------|------------|-------------|------------------|
| **1** | `super_admin` | Super Admin | Platform administrator with full access to all companies | 4 (Highest) |
| **2** | `company_admin` | Company Admin | Company administrator with full access to company data | 3 |
| **3** | `team_lead` | Team Lead | Team leader with access to team management and reports | 2 |
| **4** | `sales_user` | Sales User | Sales user with access to assigned leads | 1 (Base) |

## Implementation Details

### File Structure

- **`src/types/roles.ts`** - Central role configuration file containing:
  - Role definitions with identifiers
  - Role utility functions
  - Permission mappings
  - Badge variant mappings

### Key Functions

#### Role Lookup Functions
```typescript
getRoleById(id: RoleId): RoleConfig | undefined
getRoleByKey(key: RoleKey): RoleConfig | undefined
getRoleLabel(key: RoleKey): string
getRoleId(key: RoleKey): RoleId | undefined
getRoleKeyById(id: RoleId): RoleKey | undefined
```

#### Permission Functions
```typescript
hasHigherOrEqualRole(userRole: RoleKey, requiredRole: RoleKey): boolean
canManageRole(userRole: RoleKey, targetRole: RoleKey): boolean
hasPermission(userRole: RoleKey, permission: keyof typeof PERMISSIONS): boolean
```

#### UI Functions
```typescript
getRoleBadgeVariant(key: RoleKey): 'destructive' | 'default' | 'secondary' | 'outline'
getAllRoles(): RoleConfig[]
getAssignableRoles(userRole: RoleKey): RoleConfig[]
```

## User Interface

### User Object Schema
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: RoleKey;              // e.g., 'super_admin'
  roleId: RoleId;             // e.g., 1
  companyId: string | null;   // null for super_admin
  createdAt: string;
  isActive: boolean;
}
```

### Automatic Role ID Assignment

When creating or updating users, the `roleId` is automatically assigned based on the `role` key:

```typescript
// In addUser
const roleId = getRoleId(userData.role) || 4; // Default to sales_user if not found

// In updateUser
const roleId = updates.role ? getRoleId(updates.role) : undefined;
```

## Permissions System

### Permission Matrix

| Permission | Super Admin | Company Admin | Team Lead | Sales User |
|-----------|------------|---------------|-----------|------------|
| VIEW_DASHBOARD | ✅ | ✅ | ✅ | ✅ |
| VIEW_LEAD_POOL | ✅ | ✅ | ✅ | ✅ |
| VIEW_ASSIGNED_LEADS | ✅ | ✅ | ✅ | ✅ |
| VIEW_CALENDAR | ✅ | ✅ | ✅ | ✅ |
| VIEW_LOST_LEADS | ✅ | ✅ | ✅ | ✅ |
| VIEW_REPORTS | ✅ | ✅ | ✅ | ✅ |
| **VIEW_CONVERTED_LEADS** | ✅ | ✅ | ❌ | ❌ |
| **VIEW_FINANCIAL_DATA** | ✅ | ✅ | ❌ | ❌ |
| **DELETE_LOST_LEADS_PERMANENT** | ✅ | ✅ | ❌ | ❌ |
| MANAGE_USERS | ✅ | ✅ | ✅ | ❌ |
| MANAGE_COMPANIES | ✅ | ❌ | ❌ | ❌ |
| MANAGE_SETTINGS | ✅ | ✅ | ❌ | ❌ |
| DELETE_LOST_LEADS | ✅ | ❌ | ❌ | ❌ |
| RESTORE_LOST_LEADS | ✅ | ✅ | ❌ | ❌ |
| ASSIGN_LEADS | ✅ | ✅ | ✅ (Sales Only) | ❌ |
| EDIT_ALL_LEADS | ✅ | ✅ | ✅ | ❌ |
| EDIT_ASSIGNED_LEADS | ❌ | ❌ | ❌ | ✅ |
| IMPORT_LEADS | ❌ | ✅ | ✅ | ❌ |

### Usage Example
```typescript
import { hasPermission } from '../types/roles';

if (hasPermission(user.role, 'MANAGE_COMPANIES')) {
  // Show company management UI
}
```

## Role Hierarchy

### Permission Levels
- **Level 4 (Super Admin)**: Full platform access
- **Level 3 (Company Admin)**: Full company access
- **Level 2 (Team Lead)**: Team and reporting access
- **Level 1 (Sales User)**: Individual lead access

### Role Management Rules

1. **Super Admin** can create and manage all roles
2. **Company Admin** can create and manage Team Leads and Sales Users
3. **Team Lead** can create and manage Sales Users only
4. **Sales User** cannot manage other users

```typescript
canManageRole(userRole: RoleKey, targetRole: RoleKey): boolean
```

## Badge Variants

Visual representation in UI:

| Role | Badge Variant | Color Theme |
|------|--------------|-------------|
| Super Admin | `destructive` | Red |
| Company Admin | `default` | Primary |
| Team Lead | `secondary` | Gray |
| Sales User | `outline` | Bordered |

## Files Updated

The following files have been updated to use the role identifier system:

1. **`src/types/roles.ts`** - ✅ New file created
2. **`src/components/AuthContext.tsx`** - ✅ Updated with roleId
3. **`src/components/Sidebar.tsx`** - ✅ Uses role utilities
4. **`src/components/UserManagement.tsx`** - ✅ Uses role utilities
5. **`src/components/Login.tsx`** - ✅ Uses RoleKey type

## Benefits

1. **Type Safety**: TypeScript ensures correct role usage
2. **Centralized Management**: All role logic in one place
3. **Easy Maintenance**: Change role properties in one location
4. **Consistent UI**: Badge variants and labels always match
5. **Permission Control**: Clear permission matrix
6. **Extensibility**: Easy to add new roles or permissions

## Migration Notes

- Existing users in localStorage will automatically get `roleId` assigned on next update
- No data migration required for existing installations
- Role identifiers are backward compatible with existing role keys

## Team Leader Financial Data Restrictions (November 4, 2025)

### Overview
Team Leaders now have restricted access to financial data and certain administrative functions to maintain operational efficiency while protecting sensitive information.

### New Permissions

1. **VIEW_CONVERTED_LEADS**
   - Restricts access to the Converted Leads page
   - Only Super Admin and Company Admin can view
   - Team Leaders and Sales Users denied

2. **VIEW_FINANCIAL_DATA**
   - Controls visibility of Invoice Numbers and Project Values
   - Financial fields hidden from Team Leaders across all pages
   - Replacement message shown: *"Financial data is restricted. Contact your Company Admin for details."*

3. **DELETE_LOST_LEADS_PERMANENT**
   - Restricts permanent deletion of lost leads
   - Team Leaders can view and restore, but not permanently delete
   - Ensures data recovery options remain available

### Implementation

```typescript
// In LeadDetail.tsx - Conditional financial data display
{user?.role && hasPermission(user.role, 'VIEW_FINANCIAL_DATA') ? (
  <>
    <div>Invoice Number: {lead.invoiceNo}</div>
    <div>Project Value: ₹{lead.projectValue}</div>
  </>
) : (
  <div>Financial data is restricted. Contact your Company Admin for details.</div>
)}

// In ConvertedLeads.tsx - Page access control
if (!hasPermission(user.role, 'VIEW_CONVERTED_LEADS')) {
  return <AccessDenied />;
}

// In LostLeads.tsx - Permanent delete restriction
{hasPermission(user.role, 'DELETE_LOST_LEADS_PERMANENT') && (
  <Button onClick={handlePermanentDelete}>Delete Permanently</Button>
)}
```

### What Team Leaders Can Do

✅ **Full Operational Access**:
- View all company leads (without financial data)
- Assign leads to Sales Users
- Manage follow-ups for their team
- View reports and analytics (performance metrics)
- Create and manage Sales Users
- Restore temporarily lost leads
- Update lead status (except Converted)

### What Team Leaders Cannot Do

❌ **Financial & Administrative Restrictions**:
- View Converted Leads page
- See Invoice Numbers or Project Values
- Mark leads as Converted
- Permanently delete lost leads
- Assign leads to Company Admins or other Team Leaders
- Access company Settings
- View revenue or financial summaries

### Benefits

- **Data Security**: Financial information protected from unauthorized access
- **Role Clarity**: Clear separation of operational vs. financial responsibilities
- **Compliance**: Better audit trails for sensitive data access
- **User Experience**: Informative messages explain restrictions
- **Consistency**: Centralized `hasPermission()` enforcement

## Future Enhancements

- Database storage of role configurations
- Dynamic role creation
- Fine-grained permission system
- Role-based API access control
- Audit logging for role changes
- Financial data access logs and audit trails
