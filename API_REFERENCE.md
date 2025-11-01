# API Reference Guide

This document provides detailed API references for all Context providers and utility functions in the Lead Management System.

---

## Table of Contents
1. [AuthContext API](#authcontext-api)
2. [LeadsContext API](#leadscontext-api)
3. [CompanyContext API](#companycontext-api)
4. [Role Utilities API](#role-utilities-api)

---

## AuthContext API

**Location**: `src/components/AuthContext.tsx`

### Hook Usage
```typescript
import { useAuth } from './components/AuthContext';

const {
  user,
  users,
  login,
  logout,
  addUser,
  updateUser,
  deleteUser,
  getUsersByCompany,
  isLoading
} = useAuth();
```

### State Properties

#### `user: User | null`
Currently authenticated user object or null if not logged in.

**Type**:
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  roleId: RoleId;
  companyId: string | null;
  createdAt: string;
  isActive: boolean;
}
```

**Example**:
```typescript
const { user } = useAuth();
console.log(user?.name); // "Rajesh Kumar"
console.log(user?.role); // "company_admin"
```

---

#### `users: User[]`
Array of all users in the system.

**Example**:
```typescript
const { users } = useAuth();
const activeUsers = users.filter(u => u.isActive);
```

---

#### `isLoading: boolean`
Authentication loading state.

**Example**:
```typescript
const { isLoading } = useAuth();
if (isLoading) return <LoadingSpinner />;
```

---

### Methods

#### `login(email: string, password: string): Promise<boolean>`
Authenticates a user with email and password.

**Parameters**:
- `email` (string): User's email address
- `password` (string): User's password

**Returns**: Promise<boolean> - true if login successful, false otherwise

**Example**:
```typescript
const { login } = useAuth();

const handleLogin = async () => {
  const success = await login('rajesh@abcmotors.com', 'admin123');
  if (success) {
    // Redirect to dashboard
  } else {
    // Show error message
  }
};
```

---

#### `logout(): void`
Logs out the current user and clears session.

**Example**:
```typescript
const { logout } = useAuth();

const handleLogout = () => {
  logout();
  // User is logged out, redirected to login page
};
```

---

#### `addUser(userData): void`
Creates a new user in the system.

**Parameters**:
```typescript
userData: Omit<User, 'id' | 'createdAt' | 'roleId'> & { password: string }
```

**Example**:
```typescript
const { addUser } = useAuth();

addUser({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'sales_user',
  companyId: 'company-1',
  isActive: true,
  password: 'password123'
});
// roleId is automatically assigned based on role
```

---

#### `updateUser(userId: string, updates): void`
Updates an existing user's information.

**Parameters**:
- `userId` (string): ID of user to update
- `updates`: Partial<User> & { password?: string }

**Example**:
```typescript
const { updateUser } = useAuth();

// Update user details
updateUser('user-1-1', {
  name: 'Updated Name',
  isActive: false
});

// Update role (roleId updates automatically)
updateUser('user-1-1', {
  role: 'team_lead'
});

// Update password
updateUser('user-1-1', {
  password: 'newPassword123'
});
```

---

#### `deleteUser(userId: string): void`
Deletes a user from the system.

**Parameters**:
- `userId` (string): ID of user to delete

**Example**:
```typescript
const { deleteUser } = useAuth();

deleteUser('user-1-3');
// User and credentials are removed
```

---

#### `getUsersByCompany(companyId: string): User[]`
Retrieves all users belonging to a specific company.

**Parameters**:
- `companyId` (string): Company ID to filter by

**Returns**: User[] - Array of users in the company

**Example**:
```typescript
const { getUsersByCompany } = useAuth();

const companyUsers = getUsersByCompany('company-1');
console.log(companyUsers.length); // Number of users in company-1
```

---

## LeadsContext API

**Location**: `src/components/LeadsContext.tsx`

### Hook Usage
```typescript
import { useLeads } from './components/LeadsContext';

const {
  leads,
  setLeads,
  lostLeads,
  setLostLeads,
  fieldConfigs,
  setFieldConfigs,
  addLead,
  updateLead,
  assignLead,
  unassignLead,
  addDirectorFollowUp,
  markAsLost,
  restoreLostLead,
  permanentlyDeleteLost,
  getLeadsByCompany,
  getUnassignedLeads,
  getAssignedLeads,
  getLeadsAssignedToUser,
  getDirectorFollowUpsForDate
} = useLeads();
```

### State Properties

#### `leads: Lead[]`
Array of all active leads.

**Type**:
```typescript
interface Lead {
  id: string;
  companyId: string;
  cin: string;
  companyName: string;
  // ... (see Data Models in PROJECT_DOCUMENTATION.md)
  directors: Director[];
  status: 'Hot' | 'Warm' | 'Cold' | 'Converted' | 'Lost';
  isAssigned: boolean;
  assignedTo: string | null;
  followUpDate: string;
  notes: string;
}
```

---

#### `lostLeads: LostLead[]`
Array of leads marked as lost.

**Type**:
```typescript
interface LostLead {
  lead: Lead;
  lostBy: string;
  lostDate: string;
  lostRemark: string;
  isPermanent: boolean;
}
```

---

#### `fieldConfigs: FieldConfig[]`
Customizable field configurations for lead forms and Excel import.

**Type**:
```typescript
interface FieldConfig {
  id: string;
  label: string;
  key: keyof Lead;
  type: 'text' | 'email' | 'tel' | 'date' | 'textarea' | 'select';
  required: boolean;
  showInForm: boolean;
  showInExcel: boolean;
  excelHeader: string;
  options?: string[];
}
```

---

### Methods

#### `addLead(leadData): void`
Creates a new lead.

**Parameters**:
```typescript
leadData: Omit<Lead, 'id' | 'createdAt' | 'isAssigned' | 'assignedTo'>
```

**Example**:
```typescript
const { addLead } = useLeads();

addLead({
  companyId: 'company-1',
  cin: 'U12345DL2020PTC123456',
  companyName: 'Example Corp',
  authorisedCapital: '10,00,000',
  paidUpCapital: '5,00,000',
  dateOfIncorporation: '2020-01-15',
  registeredAddress: 'Delhi',
  companyEmail: 'info@example.com',
  directors: [{
    id: 'dir-1',
    din: '12345678',
    firstName: 'John',
    lastName: 'Doe',
    mobile: '+91 98765 43210',
    email: 'john@example.com',
    followUps: []
  }],
  din: '12345678',
  directorFirstName: 'John',
  directorLastName: 'Doe',
  mobile: '+91 98765 43210',
  directorEmail: 'john@example.com',
  status: 'Hot',
  followUpDate: '2025-11-05',
  notes: 'Promising lead',
  uploadedBy: 'user-1-1',
  followUpHistory: []
});
```

---

#### `updateLead(leadId: string, updates: Partial<Lead>): void`
Updates an existing lead.

**Example**:
```typescript
const { updateLead } = useLeads();

updateLead('lead-1-1', {
  status: 'Warm',
  notes: 'Had initial conversation',
  followUpDate: '2025-11-10'
});
```

---

#### `assignLead(leadId: string, userId: string): void`
Assigns a lead to a user.

**Example**:
```typescript
const { assignLead } = useLeads();

assignLead('lead-1-1', 'user-1-3');
// Lead is now assigned to user-1-3 with assignedAt timestamp
```

---

#### `unassignLead(leadId: string): void`
Removes lead assignment.

**Example**:
```typescript
const { unassignLead } = useLeads();

unassignLead('lead-1-1');
// Lead returns to unassigned pool
```

---

#### `addDirectorFollowUp(leadId: string, directorId: string, followUp): void`
Adds a follow-up for a specific director.

**Parameters**:
```typescript
followUp: Omit<FollowUp, 'id'>

interface FollowUp {
  date: string;        // YYYY-MM-DD
  time: string;        // HH:MM
  remark: string;
  createdBy: string;   // User ID
  createdAt: string;   // ISO timestamp
  directorId?: string;
  directorName?: string;
}
```

**Example**:
```typescript
const { addDirectorFollowUp } = useLeads();

addDirectorFollowUp('lead-1-1', 'dir-1-1-1', {
  date: '2025-11-05',
  time: '10:00',
  remark: 'Initial discussion about products',
  createdBy: 'user-1-3',
  createdAt: new Date().toISOString(),
  directorId: 'dir-1-1-1',
  directorName: 'Rahul Verma'
});
```

---

#### `markAsLost(leadId: string, remark: string, userId: string, isPermanent: boolean): void`
Marks a lead as lost.

**Parameters**:
- `leadId` (string): Lead ID
- `remark` (string): Reason for marking as lost
- `userId` (string): User ID performing the action
- `isPermanent` (boolean): If true, lead cannot be restored

**Example**:
```typescript
const { markAsLost } = useLeads();

// Temporary lost (can be restored)
markAsLost('lead-1-1', 'Not interested currently', 'user-1-3', false);

// Permanent lost (cannot be restored)
markAsLost('lead-1-2', 'Company closed', 'user-1-1', true);
```

---

#### `restoreLostLead(lostLeadIndex: number): void`
Restores a temporarily lost lead.

**Example**:
```typescript
const { restoreLostLead, lostLeads } = useLeads();

// Find index of lead to restore
const index = lostLeads.findIndex(ll => ll.lead.id === 'lead-1-1');
if (index !== -1 && !lostLeads[index].isPermanent) {
  restoreLostLead(index);
}
```

---

#### `permanentlyDeleteLost(lostLeadIndex: number): void`
Permanently deletes a lost lead (Super Admin only).

**Example**:
```typescript
const { permanentlyDeleteLost } = useLeads();

permanentlyDeleteLost(0); // Deletes first lost lead
```

---

#### `getLeadsByCompany(companyId: string): Lead[]`
Retrieves all leads for a company.

**Example**:
```typescript
const { getLeadsByCompany } = useLeads();

const companyLeads = getLeadsByCompany('company-1');
console.log(`Total leads: ${companyLeads.length}`);
```

---

#### `getUnassignedLeads(companyId: string): Lead[]`
Retrieves unassigned leads for a company.

**Example**:
```typescript
const { getUnassignedLeads } = useLeads();

const availableLeads = getUnassignedLeads('company-1');
// These are leads in the pool, ready to be assigned
```

---

#### `getAssignedLeads(companyId: string): Lead[]`
Retrieves assigned leads for a company.

**Example**:
```typescript
const { getAssignedLeads } = useLeads();

const assignedLeads = getAssignedLeads('company-1');
// These are leads currently assigned to users
```

---

#### `getLeadsAssignedToUser(userId: string): Lead[]`
Retrieves leads assigned to a specific user.

**Example**:
```typescript
const { getLeadsAssignedToUser } = useLeads();
const { user } = useAuth();

const myLeads = getLeadsAssignedToUser(user.id);
console.log(`I have ${myLeads.length} leads assigned to me`);
```

---

#### `getDirectorFollowUpsForDate(date: string, companyId?: string): Array<{lead: Lead; director: Director; followUp: FollowUp}>`
Retrieves all follow-ups scheduled for a specific date.

**Parameters**:
- `date` (string): Date in YYYY-MM-DD format
- `companyId` (string, optional): Filter by company

**Returns**: Array of objects containing lead, director, and follow-up information

**Example**:
```typescript
const { getDirectorFollowUpsForDate } = useLeads();

const todayFollowUps = getDirectorFollowUpsForDate('2025-11-01', 'company-1');

todayFollowUps.forEach(({ lead, director, followUp }) => {
  console.log(`${followUp.time} - Call ${director.firstName} at ${lead.companyName}`);
});
```

---

## CompanyContext API

**Location**: `src/components/CompanyContext.tsx`

### Hook Usage
```typescript
import { useCompanies } from './components/CompanyContext';

const {
  companies,
  addCompany,
  updateCompany,
  deleteCompany,
  getCompany
} = useCompanies();
```

### State Properties

#### `companies: Company[]`
Array of all companies in the system.

**Type**:
```typescript
interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  createdAt: string;
  isActive: boolean;
  subscriptionPlan: 'basic' | 'professional' | 'enterprise';
  maxUsers: number;
}
```

---

### Methods

#### `addCompany(companyData): void`
Creates a new company.

**Parameters**:
```typescript
companyData: Omit<Company, 'id' | 'createdAt'>
```

**Example**:
```typescript
const { addCompany } = useCompanies();

addCompany({
  name: 'New Company Ltd',
  email: 'info@newcompany.com',
  phone: '+91 98765 43213',
  address: 'Mumbai, India',
  isActive: true,
  subscriptionPlan: 'professional',
  maxUsers: 50
});
```

---

#### `updateCompany(companyId: string, updates: Partial<Company>): void`
Updates company information.

**Example**:
```typescript
const { updateCompany } = useCompanies();

updateCompany('company-1', {
  subscriptionPlan: 'enterprise',
  maxUsers: 100
});
```

---

#### `deleteCompany(companyId: string): void`
Deletes a company (Super Admin only).

**Example**:
```typescript
const { deleteCompany } = useCompanies();

deleteCompany('company-3');
```

---

#### `getCompany(companyId: string): Company | undefined`
Retrieves a specific company by ID.

**Example**:
```typescript
const { getCompany } = useCompanies();

const company = getCompany('company-1');
if (company) {
  console.log(company.name); // "ABC Motors Pvt Ltd"
}
```

---

## Role Utilities API

**Location**: `src/types/roles.ts`

### Import
```typescript
import {
  ROLES,
  PERMISSIONS,
  getRoleById,
  getRoleByKey,
  getRoleLabel,
  getRoleId,
  getRoleKeyById,
  hasHigherOrEqualRole,
  canManageRole,
  hasPermission,
  getAllRoles,
  getAssignableRoles,
  getRoleBadgeVariant
} from './types/roles';
```

---

### Constants

#### `ROLES`
Object containing all role configurations.

**Structure**:
```typescript
const ROLES = {
  SUPER_ADMIN: { id: 1, key: 'super_admin', label: 'Super Admin', level: 4 },
  COMPANY_ADMIN: { id: 2, key: 'company_admin', label: 'Company Admin', level: 3 },
  TEAM_LEAD: { id: 3, key: 'team_lead', label: 'Team Lead', level: 2 },
  SALES_USER: { id: 4, key: 'sales_user', label: 'Sales User', level: 1 }
}
```

---

#### `PERMISSIONS`
Permission matrix mapping permissions to allowed roles.

**Example**:
```typescript
PERMISSIONS = {
  VIEW_DASHBOARD: ['super_admin', 'company_admin', 'team_lead', 'sales_user'],
  MANAGE_COMPANIES: ['super_admin'],
  ASSIGN_LEADS: ['super_admin', 'company_admin', 'team_lead']
}
```

---

### Functions

#### `getRoleById(id: RoleId): RoleConfig | undefined`
Get role configuration by numeric ID.

**Example**:
```typescript
const role = getRoleById(1);
console.log(role.label); // "Super Admin"
```

---

#### `getRoleByKey(key: RoleKey): RoleConfig | undefined`
Get role configuration by string key.

**Example**:
```typescript
const role = getRoleByKey('company_admin');
console.log(role.level); // 3
```

---

#### `getRoleLabel(key: RoleKey): string`
Get display label for a role.

**Example**:
```typescript
const label = getRoleLabel('team_lead');
console.log(label); // "Team Lead"
```

---

#### `getRoleId(key: RoleKey): RoleId | undefined`
Get numeric ID for a role key.

**Example**:
```typescript
const id = getRoleId('sales_user');
console.log(id); // 4
```

---

#### `getRoleKeyById(id: RoleId): RoleKey | undefined`
Get role key from numeric ID.

**Example**:
```typescript
const key = getRoleKeyById(2);
console.log(key); // "company_admin"
```

---

#### `hasHigherOrEqualRole(userRole: RoleKey, requiredRole: RoleKey): boolean`
Check if user role has equal or higher permission level.

**Example**:
```typescript
const canAccess = hasHigherOrEqualRole('company_admin', 'team_lead');
console.log(canAccess); // true (level 3 >= level 2)

const canAccess2 = hasHigherOrEqualRole('sales_user', 'team_lead');
console.log(canAccess2); // false (level 1 < level 2)
```

---

#### `canManageRole(userRole: RoleKey, targetRole: RoleKey): boolean`
Check if user can manage/create users with target role.

**Example**:
```typescript
// Company admin can manage team leads
const canManage = canManageRole('company_admin', 'team_lead');
console.log(canManage); // true

// Team lead cannot manage company admins
const canManage2 = canManageRole('team_lead', 'company_admin');
console.log(canManage2); // false
```

---

#### `hasPermission(userRole: RoleKey, permission: keyof typeof PERMISSIONS): boolean`
Check if user role has a specific permission.

**Example**:
```typescript
if (hasPermission(user.role, 'MANAGE_COMPANIES')) {
  // Show company management menu
}

if (hasPermission(user.role, 'ASSIGN_LEADS')) {
  // Show assign button
}
```

---

#### `getAllRoles(): RoleConfig[]`
Get array of all role configurations.

**Example**:
```typescript
const roles = getAllRoles();
// Use in dropdown
roles.map(role => (
  <option key={role.id} value={role.key}>
    {role.label}
  </option>
))
```

---

#### `getAssignableRoles(userRole: RoleKey): RoleConfig[]`
Get roles that a user can assign/create.

**Example**:
```typescript
const { user } = useAuth();
const assignableRoles = getAssignableRoles(user.role);

// Company admin sees: Company Admin, Team Lead, Sales User
// Team lead sees: Team Lead, Sales User
// Sales user sees: [] (empty array)
```

---

#### `getRoleBadgeVariant(key: RoleKey): BadgeVariant`
Get UI badge variant for a role.

**Returns**: 'destructive' | 'default' | 'secondary' | 'outline'

**Example**:
```typescript
const variant = getRoleBadgeVariant('super_admin');
// Returns 'destructive' (red badge)

<Badge variant={getRoleBadgeVariant(user.role)}>
  {getRoleLabel(user.role)}
</Badge>
```

---

## Complete Usage Example

```typescript
import { useAuth } from './components/AuthContext';
import { useLeads } from './components/LeadsContext';
import { useCompanies } from './components/CompanyContext';
import { hasPermission, getRoleLabel } from './types/roles';

function MyComponent() {
  const { user, users } = useAuth();
  const { leads, assignLead, getLeadsAssignedToUser } = useLeads();
  const { companies, getCompany } = useCompanies();

  // Check permissions
  const canManageUsers = hasPermission(user.role, 'MANAGE_USERS');
  const canAssignLeads = hasPermission(user.role, 'ASSIGN_LEADS');

  // Get user's company
  const company = user.companyId ? getCompany(user.companyId) : null;

  // Get user's leads
  const myLeads = getLeadsAssignedToUser(user.id);

  // Assign a lead
  const handleAssign = (leadId: string, userId: string) => {
    if (canAssignLeads) {
      assignLead(leadId, userId);
    }
  };

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Role: {getRoleLabel(user.role)}</p>
      <p>Company: {company?.name}</p>
      <p>My Leads: {myLeads.length}</p>
    </div>
  );
}
```

---

**Last Updated**: November 1, 2025  
**Version**: 0.1.0
