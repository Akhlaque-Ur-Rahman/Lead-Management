# Lead Management System - Complete Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Features](#features)
4. [Multi-Tenant Architecture](#multi-tenant-architecture)
5. [Role-Based Access Control](#role-based-access-control)
6. [Data Models](#data-models)
7. [Context Providers](#context-providers)
8. [Components Overview](#components-overview)
9. [UI Components](#ui-components)
10. [Setup & Installation](#setup--installation)
11. [Usage Guide](#usage-guide)
12. [Demo Credentials](#demo-credentials)
13. [Development Guidelines](#development-guidelines)
14. [Recent Updates](#recent-updates)

---

## Project Overview

The Lead Management System (LMS) is a comprehensive web-based application designed for managing MCA (Ministry of Corporate Affairs) data leads in a multi-tenant environment. The system enables companies to efficiently manage their sales leads, track follow-ups, assign leads to sales teams, and generate reports.

### Key Highlights
- **Multi-Tenant Architecture**: Support for multiple companies with data isolation
- **Role-Based Access Control**: 4-tier role hierarchy with granular permissions
- **Lead Management**: Complete lifecycle management from lead pool to conversion
- **Director-Based Follow-Ups**: Track multiple directors per company with individual follow-up schedules
- **Calendar Integration**: View and manage follow-ups by date
- **Reports & Analytics**: Comprehensive reporting with visual charts
- **Excel Integration**: Import/export leads via Excel
- **Lost Lead Recovery**: Temporarily or permanently mark leads as lost with restoration capability

---

## Architecture & Tech Stack

### Frontend Framework
- **React 18.3.1** - Modern React with hooks and context
- **TypeScript** - Type-safe development
- **Vite 6.3.5** - Fast build tool and dev server

### UI Framework & Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
  - Dialog, Dropdown Menu, Select, Tabs, Tooltip, etc.
- **shadcn/ui** - Re-usable component library
- **Lucide React** - Icon library (487+ icons)

### Data Management
- **React Context API** - State management
  - AuthContext - User authentication & management
  - CompanyContext - Company data management
  - LeadsContext - Lead data & operations
- **LocalStorage** - Client-side data persistence

### Additional Libraries
- **Recharts 2.15.2** - Data visualization and charts
- **React Day Picker 8.10.1** - Calendar component
- **React Hook Form 7.55.0** - Form handling
- **XLSX** - Excel file import/export
- **Sonner** - Toast notifications
- **next-themes** - Dark/light theme support

### Build & Development
- **SWC** - Fast TypeScript/JavaScript compiler
- **Vite Plugin React** - React Fast Refresh support

---

## Features

### 1. User Management
- Create, update, and delete users
- Assign roles and companies
- Password management
- User activation/deactivation
- Role-based user creation restrictions

### 2. Lead Pool Management
- View unassigned leads by company
- Bulk import from Excel files
- Manual lead creation via forms
- Customizable field configurations
- Lead status tracking (Hot, Warm, Cold, Converted, Lost)
- Assign leads to sales users

### 3. Assigned Leads
- View leads assigned to specific users
- Update lead information
- Manage director-level follow-ups
- Track assignment dates
- Unassign leads when needed

### 4. Follow-Up Calendar
- Date-based follow-up view
- Multiple directors per lead support
- Time-based scheduling
- Follow-up history tracking
- Remark/notes for each follow-up

### 5. Lost Leads Management
- Mark leads as temporarily or permanently lost
- Reason tracking for lost leads
- Restore temporarily lost leads
- Permanent deletion (Super Admin only)
- Lost by user tracking

### 6. Reports & Analytics
- Lead distribution by status
- Conversion rate analysis
- User performance metrics
- Follow-up statistics
- Visual charts and graphs
- Company-specific reports

### 7. Company Management (Super Admin)
- Create and manage companies
- Subscription plan management (Basic, Professional, Enterprise)
- Set maximum user limits
- Company activation/deactivation
- Contact information management

### 8. Settings
- Customize field configurations
- Show/hide form fields
- Configure Excel import headers
- Required field settings
- Company profile management

### 9. Dashboard
- Quick statistics overview
- Upcoming follow-ups
- Recent leads
- Performance metrics
- Role-specific data views

---

## Multi-Tenant Architecture

### Tenant Isolation
Each company operates as an isolated tenant with:
- Separate user base
- Isolated lead data
- Company-specific settings
- Independent reporting

### Company Structure
```typescript
interface Company {
  id: string;                    // Unique identifier
  name: string;                  // Company name
  email: string;                 // Contact email
  phone: string;                 // Contact phone
  address: string;               // Physical address
  logo?: string;                 // Company logo URL
  createdAt: string;             // Creation date
  isActive: boolean;             // Active status
  subscriptionPlan: 'basic' | 'professional' | 'enterprise';
  maxUsers: number;              // User limit
}
```

### Data Filtering
- Users see only their company's data (except Super Admin)
- Leads are filtered by `companyId`
- Reports are company-scoped
- User management is company-restricted

---

## Role-Based Access Control

### Role Hierarchy

#### 1. Super Admin (Level 4)
- **ID**: 1
- **Key**: `super_admin`
- **Access**: Platform-wide access to all companies
- **Permissions**:
  - Full access to all features
  - Manage all companies
  - Create/manage all user roles
  - Delete lost leads permanently
  - View cross-company data

#### 2. Company Admin (Level 3)
- **ID**: 2
- **Key**: `company_admin`
- **Access**: Full access to their company
- **Permissions**:
  - Manage company users (Team Leads & Sales Users)
  - View all company leads
  - Assign leads
  - Edit all company leads
  - Restore lost leads
  - Access reports and analytics
  - Configure company settings

#### 3. Team Lead (Level 2)
- **ID**: 3
- **Key**: `team_lead`
- **Access**: Team management and oversight (NO financial data access)
- **Permissions**:
  - Create Sales Users
  - View team performance
  - Assign leads to Sales Users only
  - Edit team leads
  - Access reports (performance metrics only, no financial data)
  - Manage team follow-ups
  - Restore lost leads (cannot permanently delete)
- **Restrictions**:
  - ❌ Cannot view Converted Leads page
  - ❌ Cannot see Invoice Numbers or Project Values
  - ❌ Cannot mark leads as Converted
  - ❌ Cannot permanently delete lost leads
  - ❌ Cannot assign to Company Admins or other Team Leaders

#### 4. Sales User (Level 1)
- **ID**: 4
- **Key**: `sales_user`
- **Access**: Individual lead management
- **Permissions**:
  - View assigned leads only
  - Update assigned lead information
  - Add follow-ups for assigned leads
  - Mark assigned leads as lost
  - View personal calendar

### Permission Matrix

| Permission | Super Admin | Company Admin | Team Lead | Sales User |
|-----------|------------|---------------|-----------|------------|
| VIEW_DASHBOARD | ✅ (All) | ✅ (Company) | ✅ (Team) | ✅ (Self) |
| VIEW_LEAD_POOL | ✅ (All) | ✅ (Unassigned) | ✅ (Unassigned) | ✅ (Self) |
| VIEW_ASSIGNED_LEADS | ✅ | ✅ | ✅ | ❌ |
| VIEW_CALENDAR | ✅ (All) | ✅ (Company) | ✅ (Team) | ✅ (Self) |
| VIEW_LOST_LEADS | ✅ (All) | ✅ (All) | ✅ (Team) | ✅ (Self) |
| VIEW_REPORTS | ✅ (All) | ✅ (Company) | ✅ (Team) | ✅ (Self) |
| **VIEW_CONVERTED_LEADS** | ✅ | ✅ | ❌ | ❌ |
| **VIEW_FINANCIAL_DATA** | ✅ | ✅ | ❌ | ❌ |
| **DELETE_LOST_LEADS_PERMANENT** | ✅ | ✅ | ❌ | ❌ |
| MANAGE_USERS | ✅ | ✅ | ✅ (Sales Only) | ❌ |
| MANAGE_COMPANIES | ✅ | ❌ | ❌ | ❌ |
| MANAGE_SETTINGS | ✅ | ✅ | ❌ | ❌ |
| DELETE_LOST_LEADS | ✅ | ❌ | ❌ | ❌ |
| RESTORE_LOST_LEADS | ✅ | ✅ | ✅ | ✅ (Own) |
| ASSIGN_LEADS | ✅ (Anyone) | ✅ (Anyone) | ✅ (Sales Only) | ❌ |
| EDIT_LEADS | ❌ | ✅ | ✅ | ❌ |
| IMPORT_LEADS | ❌ | ✅ | ✅ | ❌ |
| ADD_FOLLOW_UPS | ❌ | ✅ | ✅ | ✅ (Own) |

### Role Utilities
Located in `src/types/roles.ts`:
```typescript
// Get role information
getRoleById(id: RoleId): RoleConfig | undefined
getRoleByKey(key: RoleKey): RoleConfig | undefined
getRoleLabel(key: RoleKey): string

// Permission checks
hasPermission(userRole: RoleKey, permission: string): boolean
hasHigherOrEqualRole(userRole: RoleKey, requiredRole: RoleKey): boolean
canManageRole(userRole: RoleKey, targetRole: RoleKey): boolean

// UI helpers
getRoleBadgeVariant(key: RoleKey): BadgeVariant
getAllRoles(): RoleConfig[]
getAssignableRoles(userRole: RoleKey): RoleConfig[]
```

---

## Data Models

### Lead Model
```typescript
interface Lead {
  // Identity
  id: string;
  companyId: string;            // Multi-tenant identifier
  
  // MCA Data Fields
  cin: string;                  // Corporate Identification Number
  companyName: string;
  authorisedCapital: string;
  paidUpCapital: string;
  dateOfIncorporation: string;
  registeredAddress: string;
  companyEmail: string;
  
  // Directors (Multiple directors supported)
  directors: Director[];
  
  // Legacy Director Fields (backward compatibility)
  din: string;
  directorFirstName: string;
  directorLastName: string;
  mobile: string;
  directorEmail: string;
  
  // Lead Management
  status: 'Hot' | 'Warm' | 'Cold' | 'Converted' | 'Lost';
  isAssigned: boolean;
  assignedTo: string | null;    // User ID
  assignedAt?: string;
  followUpDate: string;
  nextFollowUpDate?: string;
  notes: string;
  createdAt: string;
  uploadedBy: string;           // User ID who created the lead
  
  // Follow-up History
  followUpHistory?: FollowUp[];
  
  // Converted Lead Fields (Company Admin only)
  invoiceNo?: string;           // Invoice number for converted leads
  projectValue?: string;        // Total project value (₹)
  convertedBy?: string;         // User ID who converted
  convertedAt?: string;         // Conversion timestamp
  
  // Lost Lead Fields
  lostRemark?: string;          // Reason for marking as lost
  lostBy?: string;              // User ID who marked as lost
  lostAt?: string;              // Lost timestamp
}
```

### Director Model
```typescript
interface Director {
  id: string;
  din: string;                  // Director Identification Number
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  followUps?: FollowUp[];       // Director-specific follow-ups
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
}
```

### Follow-Up Model
```typescript
interface FollowUp {
  id: string;
  date: string;                 // YYYY-MM-DD format
  time: string;                 // HH:MM format
  remark: string;
  createdBy: string;            // User ID
  createdAt: string;            // ISO timestamp
  directorId?: string;          // Associated director
  directorName?: string;
}
```

### User Model
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: RoleKey;                // 'super_admin' | 'company_admin' | 'team_lead' | 'sales_user'
  roleId: RoleId;               // 1 | 2 | 3 | 4
  companyId: string | null;     // null for super_admin
  createdAt: string;
  isActive: boolean;
}
```

### Lost Lead Model
```typescript
interface LostLead {
  lead: Lead;                   // Original lead data
  lostBy: string;               // User ID who marked it lost
  lostDate: string;
  lostRemark: string;           // Reason for marking as lost
  isPermanent: boolean;         // If true, cannot be restored
}
```

### Field Configuration Model
```typescript
interface FieldConfig {
  id: string;
  label: string;
  key: keyof Lead;
  type: 'text' | 'email' | 'tel' | 'date' | 'textarea' | 'select';
  required: boolean;
  showInForm: boolean;          // Show in lead creation/edit forms
  showInExcel: boolean;         // Include in Excel import/export
  excelHeader: string;          // Column header for Excel
  options?: string[];           // For select type fields
}
```

---

## Context Providers

### AuthContext
**Location**: `src/components/AuthContext.tsx`

**Purpose**: Manages user authentication, user CRUD operations, and session management.

**State**:
- `user`: Currently logged-in user
- `users`: All users in the system
- `credentials`: Email-password mapping
- `isLoading`: Loading state

**Methods**:
```typescript
login(email: string, password: string): Promise<boolean>
logout(): void
addUser(userData): void
updateUser(userId: string, updates): void
deleteUser(userId: string): void
getUsersByCompany(companyId: string): User[]
```

**Storage**: `lms_users`, `lms_credentials`, `lms_currentUser` (localStorage)

---

### CompanyContext
**Location**: `src/components/CompanyContext.tsx`

**Purpose**: Manages company data and operations.

**State**:
- `companies`: All companies in the system

**Methods**:
```typescript
addCompany(companyData): void
updateCompany(companyId: string, updates): void
deleteCompany(companyId: string): void
getCompany(companyId: string): Company | undefined
```

**Storage**: `lms_companies` (localStorage)

---

### LeadsContext
**Location**: `src/components/LeadsContext.tsx`

**Purpose**: Manages leads, lost leads, follow-ups, and field configurations.

**State**:
- `leads`: All active leads
- `lostLeads`: Lost leads archive
- `fieldConfigs`: Customizable field settings

**Methods**:
```typescript
// Lead Operations
addLead(leadData): void
updateLead(leadId: string, updates): void
assignLead(leadId: string, userId: string): void
unassignLead(leadId: string): void

// Follow-up Operations
addDirectorFollowUp(leadId: string, directorId: string, followUp): void

// Lost Lead Operations
markAsLost(leadId: string, remark: string, userId: string, isPermanent: boolean): void
restoreLostLead(lostLeadIndex: number): void
permanentlyDeleteLost(lostLeadIndex: number): void

// Converted Lead Operations
markAsConverted(leadId: string, invoiceNo: string, projectValue: string, userId: string): void

// Queries
getLeadsByCompany(companyId: string): Lead[]
getUnassignedLeads(companyId: string): Lead[]
getAssignedLeads(companyId: string): Lead[]
getLeadsAssignedToUser(userId: string): Lead[]
getConvertedLeads(companyId: string): Lead[]
getDirectorFollowUpsForDate(date: string, companyId?: string): FollowUp[]
```

**Storage**: `lms_leads`, `lms_lostLeads`, `lms_fieldConfigs` (localStorage)

---

## Components Overview

### Main Application Components

#### 1. **App.tsx**
- Main application container
- Layout management (sticky sidebar, scrolling content)
- Mobile responsive sidebar with hamburger menu
- Tab-based navigation
- Route rendering

**Layout**:
```
┌─────────────┬────────────────────┐
│   Sidebar   │   Main Content     │
│  (Sticky)   │   (Scrollable)     │
│             │                    │
│             │                    │
└─────────────┴────────────────────┘
```

#### 2. **Sidebar.tsx**
- Navigation menu
- User profile display with role badge
- Role-based menu filtering
- Logout functionality
- Sticky positioning for desktop

**Menu Items**:
- Dashboard (all roles, data filtered by role)
- Lead Pool (all roles, different views per role)
- Assigned Leads (Company Admin, Team Lead, Super Admin only)
- Follow-up Calendar (all roles except Super Admin)
- Converted Leads (Company Admin only)
- Lost Leads (all roles except Super Admin)
- Reports & Analytics (all roles, data filtered by role)
- User Management (admin roles only)
- Companies (super admin only)
- Settings (super admin & company admin)

#### 3. **Dashboard.tsx**
- Statistics cards (Total Leads, Assigned, Hot, Converted)
- Upcoming follow-ups list
- Recent leads table
- Lead status distribution chart
- Role-specific data filtering

#### 4. **LeadManagement.tsx**
- Lead pool view (unassigned leads)
- Excel import functionality
- Manual lead creation
- Lead assignment to users
- Bulk operations
- Search and filter
- Status updates

#### 5. **AssignedLeads.tsx**
- View leads assigned to users
- Edit lead details
- Add follow-ups for directors
- Mark leads as lost
- Unassign leads
- Filter by user (for admins)

#### 6. **CalendarView.tsx**
- Month view calendar
- Date navigation
- Follow-up scheduling per director
- Time-based scheduling
- Remark/notes for each follow-up
- Visual follow-up indicators

#### 7. **LostLeads.tsx**
- View all lost leads
- Temporary vs permanent classification
- Restore functionality (temporary leads only)
- Permanent delete (super admin only)
- Lost reason display
- Lost date and user tracking

#### 8. **Reports.tsx**
- Lead statistics overview
- Status distribution pie chart
- Conversion rate metrics
- User performance tables
- Follow-up completion tracking
- Export capabilities

#### 9. **UserManagement.tsx**
- User listing by company
- Create new users
- Edit user details
- Role assignment
- User activation/deactivation
- Password management
- Role-based creation restrictions

#### 10. **CompanyManagement.tsx**
- Company listing (super admin only)
- Create companies
- Edit company details
- Subscription plan management
- User limit configuration
- Company activation

#### 11. **Settings.tsx**
- Field configuration manager
- Show/hide form fields
- Excel header customization
- Required field settings
- Company profile editor

#### 12. **ConvertedLeads.tsx** (NEW)
- View all converted leads (Company Admin only)
- Financial data display (Invoice No., Project Value)
- Conversion tracking (converted by, date)
- Summary cards (total converted, total value, average deal size)
- Sorting by date or value
- Search and filter capabilities
- Export to Excel functionality

#### 13. **Login.tsx**
- Email/password authentication
- Demo login buttons for quick testing
- Form validation
- Error handling
- Loading states

### Supporting Components

#### 14. **LeadDetail.tsx**
- Detailed lead view
- Multi-director management
- Status dropdown with smart modals:
  - Lost: Prompts for remark, moves to Lost Leads
  - Converted: Prompts for Invoice No. & Project Value
  - Hot/Warm/Cold: Updates immediately
- Director-specific follow-ups
- Edit button (Company Admin & Team Lead only)
- Follow-up actions (all except Super Admin)
- Notes management

#### 15. **LeadForm.tsx**
- Lead creation/editing form
- Dynamic field rendering based on configuration
- Validation
- Multi-director support
- Status selection

---

## UI Components

### shadcn/ui Components Used
Located in `src/components/ui/`:

- **badge.tsx** - Role badges, status indicators
- **button.tsx** - Primary, secondary, destructive actions
- **card.tsx** - Content containers
- **dialog.tsx** - Modal dialogs
- **dropdown-menu.tsx** - Action menus
- **input.tsx** - Form inputs
- **label.tsx** - Form labels
- **select.tsx** - Dropdown selects
- **table.tsx** - Data tables
- **tabs.tsx** - Tabbed interfaces
- **textarea.tsx** - Multi-line inputs
- **toast.tsx** / **sonner.tsx** - Notifications
- **calendar.tsx** - Date picker
- **popover.tsx** - Overlay content
- **alert-dialog.tsx** - Confirmation dialogs
- **progress.tsx** - Loading indicators
- **avatar.tsx** - User avatars
- **separator.tsx** - Visual dividers
- **switch.tsx** - Toggle switches
- **checkbox.tsx** - Checkboxes
- **scroll-area.tsx** - Custom scrollbars

### Custom UI Utilities
- **utils.ts** - `cn()` function for class merging

---

## Setup & Installation

### Prerequisites
- Node.js 20.x or higher
- npm or yarn package manager

### Installation Steps

1. **Clone the repository**
```bash
cd d:\Officials\Development\Projects\lead-management
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm run dev
```
The application will open automatically at `http://localhost:3000`

4. **Build for production**
```bash
npm run build
```
Output will be in the `build/` directory

### Project Structure
```
lead-management/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── figma/           # Figma imports (if any)
│   │   ├── AuthContext.tsx
│   │   ├── CompanyContext.tsx
│   │   ├── LeadsContext.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── LeadManagement.tsx
│   │   ├── AssignedLeads.tsx
│   │   ├── CalendarView.tsx
│   │   ├── LostLeads.tsx
│   │   ├── Reports.tsx
│   │   ├── UserManagement.tsx
│   │   ├── CompanyManagement.tsx
│   │   ├── Settings.tsx
│   │   ├── LeadDetail.tsx
│   │   └── LeadForm.tsx
│   ├── types/
│   │   └── roles.ts         # Role definitions & utilities
│   ├── styles/
│   │   └── globals.css
│   ├── App.tsx
│   └── main.tsx
├── build/                   # Production build output
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── README.md
├── PROJECT_DOCUMENTATION.md  # This file
├── ROLE_IDENTIFIERS.md
└── CHANGES_SUMMARY.md
```

---

## Usage Guide

### First Time Setup

1. **Login as Super Admin**
   - Email: `superadmin@lms.com`
   - Password: `super123`

2. **Create a Company** (if needed)
   - Navigate to Companies tab
   - Click "Add Company"
   - Fill in company details
   - Set subscription plan and user limits

3. **Create Company Admin**
   - Navigate to User Management
   - Click "Add User"
   - Assign Company Admin role
   - Link to company

### Company Admin Workflow

1. **Login with Company Credentials**
   - Use company-specific credentials

2. **Import Leads**
   - Go to Lead Pool
   - Click "Import Excel"
   - Select Excel file with MCA data
   - Review and confirm import

3. **Create Team Members**
   - Navigate to User Management
   - Create Team Leads and Sales Users
   - Assign appropriate roles

4. **Assign Leads**
   - Go to Lead Pool
   - Select leads to assign
   - Choose user from dropdown
   - Click Assign

### Sales User Workflow

1. **Login with Sales Credentials**

2. **View Assigned Leads**
   - Navigate to Assigned Leads
   - See all leads assigned to you

3. **Update Lead Information**
   - Click on a lead to open details
   - Update status, notes, etc.

4. **Schedule Follow-Ups**
   - Select director from the lead
   - Add follow-up date, time, and remarks
   - Save follow-up

5. **View Calendar**
   - Navigate to Follow-up Calendar
   - See all scheduled follow-ups by date

6. **Mark Leads as Lost**
   - From Assigned Leads or Lead Detail
   - Click "Mark as Lost"
   - Select temporary or permanent
   - Add reason
   - Confirm

### Excel Import Format

Required columns (based on default field configuration):
- CIN
- Company Name
- Authorised Capital(₹)
- Paid up Capital(₹)
- Date of Incorporation
- Registered Address
- Company E-mail id
- DIN
- F Name (Director First Name)
- L Name (Director Last Name)
- Mobile
- Director E-mail id
- Status
- Follow-up Date
- Notes

---

## Demo Credentials

### Super Admin (Platform Level)
- **Email**: `superadmin@lms.com`
- **Password**: `super123`
- **Access**: All companies, all features

### Company 1: ABC Motors Pvt Ltd

**Company Admin**
- **Email**: `rajesh@abcmotors.com`
- **Password**: `admin123`
- **Access**: Full company access

**Team Lead**
- **Email**: `priya@abcmotors.com`
- **Password**: `lead123`
- **Access**: Team management, reports

**Sales User**
- **Email**: `amit@abcmotors.com`
- **Password**: `user123`
- **Access**: Assigned leads only

### Company 2: XYZ Auto Solutions

**Company Admin**
- **Email**: `vikram@xyzauto.com`
- **Password**: `admin123`

**Sales User**
- **Email**: `sneha@xyzauto.com`
- **Password**: `user123`

### Company 3: PQR Enterprises

**Company Admin**
- **Email**: `arjun@pqrenterprises.com`
- **Password**: `admin123`

---

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow React Hooks best practices
- Use functional components
- Implement proper error handling
- Add comments for complex logic

### Component Structure
```typescript
// Imports
import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Component
export function ComponentName() {
  // Hooks
  const { user } = useAuth();
  const [state, setState] = useState();
  
  // Effects
  useEffect(() => {
    // Side effects
  }, []);
  
  // Handlers
  const handleAction = () => {
    // Handler logic
  };
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### Context Usage
```typescript
// Import context hook
import { useAuth } from './AuthContext';
import { useLeads } from './LeadsContext';
import { useCompanies } from './CompanyContext';

// Use in component
const { user, users, addUser } = useAuth();
const { leads, addLead } = useLeads();
const { companies } = useCompanies();
```

### Adding New Roles
1. Update `src/types/roles.ts` ROLES constant
2. Add RoleKey to type union
3. Update PERMISSIONS matrix
4. Update UI badge variants
5. Test all affected components

### Adding New Permissions
1. Add permission to PERMISSIONS object in `roles.ts`
2. Specify which roles have the permission
3. Use `hasPermission()` in components
4. Update documentation

---

## Recent Updates

### Comprehensive Permission & Feature Overhaul (Nov 1, 2025)

#### 1. Lead Import Restrictions
- **NEW**: Only Company Admin and Team Leader can import leads via Excel
- Import button hidden for Sales Users and Super Admin
- Toast notification for unauthorized access attempts
- Imported leads go to Lead Pool (assignedTo = null)
- Manual leads auto-assigned to creator
- **Files Modified**: `roles.ts`, `LeadManagement.tsx`, `LeadsContext.tsx`

#### 2. Lead Assignment Logic Updates
- **Company Admin**: Can assign to anyone (Admin, Team Lead, Sales User)
- **Team Leader**: Can assign ONLY to Sales Users (validated)
- **Sales User**: Cannot assign leads at all
- **Auto-Assignment**: Manual leads automatically assigned to creator
- **Excel Imports**: Always unassigned, appear in Lead Pool
- **Validation**: `canAssignToUser()` helper function for role hierarchy
- **Files Modified**: `roles.ts`, `LeadsContext.tsx`, `LeadManagement.tsx`, `AssignedLeads.tsx`

#### 3. Lead Pool Logic Redesign
- **Company Admin/Team Lead**: View all unassigned leads in company
- **Sales User**: View only their assigned leads (read-only)
- **Super Admin**: View only leads assigned to them
- Lead Pool automatically updates when leads are assigned/unassigned
- **Files Modified**: `LeadManagement.tsx`, `Sidebar.tsx`

#### 4. Lead Editing & Follow-Up Separation
- **Edit Permissions**: Only Company Admin and Team Leader
- **Follow-Up Access**: Company Admin, Team Leader, Sales User (own leads)
- **Super Admin**: No edit or follow-up access (view-only)
- **Status Management**: Dropdown with smart modals
  - Lost → Remark modal → Moves to Lost Leads
  - Converted → Invoice/Value modal → Financial tracking
  - Hot/Warm/Cold → Immediate update
- Edit button hidden for unauthorized roles
- **Files Modified**: `LeadDetail.tsx`, `LeadManagement.tsx`, `LeadsContext.tsx`

#### 5. Assigned Leads Page Enhancements
- **Team Summary**: Shows lead count per user
- **Reassignment Controls**: Inline dropdowns with role validation
- **Team Leader Filtering**: Only see self + Sales Users
- **Company Admin**: Full reassignment to anyone
- **Instant Updates**: Reassigned leads disappear from source view
- **Files Modified**: `AssignedLeads.tsx`, `Sidebar.tsx`

#### 6. Sales User Data Restrictions
- **Complete Data Isolation**: See only their own data across ALL pages
- **Dashboard**: Filtered leads, follow-ups, statistics
- **Lead Pool**: Shows assigned leads only (read-only)
- **Calendar**: Only their leads' follow-ups
- **Lost Leads**: Only leads they marked as lost
- **Reports**: Personal analytics only
- **Hidden Pages**: Assigned Leads, User Management, Settings
- **No Financial Access**: Cannot see Invoice No. or Project Values
- **Files Modified**: `Dashboard.tsx`, `LeadManagement.tsx`, `CalendarView.tsx`, `LostLeads.tsx`, `Reports.tsx`, `Sidebar.tsx`

#### 7. Converted Leads Page (NEW)
- **NEW COMPONENT**: `ConvertedLeads.tsx`
- **Access**: Company Admin ONLY
- **Financial Data**: Invoice Number, Total Project Value (₹)
- **Tracking**: Converted By, Conversion Date, Company Details
- **Summary Cards**: Total Converted, Total Value, Average Deal Size
- **Sorting**: By conversion date or project value
- **Search**: Company name, invoice number, converted by
- **Export**: Excel export functionality
- **Security**: Financial data not exposed to other roles
- **Files Modified**: `ConvertedLeads.tsx` (new), `LeadsContext.tsx`, `roles.ts`, `Sidebar.tsx`, `App.tsx`

#### 8. Lost Leads Permission Updates
- **Permanent Delete**: Changed from Super Admin to Company Admin only
- **Marking Lost**: All roles can mark (Team Lead/Sales User = temporary only)
- **Restore**: Users can restore their own temporary lost leads
- **Company Admin**: Full access to all lost leads
- **Files Modified**: `LostLeads.tsx`, `LeadDetail.tsx`

#### 9. Role Permission Additions
- **VIEW_CONVERTED_LEADS**: Company Admin only
- **IMPORT_LEADS**: Company Admin, Team Leader
- **Enhanced canAssignToUser()**: Role hierarchy validation
- **Files Modified**: `roles.ts`

### Sticky Sidebar Implementation (Nov 1, 2025)
- **Changed**: App layout structure in `App.tsx`
- **Before**: `min-h-screen` with `overflow-auto` on main
- **After**: `h-screen` with `overflow-hidden` on container, `overflow-y-auto` on main
- **Result**: Sidebar stays fixed while content scrolls independently
- **Files Modified**: `App.tsx`, `Sidebar.tsx`

### Team Leader Financial Data Restrictions (November 4, 2025)

#### Overview
Implemented comprehensive financial data access restrictions for Team Leaders to protect sensitive business information while maintaining full operational capabilities.

#### New Permissions Added
1. **VIEW_CONVERTED_LEADS** - Access to Converted Leads page (Company Admin only)
2. **VIEW_FINANCIAL_DATA** - Visibility of Invoice Numbers and Project Values (Company Admin only)
3. **DELETE_LOST_LEADS_PERMANENT** - Permanent deletion of lost leads (Company Admin only)

#### Components Updated
- **LeadDetail.tsx**
  - Added Conversion Details section with conditional financial data display
  - Team Leaders see: "Financial data is restricted. Contact your Company Admin for details."
  - Blocked "Converted" status option for Team Leaders
  - Prevented marking leads as Converted (requires financial data entry)
  
- **LostLeads.tsx**
  - Permanent delete button hidden for Team Leaders
  - Role-specific info messages
  - Permission-based button visibility
  
- **ConvertedLeads.tsx**
  - Page access controlled via `VIEW_CONVERTED_LEADS` permission
  - Enhanced access denial message
  
- **roles.ts**
  - Added 3 new permission flags
  - Updated permission matrix

#### Team Leader Access Control
**✅ Can Access:**
- Dashboard (company performance metrics)
- Lead Pool (assign to Sales Users)
- Assigned Leads (full team view)
- Follow-Up Calendar (team schedules)
- Lost Leads (view and restore)
- Reports & Analytics (performance only)
- User Management (create Sales Users)

**❌ Cannot Access:**
- Converted Leads page
- Invoice Numbers
- Project Values
- Financial summaries
- Permanent delete functions
- Company Settings
- Lead conversion marking

#### Benefits
- **Data Security**: Financial information isolated from operational roles
- **Compliance**: Clear audit trail for financial data access
- **Role Clarity**: Distinct operational vs. financial responsibilities
- **Consistent Enforcement**: Centralized `hasPermission()` checks throughout application

#### Files Modified
- `src/types/roles.ts`
- `src/components/LeadDetail.tsx`
- `src/components/LostLeads.tsx`
- `src/components/ConvertedLeads.tsx`
- `CHANGES_SUMMARY.md`
- `ROLE_IDENTIFIERS.md`
- `PROJECT_DOCUMENTATION.md`

---

### Role Identifier System (November 1, 2025)
- Implemented unique numeric identifiers for roles
- Created centralized role management system
- Added permission matrix
- Fixed role reference bugs in `LostLeads.tsx` and `Dashboard.tsx`
- Comprehensive documentation in `ROLE_IDENTIFIERS.md` and `CHANGES_SUMMARY.md`

---

## Future Enhancements

### Planned Features
1. **Backend Integration**
   - REST API development
   - Database migration (PostgreSQL/MongoDB)
   - JWT authentication
   - File upload to cloud storage

2. **Advanced Features**
   - Email notifications for follow-ups
   - SMS integration
   - WhatsApp integration
   - Advanced reporting with date ranges
   - Lead scoring algorithm
   - Activity timeline
   - Bulk operations improvement

3. **UI/UX Improvements**
   - Dark mode theme
   - Mobile app (React Native)
   - Advanced filters and search
   - Keyboard shortcuts
   - Drag-and-drop lead assignment

4. **Admin Features**
   - Audit logs
   - Role permission customization
   - Custom fields per company
   - API access for integrations
   - Webhook support

5. **Analytics**
   - Predictive analytics
   - Sales forecasting
   - Lead quality scoring
   - Team performance insights

---

## Troubleshooting

### Common Issues

**Issue**: Data not persisting
- **Solution**: Check browser localStorage is enabled and not full

**Issue**: Login not working
- **Solution**: Verify credentials match demo accounts or check console for errors

**Issue**: Sidebar not sticky
- **Solution**: Ensure latest code with `h-screen` and `overflow-hidden` on App container

**Issue**: Excel import failing
- **Solution**: Verify Excel headers match field configuration in Settings

**Issue**: Permissions not working correctly
- **Solution**: Clear localStorage and reload to get latest role configurations

---

## Support & Contact

### Documentation Files
- **PROJECT_DOCUMENTATION.md** - This comprehensive guide
- **ROLE_IDENTIFIERS.md** - Role system details
- **CHANGES_SUMMARY.md** - Change history and implementation details
- **README.md** - Quick start guide

### Development Team
- Project maintained by Akhlaque-Ur-Rahman

### Version Information
- **Current Version**: 0.2.0
- **Last Updated**: November 4, 2025
- **Node Version**: 20.x
- **React Version**: 18.3.1

---

## License

This project is private and proprietary.

---

**End of Documentation**

For questions or clarifications, please refer to the source code with inline comments or contact the development team.
