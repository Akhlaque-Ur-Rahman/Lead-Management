# Lead Management System (LMS) - Project Documentation

**Version**: 3.0.0
**Last Updated**: 2025-11-28
**Architecture**: Hybrid Event-Based (Firestore + React)

---

## 1. Executive Summary

The Lead Management System (LMS) is a robust, multi-tenant SaaS application designed to streamline the lead lifecycle from acquisition to conversion. It features a sophisticated **Hybrid Event-Based Architecture** that balances real-time responsiveness with cost-efficiency and performance. The system enforces strict role-based access control (RBAC) across 5 user levels and implements complex business logic for lead assignment, follow-up scheduling, and visibility.

### Key Features
- **Hybrid Data Fetching**: Combines "Fetch-Once" strategies with lightweight event listeners for real-time updates without heavy snapshot costs.
- **Smart Lead Lifecycle**: Automated movement of leads between Pool, Assigned, and Converted/Lost states based on user actions.
- **Singleton Follow-Up Protocol**: Enforces a strict "One Active Follow-Up Per Company" rule to prevent scheduling conflicts.
- **Granular RBAC**: distinct permissions for Super Admin, Platform Admin, Company Admin, Team Lead, and Sales User.
- **Performance Optimized**: Implements caching, background synchronization, and client-side filtering.

---

## 2. System Architecture

### 2.1 Hybrid Event-Based Architecture

The system moves away from traditional real-time Firestore listeners (`onSnapshot`) for heavy collections. Instead, it uses a lightweight **Event Bus** pattern.

1.  **Events Collection**: A lightweight Firestore collection (`events`) records critical system actions (e.g., `LEAD_UPDATE`, `FOLLOWUP_ADD`).
2.  **Global Listener**: The client maintains a *single* real-time listener on the `events` collection.
3.  **Targeted Refresh**: When an event is received, the client checks if it's relevant (e.g., matches the user's company) and triggers a targeted refresh of the specific data view (e.g., `loadLeadsAll`).
4.  **Mutation Wrappers**: All data mutations (add/update/delete) are wrapped in a transaction that also writes to the `events` collection via `triggerUpdateEvent`.

### 2.2 Data Flow Strategy

-   **Initial Load**: `loadLeadsAll()` fetches data once upon component mount.
-   **Caching**: Results are cached in memory with a short TTL (10-15s) to prevent redundant fetches during rapid navigation.
-   **Background Sync**: The app detects tab visibility changes. If the user returns to the tab after a delay, data is automatically refetched.
-   **Client-Side Filtering**: To minimize complex Firestore indexes, leads are often fetched in broader scopes (e.g., "All Company Leads") and filtered client-side for specific views (e.g., "Lead Pool" vs "Assigned").

---

## 3. Directory Structure

The project follows a modular feature-based structure with a heavy emphasis on utility separation.

```
src/
├── components/
│   ├── ui/                 # Reusable UI primitives (Radix/Tailwind)
│   ├── AuthContext.tsx     # Authentication Provider
│   ├── LeadsContext.tsx    # Core Data Provider (State, Fetching, CRUD)
│   ├── LeadManagement.tsx  # Lead Pool View
│   ├── AssignedLeads.tsx   # Assigned Leads View
│   ├── CalendarView.tsx    # Follow-up Calendar
│   ├── LeadDetail.tsx      # Lead Detail & Action Modal
│   └── ...
├── utils/
│   ├── firestore/          # Query builders & Firestore helpers
│   ├── filters/            # Client-side filtering logic (Lead Pool, Assigned)
│   ├── role/               # Permission checks & visibility logic
│   ├── followups/          # Follow-up calculation & validation
│   └── events/             # Event bus & sync logic
├── types/
│   ├── roles.ts            # Role definitions & Permission Matrix
│   └── ...
└── firebaseConfig.ts       # App initialization
```

---

## 4. Data Models

### 4.1 Lead (`leads` collection)
The core entity representing a potential client.

```typescript
interface Lead {
  id: string;
  companyId: string;
  
  // Business Info
  companyName: string;
  cin: string; // Unique Identifier
  // ... MCA fields

  // Lifecycle
  status: 'Hot' | 'Warm' | 'Cold' | 'Converted' | 'Lost';
  isAssigned: boolean;
  assignedTo: string | null;

  // Nested Data
  directors: Director[]; // Contains Follow-Ups
}
```

### 4.2 Follow-Up (Nested in `Director`)
Represents an interaction or scheduled call.

```typescript
interface FollowUp {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  remark: string;
  status: 'active' | 'updated'; // 'active' = current scheduled/completed
  followUpStatus: 'Hot' | 'Warm' | 'Cold' | 'Converted' | 'Lost'; // Outcome
  talkedTo: string;
  createdBy: string;
}
```

### 4.3 Event (`events` collection)
Used for the hybrid architecture signaling.

```typescript
interface SystemEvent {
  type: 'LEAD_UPDATE' | 'LEAD_ADD' | 'FOLLOWUP_ADD' | ...;
  companyId: string;
  userId: string;
  timestamp: ServerTimestamp;
  payload?: any;
}
```

---

## 5. Business Rules & Logic

### 5.1 Lead Pool Rules (Final)
### 5.3 Follow-Up System

- **Singleton Rule**: A company can have only **ONE** active follow-up at a time across all directors.
- **Status Logic**:
  - When a new follow-up is added, any existing active follow-up for that company is marked as `updated` (archived).
  - This ensures the Calendar View only shows the single most relevant action item per lead.

### 5.4 Lead Status Lifecycle
| :--- | :---: | :---: | :---: | :---: |
| **View Lead Pool** | ✅ | ✅ | ✅ | ✅ |
| **View Assigned Leads** | ✅ (All) | ✅ (All) | ✅ (All) | ✅ (Own Only) |
| **View Calendar** | ✅ | ✅ | ✅ | ✅ (Own Only) |
| **View Lost Leads** | ✅ | ✅ | ✅ | ✅ (Own Only) |
| **View Converted Leads** | ✅ | ✅ | ✅ | ❌ |
| **Import Leads** | ❌ | ✅ | ✅ | ❌ |
| **Assign Leads** | ❌ | ✅ | ✅ | ❌ |
| **Edit Leads** | ✅ | ✅ | ✅ | ✅ (Assigned) |

---

## 7. Performance Optimizations

1.  **Debounced Imports**: Excel imports are processed in chunks to prevent UI freezing and Firestore rate limits.
2.  **Duplicate Detection**: Uses optimized `in` queries to check for existing CINs in batches during import.
3.  **Background Sync**: The `sync.ts` utility monitors `visibilitychange` events. If a user leaves the tab for >2 minutes and returns, the data is automatically refreshed to ensure consistency without constant polling.
4.  **Memoized Filtering**: Heavy filtering logic (e.g., searching, sorting) is wrapped in `useMemo` to prevent re-calculations on every render.
5.  **Optimized Import Duplicate Detection**:
    -   Uses chunked Firestore `in` queries to check for duplicates against `CIN`, `Company Email`, and `Company Name`.
    -   Prevents reading the entire leads collection.
    -   Checks for duplicates within the import batch itself.

---

## 8. Deployment & Setup

### Prerequisites
-   Node.js 18+
-   Firebase Project (Firestore, Auth enabled)

### Installation
1.  Clone the repository.
2.  `npm install`
3.  Create `.env` file:
    ```env
    VITE_FIREBASE_API_KEY=your_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_domain
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_bucket
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    ```

### Build & Deploy
1.  `npm run build` (Generates `dist/` folder)
2.  `firebase deploy` (Deploys to Firebase Hosting)

---

## 9. Troubleshooting

-   **Leads not loading?** Check console for Firestore permission errors. Ensure your user role matches the data you are trying to access.
-   **"Missing or insufficient permissions"**: Verify Firestore Security Rules match the `roles.ts` definitions.
-   **Login fails on Production?** Ensure the domain is whitelisted in Firebase Auth settings.