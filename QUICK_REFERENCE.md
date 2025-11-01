# Quick Reference Guide

## 🚀 Getting Started

### Install & Run
```bash
npm install
npm run dev
```

## 🔑 Demo Credentials

| Role | Email | Password | Company |
|------|-------|----------|---------|
| Super Admin | superadmin@lms.com | super123 | All |
| Company Admin | rajesh@abcmotors.com | admin123 | ABC Motors |
| Team Lead | priya@abcmotors.com | lead123 | ABC Motors |
| Sales User | amit@abcmotors.com | user123 | ABC Motors |

## 📋 Common Tasks

### Import Leads from Excel
1. Login as Company Admin
2. Go to **Lead Pool** tab
3. Click **Import Excel**
4. Select your Excel file (must match field configuration)
5. Review and confirm import

### Assign Leads to Sales User
1. Go to **Lead Pool**
2. Select lead(s)
3. Choose user from **Assign To** dropdown
4. Click **Assign Lead**

### Schedule Follow-Up
1. Go to **Assigned Leads**
2. Click on a lead to open details
3. Select a director
4. Click **Add Follow-Up**
5. Enter date, time, and remarks
6. Click **Save Follow-Up**

### View Follow-Ups by Date
1. Navigate to **Follow-up Calendar**
2. Select date from calendar
3. View all scheduled follow-ups for that date

### Mark Lead as Lost
1. Open lead details from **Assigned Leads**
2. Click **Mark as Lost**
3. Select **Temporary** or **Permanent**
4. Enter reason
5. Confirm action

### Restore Lost Lead
1. Navigate to **Lost Leads**
2. Find the temporarily lost lead
3. Click **Restore**
4. Lead returns to pool as "Cold"

### Create New User
1. Go to **User Management**
2. Click **Add User**
3. Fill in details
4. Select appropriate role
5. Assign to company (not for Super Admin)
6. Click **Create User**

## 🎯 Role Capabilities

### Super Admin
✅ Manage all companies
✅ Create all user types
✅ View cross-company data
✅ Permanently delete lost leads
✅ Access all features

### Company Admin
✅ Full company access
✅ Create Team Leads & Sales Users
✅ Assign leads
✅ Edit all company leads
✅ Configure settings
✅ View reports
✅ Restore lost leads
❌ Manage other companies

### Team Lead
✅ Create Sales Users
✅ Assign leads to team
✅ Edit team leads
✅ View team reports
❌ Edit company settings
❌ Create admins

### Sales User
✅ View assigned leads only
✅ Update assigned leads
✅ Add follow-ups
✅ Mark leads as lost
❌ Assign leads
❌ View all company leads
❌ Access reports

## 📊 Excel Import Format

Required columns (default configuration):
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
- Status (Hot/Warm/Cold/Converted)
- Follow-up Date (YYYY-MM-DD)
- Notes

## 🗂️ Lead Statuses

| Status | Meaning | Color |
|--------|---------|-------|
| Hot | High priority, ready to convert | Red |
| Warm | Interested, needs nurturing | Orange |
| Cold | Low engagement | Blue |
| Converted | Successfully closed | Green |
| Lost | Not interested/unreachable | Gray |

## 🔧 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Search | `Ctrl + K` (if implemented) |
| Close Dialog | `Esc` |
| Submit Form | `Enter` (in forms) |

## 💾 Data Storage

All data is currently stored in browser **localStorage**:
- `lms_users` - User accounts
- `lms_credentials` - Login credentials
- `lms_currentUser` - Active session
- `lms_companies` - Company data
- `lms_leads` - Active leads
- `lms_lostLeads` - Lost leads archive
- `lms_fieldConfigs` - Field settings

## 🐛 Troubleshooting

### Login Issues
**Problem**: Cannot login with demo credentials
**Solution**: Check caps lock, ensure exact email and password

### Data Not Saving
**Problem**: Changes not persisting after refresh
**Solution**: 
1. Check localStorage is enabled in browser
2. Verify localStorage quota not exceeded
3. Try clearing cache and reloading

### Excel Import Fails
**Problem**: Excel file not importing
**Solution**:
1. Verify column headers match Settings configuration
2. Check date format is YYYY-MM-DD
3. Ensure Status values are: Hot, Warm, Cold, Converted, or Lost

### Missing Menu Items
**Problem**: Cannot see certain menu options
**Solution**: This is expected - menu items are filtered by role

### Sidebar Scrolling
**Problem**: Entire page scrolls including sidebar
**Solution**: Update to latest version (fixed Nov 1, 2025)

## 📁 Important Files

| File | Purpose |
|------|---------|
| `PROJECT_DOCUMENTATION.md` | Comprehensive system documentation |
| `ROLE_IDENTIFIERS.md` | Role system details |
| `CHANGES_SUMMARY.md` | Implementation history |
| `QUICK_REFERENCE.md` | This file - quick tips |
| `src/types/roles.ts` | Role definitions & permissions |
| `src/components/AuthContext.tsx` | User management |
| `src/components/LeadsContext.tsx` | Lead operations |
| `src/components/CompanyContext.tsx` | Company data |

## 🎨 UI Components Location

All reusable UI components are in `src/components/ui/`:
- `button.tsx`, `input.tsx`, `select.tsx` - Form elements
- `dialog.tsx`, `popover.tsx` - Overlays
- `table.tsx`, `card.tsx` - Layout
- `badge.tsx`, `avatar.tsx` - Display elements
- `calendar.tsx` - Date picker
- `sonner.tsx` - Toast notifications

## 📞 Context Hooks Usage

```typescript
// Authentication & Users
import { useAuth } from './components/AuthContext';
const { user, users, login, logout, addUser } = useAuth();

// Leads Management
import { useLeads } from './components/LeadsContext';
const { leads, addLead, assignLead, markAsLost } = useLeads();

// Companies
import { useCompanies } from './components/CompanyContext';
const { companies, addCompany, getCompany } = useCompanies();

// Role Utilities
import { hasPermission, getRoleLabel } from './types/roles';
if (hasPermission(user.role, 'MANAGE_USERS')) {
  // Show user management UI
}
```

## 📈 Next Steps

1. **For Developers**: Read `PROJECT_DOCUMENTATION.md` for architecture
2. **For Users**: Login and explore with demo accounts
3. **For Admins**: Review `ROLE_IDENTIFIERS.md` for permissions
4. **For Testing**: Import sample Excel data and test workflows

## 🔗 Related Documentation

- **Full Documentation**: [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)
- **Role System**: [ROLE_IDENTIFIERS.md](./ROLE_IDENTIFIERS.md)
- **Change History**: [CHANGES_SUMMARY.md](./CHANGES_SUMMARY.md)

---

**Version**: 0.1.0  
**Last Updated**: November 1, 2025
