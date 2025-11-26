# Lead Management System

A comprehensive, multi-tenant lead management system built with React, TypeScript, and Firebase. Features role-based access control, advanced lead tracking, and company management capabilities.

## 🎯 Key Features

- **Multi-Tenant Architecture**: Complete data isolation between companies
- **Role-Based Access Control**: 5-tier permission system (Super Admin → Sales User)
- **Advanced Lead Pipeline**: Lead Pool → Assigned → Converted/Lost with follow-up tracking
- **Company Management**: Activation/deactivation with automatic user status sync
- **Excel Integration**: Bulk import/export with validation and duplicate prevention
- **Smart Pagination**: Cursor-based pagination for large datasets (200+ leads)
- **Real-time Updates**: Live data synchronization across users
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- npm (comes with Node.js)
- Firebase project with Firestore enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Akhlaque-Ur-Rahman/Lead-Management.git
   cd lead-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   Create a `.env` file in the root directory:
   ```bash
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain  
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   
   The application will open at `http://localhost:3000` (or the next available port)

5. **Build for production**
   ```bash
   npm run build
   ```

## 👥 User Roles & Permissions

| Role | Access Level | Key Permissions |
|------|-------------|----------------|
| **Super Admin** | System-wide | Manage all companies, create Platform Admins, view analytics |
| **Platform Admin** | All companies | Create companies, manage Company Admins, system config |
| **Company Admin** | Own company | Full lead management, user management, Excel import/export |
| **Team Lead** | Company leads | Lead assignment, follow-ups, create Sales Users |
| **Sales User** | Assigned leads | View/update assigned leads, add follow-ups |

## 📊 Core Components

### Lead Management
- **Lead Pool**: Unassigned leads or assigned leads without follow-ups
- **Assigned Leads**: Leads with active assignments and follow-ups
- **Calendar View**: Visual follow-up scheduling for multiple directors
- **Converted Leads**: Successfully closed leads with financial tracking
- **Lost Leads**: Temporarily or permanently lost leads with restoration options

### Company Management
- **Multi-tenant**: Complete data isolation between companies
- **Subscription Plans**: Basic, Professional, Enterprise with user limits
- **Activation Control**: Company-wide activation/deactivation affecting all users

### User Management  
- **Role-based Creation**: Hierarchical user creation permissions
- **Batch Operations**: Company-wide user status changes
- **Authentication**: Custom Firestore-based auth with bcrypt password hashing

## 🛠️ Technical Stack

### Frontend
- **React 18.3.1** with TypeScript for type safety
- **Vite 6.4.1** for fast development and building
- **Tailwind CSS** + **shadcn/ui** for modern, responsive design
- **Lucide React** for consistent iconography

### Backend & Data
- **Firebase Firestore** for real-time NoSQL database
- **Custom Authentication** using Firestore instead of Firebase Auth
- **React Context API** for state management across components

### Key Libraries
- **React Hook Form** for efficient form handling
- **XLSX** for Excel import/export functionality
- **Recharts** for data visualization and analytics
- **Sonner** for elegant toast notifications
- **React Router DOM** for navigation

## 🔧 Recent Updates (November 2025)

### ✅ Company Management Enhancement
- Added company activation/deactivation functionality
- Implemented `deactivatedByCompany` flag for automatic user management
- Enhanced batch user operations for company-wide status changes

### ✅ Pagination System Fixes
- **Critical Fix**: Pagination now shows correct total page count for large datasets
- Fixed issue where pagination showed only 1 page despite having 200+ leads
- Optimized Firestore queries to avoid composite index requirements
- Implemented proper total count calculation on first page load

### ✅ Performance Improvements
- Removed Firestore composite index dependencies
- Added client-side sorting for better performance  
- Enhanced error handling and console logging
- Optimized Firestore read costs by avoiding aggregation queries

## 📁 Project Structure

```
src/
├── components/           # Main application components
│   ├── ui/              # shadcn/ui reusable components (40+ files)
│   ├── AuthContext.tsx  # Authentication & user management
│   ├── CompanyContext.tsx # Company data management  
│   ├── LeadsContext.tsx # Lead operations & pagination
│   ├── Login.tsx        # Authentication interface
│   ├── Dashboard.tsx    # Main dashboard
│   ├── LeadManagement.tsx # Lead Pool management
│   ├── UserManagement.tsx # User CRUD operations
│   └── [20+ more components...]
├── types/               # TypeScript type definitions
├── utils/              # Utility functions
├── firebaseConfig.ts   # Firebase configuration
└── App.tsx             # Main app router & layout
```

## 🚀 Deployment

### Automatic Deployment (Vercel)
- **Git Integration**: Push to main branch triggers automatic deployment
- **Environment Variables**: Configured in Vercel dashboard
- **Custom Domain**: Available for production use

### Manual Deployment
```bash
npm run build
# Deploy contents of dist/ directory to your hosting provider
```

## 📝 Development Guidelines

### Code Style
- TypeScript for all components and utilities
- Functional components with React Hooks
- Context providers for global state management
- shadcn/ui for consistent component styling

### Firebase Best Practices
- Role-based security rules
- Efficient query patterns to minimize reads
- Cursor-based pagination for large datasets
- Client-side filtering when server-side isn't efficient

## 🐛 Troubleshooting

### Common Issues

**Build Errors**: Check that all environment variables are properly set
```bash
# Verify environment variables
npm run dev
# Check console for Firebase configuration errors
```

**Authentication Issues**: Ensure Firestore security rules allow authenticated access
```bash
# Check Firebase console for security rule configuration
```

**Pagination Problems**: Clear browser cache and check console for debugging logs
```bash
# Look for "[Lead Pool] Total leads:" and "[DEBUG]" messages in browser console
```

## 📄 Documentation

- **Complete Documentation**: See `PROJECT_DOCUMENTATION.md` for detailed architecture and features
- **Changelog**: See `CHANGELOG.md` for version history and recent changes
- **API Reference**: Role permissions and component interfaces in documentation

## 📞 Support

For questions, issues, or feature requests:
1. Check the documentation in `PROJECT_DOCUMENTATION.md`
2. Review browser console logs for debugging information
3. Verify Firebase configuration and Firestore security rules
4. Test with different user roles to isolate permission issues

## 📊 System Stats

- **Components**: 20+ main components, 40+ UI components
- **Performance**: Handles 1000+ leads efficiently with pagination
- **Scale**: Supports unlimited companies and users
- **Bundle Size**: ~2MB optimized production build

---

**Version**: 1.2.0 | **Last Updated**: November 26, 2025 | **Status**: Production Ready

*This README reflects the actual current state of the Lead Management System.*
