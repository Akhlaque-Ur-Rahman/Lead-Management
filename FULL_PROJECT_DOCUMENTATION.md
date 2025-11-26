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
- **React Hook Form 7.55.0** - Form handling with validation
- **XLSX** - Excel file import/export
- **Sonner** - Toast notifications
- **next-themes** - Dark/light theme support
- **use-debounce** - Debouncing hooks for search

### Build & Development
- **SWC** - Fast TypeScript/JavaScript compiler
- **Vite Plugin React** - React Fast Refresh support

---

## Security Features

### Authentication & Authorization
- **Firestore-based Authentication**: Custom authentication using Firestore user records
- **Role-Based Access Control**: Fine-grained permissions system
- **Session Management**: Local state management
- **Password Policies**: Enforced complexity requirements
- **Account Lockout**: Protection against brute force attacks

### Data Protection
- **Input Validation**: Server-side validation of all inputs
- **Data Sanitization**: Protection against XSS and injection attacks
- **Rate Limiting**: Protection against DDoS and brute force attacks
- **CSRF Protection**: Cross-Site Request Forgery protection
- **Secure Headers**: Security headers for web application protection

### Audit & Compliance
- **Activity Logging**: Comprehensive audit trails
- **Security Events**: Logging of all security-relevant events
- **Data Access Logs**: Tracking of all data access operations

---

## Subscription Management

### Subscription Plans
- **Basic Plan**: Entry-level features with limited users
- **Professional Plan**: Advanced features for growing businesses
- **Enterprise Plan**: Full feature set with custom user limits
- **Custom Plan**: Tailored solutions with custom pricing

### Plan Features
- **User Management**: Add/remove users based on plan limits
- **Feature Toggles**: Enable/disable features per plan
- **Billing Integration**: Support for multiple payment gateways
- **Usage Analytics**: Track resource usage and limits
- **Plan Upgrades/Downgrades**: Seamless plan changes

---

## Features

### 1. User Management
- Create, update, and delete users with role-based restrictions
- Assign roles and companies with permission validation
- Secure password management with complexity requirements
- User activation/deactivation with audit logging
- Role-based user creation restrictions
- Failed login attempt tracking
- Account lockout after multiple failed attempts

### 2. Lead Pool Management
- **Definition**: All leads that are **not Converted or Lost**.
- **Visibility**:
  - **Super Admin**: View all leads across all companies (Read-Only).
  - **Company Admin/Team Lead**: View all leads in their company.
  - **Sales User**: View only leads assigned to them.
- **Features**:
  - Bulk import from Excel files with validation.
  - Manual lead creation via forms.
  - Customizable field configurations.
  - Status tracking (Hot, Warm, Cold, Converted, Lost).
  - Assign leads to users with strict permission checks.
  - Lead assignment history.
  - Duplicate lead detection.

### 3. Assigned Leads
- **Definition**: A filtered view of the Lead Pool showing leads assigned to specific users.
- **Visibility**:
  - **Company Admin/Team Lead**: View all assigned leads in their company.
  - **Sales User**: View only leads assigned to them.
  - **Super Admin**: Not available (uses Lead Pool).
- **Features**:
  - Filter by "Assigned To" user.
  - Sort by latest follow-up date.
  - Quick access to lead details and follow-ups.
  - Unassign leads (Admin/Team Lead only).

### 4. Follow-Up Calendar
- Date-based follow-up view (active follow-ups only)
- Multiple directors per lead support
- Time-based scheduling
- Full history tracking with status-based lifecycle
- Remark/notes for each follow-up
- History Modal for complete timeline view
- Search and sort functionality in history
- Color-coded status indicators (active/updated)
- Company-Level Singleton: Shows only ONE active follow-up per company
- Converted leads automatically excluded from calendar

### 5. Lost Leads Management
- Mark leads as temporarily or permanently lost
- Reason tracking for lost leads
- **Visibility**:
  - Company Admin & Team Lead: Full Access
  - Sales User: View Only (leads they marked as lost)
- **Actions**:
  - Restore: Team Lead & Company Admin only
  - Permanent Delete: Team Lead & Company Admin only
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

### 10. Converted Leads Management
- Dedicated view for Company Admin & Super Admin
- Track converted leads with financial details (Invoice No, Project Value)
- Sort by date or project value
- Search by company, invoice, or converter name
- Hidden from Sales Users and Team Leads to maintain focus on active leads

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
  - View "Lead Pool" for global visibility
- **Restrictions**:
  - ❌ **Read-only access** to lead operations (cannot add follow-ups, edit leads, or change status)
  - ❌ **Cannot assign leads**

#### 2. Company Admin (Level 3)
- **ID**: 2
- **Key**: `company_admin`
- **Access**: Full access to their company
- **Permissions**:
  - Manage company users (Team Leads & Sales Users)
  - View all company leads
  - **Assign leads** to Sales Users, Team Leads, and themselves
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
  - **Assign leads** to Sales Users ONLY
  - Edit team leads
  - Access reports (performance metrics only, no financial data)
  - Manage team follow-ups
  - Restore lost leads
  - Permanently delete lost leads
- **Restrictions**:
  - ❌ Cannot view Converted Leads page
  - ❌ Cannot see Invoice Numbers or Project Values
  - ❌ Cannot mark leads as Converted
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
  - View lost leads (marked by them)
- **Restrictions**:
  - ❌ **Cannot assign leads**
  - ❌ Cannot delete lost leads
  - ❌ Cannot restore lost leads
  - ❌ Cannot view Converted Leads page

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
  assignedAt?: string;
  // DEPRECATED: Legacy fields, do not use.
  // Replaced by directors[].followUps[] + calculateNextFollowUpDate()
  followUpDate?: string | null;
  nextFollowUpDate?: string | null;
  notes: string;
  createdAt: string;
  uploadedBy: string;           // User ID who created the lead
  
  // Follow-up History
  // Follow-Up History
  // REMOVED: followUpHistory (replaced by directors[].followUps)
  
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
  talkedTo: string;             // Person contacted during follow-up (required)
  talkedToId?: string;          // ID of the director talked to
  talkedToName?: string;        // Name of the director talked to
  followUpStatus: "Hot" | "Warm" | "Cold" | "Converted" | "Lost"; // Business status
  status?: "active" | "updated"; // Lifecycle status (active/updated)
}
```

**Company-Level Singleton Rule**: Only ONE active follow-up exists per company at any time. When creating/updating a follow-up, all other active follow-ups across all directors are marked as "updated".

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

---

## Context Providers

### AuthContext
**Location**: `src/components/AuthContext.tsx`
**Purpose**: Manages user authentication, user CRUD operations, and session state.
**Note**: Recently migrated from Firebase Auth to custom Firestore-based authentication. Hosting migrated to Vercel.

### CompanyContext
**Location**: `src/components/CompanyContext.tsx`
**Purpose**: Manages company data and operations.

### LeadsContext
**Location**: `src/components/LeadsContext.tsx`
**Purpose**: Manages leads, lost leads, follow-ups, and field configurations.

---

## Components Overview

### Main Application Components

#### 1. **App.tsx**
- Main application container
- Layout management (sticky sidebar, scrolling content)
- Mobile responsive sidebar with hamburger menu
- Tab-based navigation
- Route rendering

#### 2. **Sidebar.tsx**
- Navigation menu
- User profile display with role badge
- Role-based menu filtering
- Logout functionality
- Sticky positioning for desktop

#### 3. **Dashboard.tsx**
- Basic dashboard view
- Statistics cards
- Recent activity

#### 4. **SuperDashboard.tsx** (New)
- Advanced dashboard for Super Admins and Company Admins
- Cross-company data visualization
- Advanced filtering by Status, Company, and Roles
- URL-synced filter state
- User statistics (Total, Active, Inactive, Admins, etc.)
- User management table with filtering

#### 5. **LeadManagement.tsx**
- Lead pool view (unassigned leads)
- Excel import functionality
- Manual lead creation
- Lead assignment to users
- Bulk operations
- Search and filter
- Status updates

#### 6. **AssignedLeads.tsx**
- View leads assigned to users
- Edit lead details
- Add follow-ups for directors
- Mark leads as lost
- Unassign leads
- Filter by user (for admins)

#### 7. **CalendarView.tsx**
- Month view calendar
- Date navigation
- Follow-up scheduling per director
- Time-based scheduling
- Remark/notes for each follow-up
- Visual follow-up indicators

#### 8. **LostLeads.tsx**
- View all lost leads
- Temporary vs permanent classification
- Restore functionality (temporary leads only)
- Permanent delete (super admin only)
- Lost reason display
- Lost date and user tracking

#### 9. **Reports.tsx**
- Lead statistics overview
- Status distribution pie chart
- Conversion rate metrics
- User performance metrics
- Follow-up statistics
- Visual charts and graphs
- Company-specific reports

#### 10. **UserManagement.tsx**
- User listing by company
- Create new users
- Edit user details
- Role assignment
- User activation/deactivation
- Password management
- Role-based creation restrictions

#### 11. **CompanyManagement.tsx**
- Company listing (super admin only)
- Create companies
- Edit company details
- Subscription plan management
- User limit configuration
- Company activation

#### 12. **Settings.tsx**
- Field configuration manager
- Show/hide form fields
- Excel header customization
- Required field settings
- Company profile editor

#### 13. **ConvertedLeads.tsx**
- View all converted leads (Company Admin only)
- Financial data display (Invoice No., Project Value)
- Conversion tracking (converted by, date)
- Summary cards (total converted, total value, average deal size)
- Sorting by date or value
- Search and filter capabilities
- Export to Excel functionality

#### 14. **Login.tsx**
- Email/password authentication
- Demo login buttons for quick testing
- Form validation
- Error handling
- Loading states

### Supporting Components

#### 15. **CompanyFilter.tsx**
- Reusable component for filtering data by company
- Auto-hides for Company Admins (locks to their company)
- Supports "All Companies" option for Super Admins
- Used in dashboards and reports for multi-tenant data views

#### 16. **LeadDetail.tsx**
- Detailed lead view
- Multi-director management
- Status dropdown with smart modals
- Director-specific follow-ups
- Edit button (Company Admin & Team Lead only)
- Follow-up actions (all except Super Admin)
- Notes management

#### 17. **LeadForm.tsx**
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

---

## System Updates (Nov 2025)

### 1. QA & Critical Fixes
A comprehensive QA diagnostic was performed to ensure system stability and data integrity.
- **Lost Leads**: Fixed critical bug where restoring/deleting leads failed due to incorrect parameter handling (Index vs ID).
- **Lead Assignment**: Fixed race conditions in UI feedback by implementing proper `async/await` handling.
- **Duplicate Prevention**: 
  - Added server-side checks to prevent duplicate company emails.
  - Enhanced UI error handling to provide clear feedback for duplicate entries.

### 2. Security Enhancements
- **Firestore Rules**: Replaced development-mode "open access" rules with production-ready security rules.
  - **Authentication**: All operations now require valid user authentication.
  - **Collection Scoping**: Specific rules for `companies`, `users`, `leads`, `lostLeads`, and `convertedLeads`.
  - **Data Validation**: Server-side validation for required fields (e.g., company name, user email) during creation.

### 3. Transactional Follow-up System
- **Race Condition Fix**: Implemented transactional logic in `updateLead` to prevent data loss during concurrent edits.
  - When editing a lead, the system now merges form updates with the *current* database state of follow-ups.
  - Ensures that follow-ups added by other users (e.g., via mobile or another session) are not overwritten by stale form data.
- **Scalability**: Identified and documented scalability considerations for the Calendar View.

### 4. Hosting Migration (Nov 2025)
- **Vercel Deployment**: Migrated hosting from Firebase Hosting to Vercel.
- **Cleanup**: Removed Firebase Hosting configuration files (`firebase.json`, `.firebaserc`, `firestore.rules`).
- **CI/CD**: Removed Firebase Hosting GitHub workflows.

### 5. Lead Management Enhancements (Nov 2025)
- **Duplicate Detection (CIN Based)**:
  - **Strict CIN Validation**: Duplicate detection is now strictly based on the Corporate Identification Number (CIN).
  - **Excel Import**: Automatically checks for existing CINs during bulk import. Duplicates are skipped, and a summary toast reports the count of imported vs. skipped leads.
  - **Manual Creation**: Real-time validation prevents creating leads with a CIN that already exists in the database.
- **Follow-up Logic Improvements**:
  - **Duplicate Fix**: Resolved an issue where editing a follow-up created a duplicate entry. Updates now correctly modify the existing record.
  - **Past Date Prevention**: Enforced validation to prevent scheduling follow-ups in the past.
  - **Auto-Sync**: The `nextFollowUpDate` field is now automatically synchronized whenever a follow-up is added, updated, or deleted.
- **View Consistency**:
  - **Calendar View**: Updated to display *only* future follow-ups for better clarity.
  - **History Tab**: Dedicated view for past follow-ups in the Lead Detail section.
  - **Real-time Sync**: Edits in the Lead Detail view are immediately reflected in the Calendar and vice-versa.

### 6. Build Stability & Code Quality (Nov 2025)
- **Build Fixes**: Resolved critical build errors preventing production deployment.
  - **Missing Imports**: Fixed missing dependencies in `CompanyManagement.tsx` (icons, Firebase functions, UI components).
  - **Syntax Errors**: Resolved unterminated template literals and hidden character issues in `AssignedLeads.tsx`.
  - **Permission Logic**: Updated role-based permission checks to use the correct `canAssignToUser` utility.
- **Test Suite Updates**:
  - **Modernization**: Updated `subscription.test.tsx` to use ES module imports instead of CommonJS `require`.
  - **Type Safety**: Resolved TypeScript errors in test files to ensure reliable CI/CD checks.
- **Code Cleanup**: Removed unused variables and imports across multiple components to improve code quality and reduce bundle size.
  - **TypeScript Configuration**: Updated `tsconfig.json` to target `ES2022` to support modern features like `Array.prototype.at()`.

### 10. Active Leads Page & Workflow Updates (Nov 2025)
- **New Active Leads Page**:
  - **Purpose**: Replaces "Assigned Leads" for managing leads with active engagement.
  - **Definition**: Leads with **> 0 follow-ups** (stored in `lead.directors[].followUps`) AND status NOT "Converted" or "Lost".
  - **Visibility**:
    - **Sales User**: Sees only their assigned active leads.
    - **Team Lead/Admin**: Sees all active leads in their company.
  - **Auto-Movement**:
    - **Lead Pool -> Active Leads**: Automatically moves when first follow-up is added.
    - **Active Leads -> Converted**: Moves to "Converted Leads" page upon conversion (Admin only).
    - **Active Leads -> Lost**: Moves to "Lost Leads" page when marked as Lost.

- **Navigation Updates**:
  - Added "Active Leads" to Sidebar under Lead Pool.
  - **Converted Leads Visibility**: Now hidden for Sales Users and Team Leads (Admin only).

- **Follow-Up System Refinements**:
  - **Director Selection**: Removed "Director" dropdown from Add Follow-Up modal.
  - **Talked To**: Standardized "Talked To" field using a dropdown of all directors.
  - **Status Handling**: All statuses (Hot, Warm, Cold, Lost, Converted) visible in dropdown.
    - "Converted" triggers Converted Modal.
    - "Lost" triggers Lost Modal.

### 7. Follow-Up System Upgrade (Nov 2025)
- **Company-Level Singleton Rule** (Nov 2025): Enforces **ONE active follow-up per company** globally.
  - When creating/updating ANY follow-up, ALL existing active follow-ups across ALL directors are marked as "updated"
  - Only the newly created follow-up has `status: "active"`
  - Calendar displays exactly ONE follow-up per company
  - Full history preserved - no follow-ups are deleted
  - History Modal shows complete timeline (active + updated entries)

- **"Talked To" Field** (Nov 2025): Required field tracking who was contacted.
  - **Required** in all follow-up creation/update dialogs
  - Stored in FollowUp object as `talkedTo: string`
  - Displayed in calendar cards, history modal, and lead detail with primary color icon
  - Validation prevents empty submissions

- **Status-Based Tracking**: Implemented a comprehensive follow-up lifecycle management system.
  - **Lifecycle Status Field**: Added `status: "active" | "updated"` to the FollowUp interface.
  - **Business Status Field**: Restored `followUpStatus` to track lead temperature ("Hot", "Warm", "Cold") per follow-up.
  - **Update Behavior**: When editing a follow-up, the old entry is marked as "updated" and a new "active" entry is created, preserving full history.
  - **Backward Compatibility**: Existing follow-ups without a status field are automatically treated as "active".
  
- **History Modal**: New comprehensive timeline view for follow-up history.
  - **Timeline UI**: Vertical timeline with color-coded markers (blue for active, grey for updated).
  - **Search Functionality**: Real-time search across remarks, dates, and creator names.
  - **Sort Toggle**: Switch between "Oldest First" and "Newest First" views.
  - **Expand/Collapse**: Long remarks (>120 characters) can be expanded/collapsed.
  - **Comprehensive Data**: Displays date, time, remark, director name, talked to, lifecycle status, business status, created by, and created at timestamp.
  - **Status Badges**: Visual indicators for "Active/Updated" lifecycle status and "Hot/Warm/Cold" business status.
  
- **Calendar View Enhancements**:
  - **Company-Level Singleton**: Shows only ONE active follow-up per company (Nov 2025).
  - **Active-Only Filtering**: Calendar displays only active follow-ups, hiding all updated/historical entries.
  - **Duplicate Prevention**: Enforced at data level - impossible to have multiple active follow-ups.
  - **History Access**: Clicking a follow-up card opens the History Modal instead of edit dialog.
  - **Status Color Visibility**: Fixed badge colors to be visible in both light and dark modes (Nov 2025).
  - **Talked To Display**: Shows who was contacted with primary color icon (Nov 2025).
  
- **Lead Detail Integration**:
  - **Active Follow-Ups Display**: Shows only active follow-ups in the main view.
  - **View History Button**: New button to access full follow-up timeline per director.
  - **Active Badge**: Visual indicator for active follow-ups.
  - **Sorted Display**: Active follow-ups sorted by earliest first.
  - **Talked To Display**: Shows who was contacted in active follow-ups list (Nov 2025).
  
- **Helper Functions**: Added utility functions in LeadsContext.
  - `getActiveFollowUps(lead, directorId?)`: Returns only active follow-ups.
  - `getAllFollowUps(lead, directorId?)`: Returns complete history (active + updated).
  - `calculateNextFollowUpDate(lead)`: Finds earliest active future follow-up.
  
- **Data Integrity**:
  - **No Data Loss**: All follow-up history is preserved; old entries are never deleted.
  - **Auto-Sync**: `nextFollowUpDate` automatically recalculates based on active follow-ups only.
  - **Chronological Sorting**: History sorted by `createdAt` timestamp for accurate timeline.
  - **Company-Level Enforcement**: Singleton rule enforced at database transaction level.
  
- **UI Consistency** (Nov 2025):
  - **Shared Color Utility**: Created `src/utils/followUpStatusColors.ts` for consistent status badge colors.
  - **Visibility Fix**: Warm status now uses amber background with black text (was white-on-white).
  - **All Status Colors**: Hot (red), Warm (amber/black), Cold (blue), Converted (green), Lost (gray) - all visible in light/dark modes.
  - **No Variant Overrides**: Removed shadcn badge variants that were overriding Tailwind colors.
  
### 8. History Modal & Integration Upgrade (Nov 2025)
- **History Modal Enhancements**:
  - **Action Buttons**: Added "Add / Update Follow-Up" and "View Company Details" buttons directly within the modal for quick access.
  - **Responsiveness**: Improved layout to be full-screen and scrollable on all devices, ensuring better visibility of long histories.
  - **Permissions**: "Add / Update Follow-Up" button is restricted (hidden for Super Admins).
  - **Search Functionality**: Real-time search across remarks, dates, and creator names for easy filtering.
  - **Status Display**: Shows lifecycle status (Active/Updated) badges.

- **Lead Detail Integration**:
  - **Seamless Navigation**: Opening "Add Follow-Up" from History Modal opens the existing follow-up dialog with the correct director pre-selected.
  - **Company Details Modal**: New dedicated modal displays comprehensive company info (CIN, Capital, Directors, Registered Address) without leaving the context.

- **Calendar View Integration**:
  - **Unified Experience**: "Add Follow-Up" and "View Company Details" actions from the History Modal work identically within the Calendar View.

### 9. Follow-Up System Upgrades (Nov 2025)
- **Converted Status Workflow**:
  - **Role Expansion**: Sales Users and Team Leads can now convert leads.
  - **Visibility Control**: Converted leads disappear from Sales/Team Lead views (Lead Pool, Assigned, Calendar) to focus on active leads.
  - **Dedicated View**: Converted leads are accessible only in the "Converted Leads" page for Admins.
  - **Data Capture**: Mandatory Invoice No and Project Value collection upon conversion.

- **Singleton Follow-Up Rule**:
  - **One Active per Company**: Enforced rule where only the latest follow-up remains active per company.
  - **Auto-Update**: Adding a new follow-up automatically marks previous active ones as "updated".
  - **Calendar Clarity**: Calendar view now shows a single, clear next action for each company.

- **UI Refinements**:
  - **Talked To Dropdown**: Standardized input using a dropdown of company directors.
  - **Talked To Dropdown**: Standardized input using a dropdown of company directors.
  - **Status Consistency**: "Converted" status integrated into all follow-up workflows.

### 12. Lead Management Refinement (Nov 2025)
- **Strict Role-Based Assignment**:
  - **Super Admin**: Cannot assign leads (Read-Only).
  - **Company Admin**: Can assign to Sales Users, Team Leads, and themselves.
  - **Team Lead**: Can ONLY assign to Sales Users.
  - **Sales User**: Cannot assign leads.
- **Lead Pool & Assigned Leads**:
  - **Active Leads Page Removed**: Deleted `ActiveLeads.tsx` to simplify navigation.
  - **Lead Pool**: Now serves as the main repository for all leads (filtered by role).
  - **Assigned Leads**: Unified view for managing assigned leads (hidden for Super Admins).
- **Follow-Up Logic**:
  - **Company-Level Singleton**: Enforced stricter singleton rule. Adding a follow-up marks ALL other active follow-ups for that company (across all directors) as "updated".
  - **Director Matching**: Added validation to ensure "Talked To" field matches an existing director.
  - **Super Admin Restriction**: Explicitly prevented Super Admins from adding/updating follow-ups.
- **Cleanup**:
  - Removed all legacy references to `followUpHistory`.
  - Removed `ActiveLeads` from routing and sidebar.

### 13. Legacy Field Removal (Nov 2025)
- **Data Model Updates**:
  - `followUpDate` and `nextFollowUpDate` in the `Lead` interface are now **DEPRECATED**.
  - The system now relies exclusively on `directors[].followUps[]` to determine follow-up status.
- **Logic Changes**:
  - **`calculateNextFollowUpDate`**: A new utility function that dynamically calculates the next follow-up date based on the earliest *active* follow-up across all directors.
  - **Excel Import**: Stopped assigning default `followUpDate` to new leads. Imported leads now correctly show no follow-up until one is added.
  - **UI Updates**:
    - **Lead Pool**: Displays the dynamically calculated next follow-up date.
    - **Assigned Leads**: Uses the calculated date for sorting and display.
    - **Lead Form**: Removed legacy date fields from the creation/edit form.
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

Output will be in the `dist/` directory (configured for Vercel)

### Deployment
The application is deployed on **Vercel**.
- **Push to Git**: Changes pushed to the main branch are automatically deployed.
- **Manual Deployment**: Can be deployed using the Vercel CLI or dashboard.
- **Firebase Config**: Firestore and Auth continue to function using the client-side `firebaseConfig.ts`.

### Project Structure
```
lead-management/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── figma/           # Figma imports
│   │   ├── AuthContext.tsx
│   │   ├── CompanyContext.tsx
│   │   ├── LeadsContext.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── SuperDashboard.tsx
│   │   ├── CompanyFilter.tsx
│   │   ├── LeadManagement.tsx
│   │   ├── AssignedLeads.tsx
│   │   ├── CalendarView.tsx
│   │   ├── LostLeads.tsx
│   │   ├── Reports.tsx
│   │   ├── UserManagement.tsx
│   │   ├── CompanyManagement.tsx
│   │   ├── Settings.tsx
│   │   ├── LeadDetail.tsx
│   │   ├── LeadForm.tsx
│   │   └── HistoryModal.tsx
│   ├── types/
│   │   └── roles.ts         # Role definitions & utilities
│   ├── utils/
│   │   └── followUpStatusColors.ts  # Shared status badge color utility
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
└── FULL_PROJECT_DOCUMENTATION.md
```
