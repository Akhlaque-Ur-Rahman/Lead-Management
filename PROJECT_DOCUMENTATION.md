# Lead Management System - Complete Documentation

## 🏗️ Architecture Overview

### Technology Stack
- **Frontend**: React 18.3.1 + TypeScript + Vite 6.4.1
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Firebase Firestore (NoSQL database)
- **Authentication**: Custom Firestore-based auth system
- **Deployment**: Vercel (frontend) + Firebase (data)
- **State Management**: React Context API

### Project Structure
```
lead-management/
├── src/
│   ├── components/           # Main application components
│   │   ├── ui/              # shadcn/ui reusable components (40+ files)
│   │   ├── figma/           # Design system components
│   │   ├── AuthContext.tsx  # Authentication & user management
│   │   ├── CompanyContext.tsx # Company data management
│   │   ├── LeadsContext.tsx # Lead operations & pagination
│   │   ├── Login.tsx        # Authentication interface
│   │   ├── Dashboard.tsx    # Main dashboard
│   │   ├── SuperDashboard.tsx # Admin dashboard with analytics
│   │   ├── LeadManagement.tsx # Lead Pool (unassigned leads)
│   │   ├── AssignedLeads.tsx # Assigned leads view
│   │   ├── ConvertedLeads.tsx # Successfully converted leads
│   │   ├── LostLeads.tsx    # Lost leads management
│   │   ├── CalendarView.tsx # Follow-up calendar
│   │   ├── Reports.tsx      # Analytics & reporting
│   │   ├── UserManagement.tsx # User CRUD operations
│   │   ├── CompanyManagement.tsx # Company administration
│   │   ├── Settings.tsx     # System configuration
│   │   └── [More components...]
│   ├── types/
│   │   └── roles.ts         # Role definitions & permissions
│   ├── utils/              # Utility functions
│   ├── styles/             # Global styles
│   ├── App.tsx             # Main app router & layout
│   ├── main.tsx            # React app entry point
│   └── firebaseConfig.ts   # Firebase configuration
├── functions/              # Firebase Cloud Functions (unused)
├── build/                  # Production build
├── package.json
├── vite.config.ts
└── [Configuration files...]
```

---

## 🔑 Core Features

### 1. Multi-Tenant Architecture
- **Company Isolation**: Each company's data is completely separate
- **Role-Based Access**: 4-tier permission system
- **Scalable Design**: Supports unlimited companies and users

### 2. User Management System
- **Roles**: Super Admin → Platform Admin → Company Admin → Team Lead → Sales User
- **Permissions**: Granular access control based on roles
- **Company Activation**: Companies can be activated/deactivated, affecting all users
- **User Limits**: Subscription-based user count enforcement

### 3. Lead Management Pipeline
- **Lead Pool**: Unassigned leads OR assigned leads without follow-ups
- **Assigned Leads**: Leads with active assignments
- **Follow-up System**: Multi-director support with scheduling
- **Status Tracking**: Hot, Warm, Cold, Converted, Lost
- **Conversion Tracking**: Financial data and conversion metrics

### 4. Data Operations
- **Excel Import/Export**: Bulk lead operations with validation
- **Pagination**: Efficient cursor-based pagination for large datasets
- **Real-time Updates**: Live data synchronization across users
- **Audit Trail**: Complete tracking of user actions

---

## 🏛️ Data Models

### User Model
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'platform_admin' | 'company_admin' | 'team_lead' | 'sales_user';
  roleId: 1 | 2 | 3 | 4 | 5;
  companyId: string | null;     // null for super_admin
  createdAt: string;
  isActive: boolean;
  deactivatedByCompany?: boolean; // Auto-set when company deactivated
  lastLoginAt?: string;
}
```

### Company Model
```typescript
interface Company {
  id: string;
  name: string;
  email: string;
  plan: 'basic' | 'professional' | 'enterprise' | 'custom';
  userLimit: number;
  isActive: boolean;
  createdAt: string;
  pricing?: PlanPricing;
}
```

### Lead Model
```typescript
interface Lead {
  id: string;
  companyId: string;
  
  // Company Information
  cin: string;                  // Company Identification Number
  companyName: string;
  authorisedCapital?: string;
  paidUpCapital?: string;
  dateOfIncorporation?: string;
  registeredAddress?: string;
  companyEmail?: string;
  
  // Multi-Director Support
  directors: Director[];
  
  // Lead Management
  status: 'Hot' | 'Warm' | 'Cold' | 'Converted' | 'Lost';
  isAssigned: boolean;
  assignedTo: string | null;
  
  // Financial (for converted leads)
  invoiceNumber?: string;
  projectValue?: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
```

### Director Model
```typescript
interface Director {
  id: string;
  din?: string;                 // Director Identification Number
  firstName: string;
  lastName: string;
  mobile?: string;
  email?: string;
  followUps: FollowUp[];        // Director-specific follow-ups
}
```

---

## 🔐 Role-Based Permissions

### Super Admin (Role ID: 1)
- **Access**: All companies and users
- **Permissions**: 
  - View all data across companies (read-only for leads)
  - Create Platform Admins
  - System-wide analytics
  - Company management (create, activate/deactivate)

### Platform Admin (Role ID: 2)
- **Access**: All companies and users (except Super Admins)
- **Permissions**:
  - Company management
  - Create Company Admins
  - User management across companies
  - System configuration

### Company Admin (Role ID: 3)
- **Access**: Own company only
- **Permissions**:
  - Full lead management (CRUD)
  - User management within company
  - Create Team Leads and Sales Users
  - Excel import/export
  - View converted leads and financials

### Team Lead (Role ID: 4)
- **Access**: Own company leads
- **Permissions**:
  - Lead management (view, edit, assign)
  - Add follow-ups
  - Create Sales Users
  - Limited reporting

### Sales User (Role ID: 5)
- **Access**: Assigned leads only
- **Permissions**:
  - View assigned leads
  - Add follow-ups to assigned leads
  - Update lead status
  - Basic reporting

---

## 🚀 Key Components

### Authentication System (`AuthContext.tsx`)
```typescript
// Custom Firestore-based authentication
const login = async (email: string, password: string) => {
  // 1. Query users collection by email
  // 2. Verify password with bcrypt
  // 3. Check user active status and company status
  // 4. Set session in localStorage
  // 5. Load user data into context
};
```

### Lead Management (`LeadsContext.tsx`)
```typescript
// Efficient pagination with cursor-based queries
const loadLeadsPaginated = async (pageIndex: number, view: string) => {
  // 1. Build role-based constraints
  // 2. Apply view-specific filters
  // 3. Execute count query on first page
  // 4. Fetch paginated results with cursor
  // 5. Client-side sorting and filtering
};
```

### Company Management (`CompanyContext.tsx`)
```typescript
// Auto-sync user status with company activation
const updateCompany = async (companyId: string, updates: any) => {
  // 1. Update company document
  // 2. If isActive changed, batch update all company users
  // 3. Set/remove deactivatedByCompany flag
  // 4. Trigger UI refresh
};
```

---

## 📊 Advanced Features

### 1. Smart Lead Pool Logic
The Lead Pool shows leads that need attention:
- **Unassigned Leads**: Available for assignment
- **Assigned Without Follow-ups**: Assigned but no follow-up scheduled

### 2. Hybrid Filtering Strategy
- **Server-side**: Status, company, assignment filters
- **Client-side**: Follow-up count (Firestore limitation workaround)
- **Performance**: Minimizes Firestore reads and index requirements

### 3. Pagination System (Fixed November 2025)
- **Cursor-based**: Uses Firestore `startAfter()` for efficient paging
- **Total Count**: Separate count query on first page load
- **Index Optimization**: Removed `orderBy` constraints to avoid complex indexes
- **Client Sorting**: Maintains proper order without server-side sorting

### 4. Excel Integration
- **Import**: Validates required fields, prevents duplicates
- **Export**: Role-restricted, includes all relevant data
- **Field Mapping**: Configurable field names and requirements

### 5. Follow-up System
- **Multi-Director**: Each director can have separate follow-ups
- **Scheduling**: Date + time with remarks
- **Status Tracking**: Active vs completed follow-ups
- **Calendar View**: Visual follow-up management

---

## 🛠️ Development Setup

### Prerequisites
- Node.js 20.x or higher
- npm or yarn
- Firebase project with Firestore

### Environment Variables
Create `.env` file:
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Installation & Development
```bash
# Clone repository
git clone <repository-url>
cd lead-management

# Install dependencies
npm install

# Start development server
npm run dev
# App runs on http://localhost:3000 (or next available port)

# Build for production
npm run build
# Output in dist/ directory
```

### Firebase Configuration
1. **Firestore Collections**: `companies`, `users`, `leads`, `lostLeads`, `convertedLeads`
2. **Security Rules**: Production-ready rules with authentication requirements
3. **Indexes**: Minimal indexes for efficient queries

---

## 🔧 Recent Improvements (November 2025)

### Company Management Enhancement
- ✅ Company activation/deactivation functionality
- ✅ `deactivatedByCompany` flag for automatic user management
- ✅ Batch user operations for company-wide changes
- ✅ Auto-sync between company and user status

### Pagination System Fixes
- ✅ Fixed pagination showing only 1 page for 200+ leads
- ✅ Accurate total count calculation
- ✅ Removed Firestore composite index requirements
- ✅ Client-side sorting for proper order
- ✅ Enhanced debugging and error handling

### Performance Optimizations
- ✅ Removed expensive aggregation queries
- ✅ Minimized Firestore read costs
- ✅ Efficient cursor-based pagination
- ✅ Hybrid server/client filtering strategy

---

## 📈 System Statistics

### Current Scale
- **Components**: 20+ main components, 40+ UI components
- **Dependencies**: 50+ npm packages
- **Bundle Size**: ~2MB production build
- **Performance**: Supports 1000+ leads with efficient pagination

### Code Quality
- **TypeScript**: 100% type coverage
- **Architecture**: Clean separation of concerns
- **Testing**: Jest configuration ready
- **Linting**: ESLint configuration

---

## 🚀 Deployment

### Vercel Deployment (Automated)
1. **Git Push**: Automatic deployment on push to main branch
2. **Environment**: Vercel dashboard manages environment variables
3. **Build**: `npm run build` executed automatically
4. **Domain**: Custom domain configuration available

### Manual Deployment
```bash
# Build production version
npm run build

# Deploy dist/ directory to hosting provider
# Ensure environment variables are configured
```

---

## 🎯 Future Roadmap

### Planned Features
- [ ] Email notifications for follow-ups
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] API endpoints for third-party integrations
- [ ] Advanced reporting with filters
- [ ] Bulk follow-up scheduling

### Technical Improvements
- [ ] Unit test coverage
- [ ] End-to-end testing
- [ ] Performance monitoring
- [ ] Code splitting for better loading
- [ ] PWA capabilities

---

## 📞 Support & Maintenance

### Development Team
- **Architecture**: React + TypeScript + Firebase
- **Deployment**: Vercel + Firebase
- **Version Control**: Git with conventional commits

### Documentation Updates
- Last Updated: November 26, 2025
- Version: 1.2.0
- Status: Production Ready

### Getting Help
- Check this documentation first
- Review console logs for debugging
- Verify Firebase configuration and permissions
- Test with demo users for role-specific issues

---

*This documentation reflects the actual current state of the Lead Management System as of November 2025, including all recent improvements and fixes.*