// src/components/LeadsContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  runTransaction,
  DocumentData,
  writeBatch,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "./AuthContext";
import { canSalesUserViewLeadInPool, canAdminOrTlViewLeadInPool, canSalesUserViewLeadInAssigned, hasFollowUps, hasPermission } from '../utils/leadVisibility';
import { canAssignToUser } from '../types/roles';

// -------------------- Types --------------------

export type RoleKey = "super_admin" | "company_admin" | "team_lead" | "sales_user";

export interface FollowUp {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  remark: string;
  createdBy: string;
  createdAt: string;
  talkedTo: string; // Required: Full Name of the director talked to
  talkedToId?: string; // ID of the director talked to
  talkedToName?: string; // Name of the director talked to
  followUpStatus: "Hot" | "Warm" | "Cold" | "Converted" | "Lost"; // Business status
  status?: "active" | "updated"; // Lifecycle status
}

export interface Director {
  id: string;
  din: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  followUps?: FollowUp[];
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
}

export type LeadStatus = "Hot" | "Warm" | "Cold" | "Converted" | "Lost";

export interface Lead {
  id: string;
  companyId: string;

  // MCA Data Fields
  cin: string;
  companyName: string;
  authorisedCapital?: string;
  paidUpCapital?: string;
  dateOfIncorporation?: string;
  registeredAddress?: string;
  companyEmail?: string;

  // Directors
  directors: Director[];

  // Legacy Director Fields (backward compatibility)
  din?: string;
  directorFirstName?: string;
  directorLastName?: string;
  mobile?: string;
  directorEmail?: string;

  // Lead Management
  status: LeadStatus;
  isAssigned: boolean;
  assignedTo: string | null;
  assignedAt?: string;
  // DEPRECATED: Do NOT use in UI or business logic.
  // Replaced by directors[].followUps[] + calculateNextFollowUpDate()
  followUpDate?: string | null;

  // DEPRECATED: Same reason as above
  nextFollowUpDate?: string | null;
  notes?: string;
  createdAt?: any;
  uploadedBy?: string;

  // Follow-up History


  // Converted Lead Fields
  invoiceNo?: string;
  projectValue?: string;
  convertedBy?: string;
  convertedAt?: any;

  // Lost Lead Fields
  lostRemark?: string;
  lostBy?: string;
  lostAt?: any;
}

export interface LostLead {
  id: string;
  lead: Lead;
  lostBy: string;
  lostDate: any;
  lostRemark?: string;
  isPermanent: boolean;
}

export interface FieldConfig {
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

// -------------------- Context Interface --------------------

interface LeadsContextValue {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  lostLeads: LostLead[];
  setLostLeads: React.Dispatch<React.SetStateAction<LostLead[]>>;
  fieldConfigs: FieldConfig[];
  setFieldConfigs: React.Dispatch<React.SetStateAction<FieldConfig[]>>;
  isLoading: boolean;

  // CRUD
  addLead: (leadData: Partial<Lead>) => Promise<string | null>;
  updateLead: (leadId: string, updates: Partial<Lead>) => Promise<boolean>;
  assignLead: (leadId: string, userId: string) => Promise<boolean>;
  unassignLead: (leadId: string) => Promise<boolean>;

  // Follow-ups
  addFollowUp: (
    leadId: string,
    followUp: Omit<FollowUp, "id" | "createdAt" | "createdBy" | "status">,
    leadUpdates?: Partial<Lead>
  ) => Promise<boolean>;
  updateFollowUp: (
    leadId: string,
    followUp: FollowUp,
    leadUpdates?: Partial<Lead>
  ) => Promise<boolean>;
  batchAddLeads: (leads: Partial<Lead>[]) => Promise<number>;

  // Lost leads
  markAsLost: (leadId: string, remark: string, userId: string, isPermanent?: boolean) => Promise<boolean>;
  restoreLostLead: (lostId: string) => Promise<boolean>;
  permanentlyDeleteLost: (lostId: string) => Promise<boolean>;

  // Converted
  markAsConverted: (leadId: string, invoiceNo: string, projectValue: string, userId: string) => Promise<boolean>;

  // Queries
  getLeadsByCompany: (companyId: string) => Lead[];
  getUnassignedLeads: (companyId: string) => Lead[];
  getAssignedLeads: (companyId: string) => Lead[];
  getLeadsAssignedToUser: (userId: string) => Lead[];
  getConvertedLeads: (companyId: string) => Lead[];
  getDirectorFollowUpsForDate: (date: string, companyId?: string) => Array<{lead: Lead; director: Director; followUp: FollowUp}>;
  getGlobalAggregates: (companyId?: string) => {
    totalCompanies: number;
    totalLeads: number;
    convertedLeads: number;
    conversionRate: number;
    activeUsers: number;
  };
  // NEW: Follow-up helper functions
  getActiveFollowUps: (lead: Lead, directorId?: string) => FollowUp[];
  getAllFollowUps: (lead: Lead, directorId?: string) => FollowUp[];
  hasFollowUps: (lead: Lead) => boolean;
  getLastFollowUp: (lead: Lead) => FollowUp | null;
  calculateNextFollowUpDate: (lead: Lead) => string | null;
  getLatestActiveFollowUpForCompany: (lead: Lead) => FollowUp | null;

  // Pagination
  paginatedLeads: Lead[];
  totalLeadsCount: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  loadLeadsPaginated: (
    pageIndex: number,
    view: 'pool' | 'assigned' | 'converted' | 'lost',
    filters?: any
  ) => Promise<void>;
  resetPagination: () => void;
  pauseListeners: () => void;
  resumeListeners: () => void;
}

/**
 * Get only active follow-ups for a lead (optionally filtered by director)
 * Backward compatible: treats missing status as "active"
 */
export const getActiveFollowUps = (lead: Lead, directorId?: string): FollowUp[] => {
  const allFollowUps: FollowUp[] = [];
  
  lead.directors?.forEach(director => {
    if (directorId && director.id !== directorId) return;
    
    (director.followUps || []).forEach(followUp => {
      const isActive = !followUp.status || followUp.status === "active";
      if (isActive) {
        allFollowUps.push(followUp);
      }
    });
  });
  
  // Sort by date + time
  return allFollowUps.sort((a, b) => {
    return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
  });
};

/**
 * Get ALL follow-ups for a lead (both active and updated), optionally filtered by director
 * Used for History Modal
 */
export const getAllFollowUps = (lead: Lead, directorId?: string): FollowUp[] => {
  const allFollowUps: FollowUp[] = [];
  
  lead.directors?.forEach(director => {
    if (directorId && director.id !== directorId) return;
    
    (director.followUps || []).forEach(followUp => {
      allFollowUps.push(followUp);
    });
  });
  
  // Sort by createdAt (chronological order)
  return allFollowUps.sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
};



export const getLastFollowUp = (lead: Lead): FollowUp | null => {
  const all = getAllFollowUps(lead);
  return all.length > 0 ? all[all.length - 1] : null;
};

export const calculateNextFollowUpDate = (lead: Lead): string | null => {
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

export const getLatestActiveFollowUpForCompany = (lead: Lead): FollowUp | null => {
  const active = getActiveFollowUps(lead);
  return active.length > 0 ? active[active.length - 1] : null;
};

export const LeadsContext = createContext<LeadsContextValue | undefined>(undefined);

export const useLeads = (): LeadsContextValue => {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
};

// -------------------- Default Field Configs --------------------

const defaultFieldConfigs: FieldConfig[] = [
  { id: '1', label: 'CIN', key: 'cin', type: 'text', required: false, showInForm: true, showInExcel: true, excelHeader: 'CIN' },
  { id: '2', label: 'Company Name', key: 'companyName', type: 'text', required: true, showInForm: true, showInExcel: true, excelHeader: 'Company Name' },
  { id: '3', label: 'Authorised Capital', key: 'authorisedCapital', type: 'text', required: false, showInForm: true, showInExcel: true, excelHeader: 'Authorised Capital(₹)' },
  { id: '4', label: 'Paid up Capital', key: 'paidUpCapital', type: 'text', required: false, showInForm: true, showInExcel: true, excelHeader: 'Paid up Capital(₹)' },
  { id: '5', label: 'Date of Incorporation', key: 'dateOfIncorporation', type: 'date', required: false, showInForm: true, showInExcel: true, excelHeader: 'Date of Incorporation' },
  { id: '6', label: 'Registered Address', key: 'registeredAddress', type: 'textarea', required: false, showInForm: true, showInExcel: true, excelHeader: 'Registered Address' },
  { id: '7', label: 'Company Email', key: 'companyEmail', type: 'email', required: false, showInForm: true, showInExcel: true, excelHeader: 'Company E-mail id' },
  { id: '8', label: 'DIN', key: 'din', type: 'text', required: false, showInForm: true, showInExcel: true, excelHeader: 'DIN' },
  { id: '9', label: 'Director First Name', key: 'directorFirstName', type: 'text', required: false, showInForm: true, showInExcel: true, excelHeader: 'F Name' },
  { id: '10', label: 'Director Last Name', key: 'directorLastName', type: 'text', required: false, showInForm: true, showInExcel: true, excelHeader: 'L Name' },
  { id: '11', label: 'Mobile', key: 'mobile', type: 'tel', required: false, showInForm: true, showInExcel: true, excelHeader: 'Mobile' },
  { id: '12', label: 'Director Email', key: 'directorEmail', type: 'email', required: false, showInForm: true, showInExcel: true, excelHeader: 'Director E-mail id' },
  { id: '13', label: 'Status', key: 'status', type: 'select', required: true, showInForm: true, showInExcel: true, excelHeader: 'Status', options: ['Hot', 'Warm', 'Cold', 'Converted', 'Lost'] },

  { id: '15', label: 'Notes', key: 'notes', type: 'textarea', required: false, showInForm: true, showInExcel: true, excelHeader: 'Notes' },
      try {
        return JSON.parse(saved);
      } catch (e) {
        return defaultFieldConfigs;
      }
    }
    return defaultFieldConfigs;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Pagination State
  const [paginatedLeads, setPaginatedLeads] = useState<Lead[]>([]);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState<DocumentData[]>([]); // Store cursors

  // Pause listeners state
  const [isPaused, setIsPaused] = useState(false);

  const pauseListeners = () => setIsPaused(true);
  const resumeListeners = () => setIsPaused(false);

  const totalPages = Math.ceil(totalLeadsCount / pageSize);



  const loadLeadsPaginated = async (
    pageIndex: number,
    view: 'pool' | 'assigned' | 'converted' | 'lost',
    filters?: any
  ) => {
    if (!user) return;
    setIsLoading(true);


    try {
      let baseQuery = collection(db, "leads");
      let constraints: any[] = [];

      // 1. STRICT SERVER-SIDE ROLE SCOPING
      if (user.role === 'sales_user') {
        // Sales Users: ONLY their assigned leads
        constraints.push(where("assignedTo", "==", user.id));
      } else if (user.role === 'company_admin' || user.role === 'team_lead') {
        // Company Admin / Team Lead: Company-scoped
        constraints.push(where("companyId", "==", user.companyId));
      }
      // Super Admin: No constraints (sees all)

      // 1.5 STATUS FILTER (Optional)
      if (filters?.status && filters.status !== 'all') {
        constraints.push(where("status", "==", filters.status));
      }

      // 2. ORDERING (Always createdAt desc)
      // Do NOT add status filters here to prevent index explosions
      let q = query(baseQuery, ...constraints, orderBy("createdAt", "desc"), limit(pageSize));

      // 3. PAGINATION CURSOR
      if (pageIndex > 0 && pages[pageIndex - 1]) {
        q = query(baseQuery, ...constraints, orderBy("createdAt", "desc"), startAfter(pages[pageIndex - 1]), limit(pageSize));
      }

      const snapshot = await getDocs(q);
      
      // Store cursor for next page
      if (snapshot.docs.length > 0) {
        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        setPages(prev => {
          const newPages = [...prev];
          newPages[pageIndex] = lastVisible;
          return newPages;
        });
      }

      const fetchedLeads = snapshot.docs.map(doc => normalizeDoc(doc.id, doc.data()));
      
      // 4. CLIENT-SIDE VISIBILITY & BUSINESS LOGIC FILTERING
      const visibleLeads = fetchedLeads.filter(lead => {
        // Global View Filters
        if (view === 'converted' && lead.status !== 'Converted') return false;
        if (view === 'lost' && lead.status !== 'Lost') return false;
        if ((view === 'pool' || view === 'assigned') && (lead.status === 'Lost' || lead.status === 'Converted')) return false;

        // Role-Specific Logic
        if (user.role === 'sales_user') {
          if (view === 'pool') return canSalesUserViewLeadInPool(user, lead);
          if (view === 'assigned') return canSalesUserViewLeadInAssigned(user, lead);
        } else if (user.role === 'company_admin' || user.role === 'team_lead') {
          if (view === 'pool') return canAdminOrTlViewLeadInPool(user, lead);
          if (view === 'assigned') return lead.isAssigned; // Admin sees all assigned
        }
        
        return true;
      });
      
      // Set total count from filtered results (fallback)
      if (pageIndex === 0) {
        if (leads.length > 0) {
          // If we have the full list, calculate accurate count based on view
          const count = leads.filter(lead => {
            // Global View Filters
            if (view === 'converted' && lead.status !== 'Converted') return false;
            if (view === 'lost' && lead.status !== 'Lost') return false;
            if ((view === 'pool' || view === 'assigned') && (lead.status === 'Lost' || lead.status === 'Converted')) return false;

            // Role-Specific Logic
            if (user.role === 'sales_user') {
              if (view === 'pool') return canSalesUserViewLeadInPool(user, lead);
              if (view === 'assigned') return canSalesUserViewLeadInAssigned(user, lead);
            } else if (user.role === 'company_admin' || user.role === 'team_lead') {
              if (view === 'pool') return canAdminOrTlViewLeadInPool(user, lead);
              if (view === 'assigned') return lead.isAssigned;
            }
            return true;
          }).length;
          setTotalLeadsCount(count);
        } else {
          setTotalLeadsCount(visibleLeads.length);
        }
      }
      
      setPaginatedLeads([...visibleLeads]);
      setCurrentPage(pageIndex);

    } catch (error) {
      console.warn("loadLeadsPaginated failed:", error);
      // Do not retry endlessly
    } finally {
      setIsLoading(false);
    }
  };

  // ... resetPagination ...

  // ... useEffects ...

  // ... normalizeDoc ...

  // ... CRUD methods ...

  const batchAddLeads = async (leadsData: Partial<Lead>[]): Promise<number> => {
    try {
      // Pause listeners to prevent snapshot thrashing
      pauseListeners();
      
      // Process in chunks of 500 (Firestore batch limit)
      const chunkSize = 500;
      let successCount = 0;
      
      for (let i = 0; i < leadsData.length; i += chunkSize) {
        const chunk = leadsData.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        chunk.forEach(lead => {
          const docRef = doc(collection(db, "leads"));
          // CRITICAL: Enforce required fields for sorting/filtering
          batch.set(docRef, {
            ...lead,
            status: lead.status || "Cold",
            isAssigned: !!lead.assignedTo,
            assignedTo: lead.assignedTo || null,
            companyId: lead.companyId || user?.companyId || '',
            createdAt: lead.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            directors: lead.directors || [],
            uploadedBy: user?.id || '',
            id: docRef.id
          });
        });
        
        await batch.commit();
        successCount += chunk.length;
      }
      
      // Reset pagination to show new leads
      resetPagination();
      
      // Resume listeners after import
      resumeListeners();
      
      // Reload leads
      loadLeadsPaginated(0, 'pool'); 
      
      return successCount;
    } catch (err) {
      console.error("batchAddLeads error:", err);
      resumeListeners(); // Ensure listeners are resumed on error
      return 0;
    }
  };

  // ... rest of the file ...


  const resetPagination = () => {
    setPages([]);
    setCurrentPage(0);
    setPaginatedLeads([]);
    setTotalLeadsCount(0);
  };

  // Persist fieldConfigs to localStorage
  useEffect(() => {
    if (fieldConfigs.length > 0) {
      localStorage.setItem('lms_fieldConfigs', JSON.stringify(fieldConfigs));
    }
  }, [fieldConfigs]);

  // Helper: normalize Firestore doc to Lead
  const normalizeDoc = (id: string, data: DocumentData): Lead => {
    return {
      id,
      companyId: data.companyId ?? "",
      cin: data.cin ?? "",
      companyName: data.companyName ?? "",
      authorisedCapital: data.authorisedCapital ?? "",
      paidUpCapital: data.paidUpCapital ?? "",
      dateOfIncorporation: data.dateOfIncorporation ?? "",
      registeredAddress: data.registeredAddress ?? "",
      companyEmail: data.companyEmail ?? "",
      directors: data.directors ?? [],
      din: data.din ?? data.directors?.[0]?.din ?? "",
      directorFirstName: data.directorFirstName ?? "",
      directorLastName: data.directorLastName ?? "",
      mobile: data.mobile ?? "",
      directorEmail: data.directorEmail ?? "",
      status: (data.status ?? "Cold") as LeadStatus,
      isAssigned: !!data.isAssigned,
      assignedTo: data.assignedTo ?? null,
      assignedAt: data.assignedAt?.toDate?.()?.toISOString() ?? null,
      followUpDate: data.followUpDate ?? null,
      nextFollowUpDate: data.nextFollowUpDate ?? null,
      notes: data.notes ?? "",
      // CRITICAL: Ensure createdAt always exists for orderBy to work
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt ?? new Date().toISOString(),
      uploadedBy: data.uploadedBy ?? null,

      invoiceNo: data.invoiceNo ?? null,
      projectValue: data.projectValue ?? null,
      convertedBy: data.convertedBy ?? null,
      convertedAt: data.convertedAt?.toDate?.()?.toISOString() ?? null,
      lostRemark: data.lostRemark ?? null,
      lostBy: data.lostBy ?? null,
      lostAt: data.lostAt?.toDate?.()?.toISOString() ?? null,
    } as Lead;
  };

  // Subscribe to leads collection
  useEffect(() => {
    if (authLoading || isPaused) {
      if (isPaused) console.log("Leads listener paused...");
      setIsLoading(authLoading); // Keep loading state if auth is loading
      return;
    }

    try {
      let q;
      if (user && user.companyId) {
        if (user.role === 'sales_user') {
          q = query(collection(db, "leads"), where("assignedTo", "==", user.id));
        } else if (user.role === 'super_admin') {
          q = query(collection(db, "leads"));
        } else {
          q = query(collection(db, "leads"), where("companyId", "==", user.companyId));
        }
      } else {
        return;
      }

      setIsLoading(true);
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const arr: Lead[] = [];
          snapshot.forEach((docSnap) => {
            arr.push(normalizeDoc(docSnap.id, docSnap.data()));
          });
          setLeads(arr);
          setIsLoading(false);
        },
        (err) => {
          console.error("Leads onSnapshot error:", err);
          setIsLoading(false);
        }
      );

      return () => unsub();
    } catch (err) {
      console.error("Leads subscription error:", err);
      setIsLoading(false);
    }
  }, [user?.companyId, authLoading]);

  // Subscribe to lostLeads collection
  useEffect(() => {
    if (authLoading) return;

    try {
      const q = query(collection(db, "lostLeads"));

      const unsub = onSnapshot(q, async (snapshot) => {
        const arr: LostLead[] = [];
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          // Fetch the lead document
          try {
            const leadDoc = await getDoc(doc(db, "leads", data.leadId));
            if (leadDoc.exists()) {
              arr.push({
                id: docSnap.id,
                lead: normalizeDoc(leadDoc.id, leadDoc.data()),
                lostBy: data.lostBy,
                lostDate: data.lostDate?.toDate?.()?.toISOString() ?? null,
                lostRemark: data.lostRemark,
                isPermanent: data.isPermanent ?? false,
              });
            }
          } catch (e) {
             console.warn("Error fetching lost lead details", e);
          }
        }
        setLostLeads(arr);
      });

      return () => unsub();
    } catch (err) {
      console.error("LostLeads subscription error:", err);
    }
  }, [authLoading]);

  // -------------------- CRUD Methods --------------------

  const addLead = async (leadData: Partial<Lead>): Promise<string | null> => {
    try {
      const docRef = await addDoc(collection(db, "leads"), {
        ...leadData,
        companyId: leadData.companyId ?? user?.companyId ?? null,
        status: leadData.status ?? "Cold",
        isAssigned: !!leadData.isAssigned,
        assignedTo: leadData.assignedTo ?? null,
        uploadedBy: leadData.uploadedBy ?? user?.id ?? null,
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, "leads", docRef.id), { id: docRef.id }, { merge: true });
      return docRef.id;
    } catch (err) {
      console.error("addLead error:", err);
      return null;
    }
  };

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
          
          if (user.role === "sales_user" && currentData.assignedTo !== user.id) {
            throw new Error("Unauthorized: You can only update leads assigned to you.");
          }

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

  const assignLead = async (leadId: string, userId: string): Promise<boolean> => {
    if (!user) throw new Error("Unauthorized");

    if (user.role === "sales_user") {
      throw new Error("Unauthorized: Sales users cannot assign leads.");
    }

    if (user.role === "super_admin") {
      throw new Error("Unauthorized: Super admin is read-only.");
    }

    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) throw new Error("Target user not found.");

    // Enforce role hierarchy
    if (!canAssignToUser(user.role, targetUser.role)) {
      throw new Error("Unauthorized: Cannot assign to this role.");
    }

    try {
      const leadRef = doc(db, "leads", leadId);
      await runTransaction(db, async (t) => {
        const snap = await t.get(leadRef);
        if (!snap.exists()) throw new Error("Lead not found");
        t.update(leadRef, {
          assignedTo: userId,
          assignedAt: serverTimestamp(),
          isAssigned: true,
        });
      });
      return true;
    } catch (err) {
      console.error("assignLead error:", err);
      return false;
    }
  };

  const unassignLead = async (leadId: string): Promise<boolean> => {
    if (!user) throw new Error("Unauthorized");

    if (user.role === "sales_user") {
      throw new Error("Unauthorized: Sales users cannot unassign leads.");
    }

    if (user.role === "super_admin") {
      throw new Error("Unauthorized: Super admin is read-only.");
    }

    try {
      const leadRef = doc(db, "leads", leadId);

      await runTransaction(db, async (t) => {
        const snap = await t.get(leadRef);
        if (!snap.exists()) throw new Error("Lead not found");

        t.update(leadRef, {
          assignedTo: null,
          assignedAt: null,
          isAssigned: false,
        });
      });

      return true;
    } catch (err) {
      console.error("unassignLead error:", err);
      return false;
    }
  };

  const addFollowUp = async (
    leadId: string,
    followUpData: Omit<FollowUp, "id" | "createdAt" | "createdBy" | "status">,
    leadUpdates?: Partial<Lead>
  ): Promise<boolean> => {
    if (!user) return false;

    // Permission check: Super Admin cannot add follow-ups
    if (user.role === 'super_admin') {
      console.error("Super Admin cannot add follow-ups");
      return false;
    }

    // FIX 3: Past Date Validation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followUpDate = new Date(followUpData.date);
    if (followUpDate < today) {
      throw new Error("Cannot schedule follow-ups in the past");
    }

    try {
      const leadRef = doc(db, "leads", leadId);
      
      await runTransaction(db, async (transaction) => {
        const leadDoc = await transaction.get(leadRef);
        if (!leadDoc.exists()) throw new Error("Lead not found");

        const leadData = leadDoc.data() as Lead;
        const directors = leadData.directors || [];
        
        // FIX 5: Strict Director Matching
        // Must match exact talkedToId
        const directorIndex = directors.findIndex(
          d => d.id === followUpData.talkedToId
        );

        if (directorIndex === -1) {
          throw new Error("Director not found. Please select an existing director.");
        }

        // FIX 4: Prevent Duplicate Follow-ups
        const director = directors[directorIndex];
        const duplicateFU = director.followUps?.find(f =>
          f.date === followUpData.date &&
          f.time === followUpData.time &&
          f.status === "active"
        );

        if (duplicateFU) {
          throw new Error("A follow-up already exists for this date and time");
        }

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

        // Add new follow-up to the director
        directors[directorIndex].followUps = directors[directorIndex].followUps || [];
        directors[directorIndex].followUps.push(newFollowUp);

        // Calculate next follow-up date (based on active follow-ups only)
        const nextDate = calculateNextFollowUpDate({ ...leadData, directors });

        // Prepare updates
        const updates: any = {
          directors,
          nextFollowUpDate: nextDate
        };

        // CRITICAL: DO NOT AUTO-ASSIGN HERE
        if (leadUpdates) {
          Object.assign(updates, leadUpdates);
          
          // FIX D: Permission Checks & Special Handling
          if (leadUpdates.status === 'Converted') {
            if (!hasPermission(user.role, "MARK_AS_CONVERTED")) {
               throw new Error("You do not have permission to mark leads as Converted.");
            }
            updates.assignedTo = null;
            updates.isAssigned = false;
            updates.assignedAt = null;
            updates.convertedAt = new Date().toISOString();
            updates.convertedBy = user.id;

            // Create convertedLeads document
            const convertedRef = doc(collection(db, "convertedLeads"));
            transaction.set(convertedRef, {
              leadId,
              convertedBy: user.id,
              convertedAt: serverTimestamp(),
              invoiceNo: (leadUpdates as any).invoiceNo,
              projectValue: (leadUpdates as any).projectValue,
              id: convertedRef.id
            });
          }
          
          // FIX 1: Lost Leads Unassigned
          if (leadUpdates.status === 'Lost') {
             if (!hasPermission(user.role, "MARK_AS_LOST")) {
                throw new Error("You do not have permission to mark leads as Lost.");
             }
             updates.assignedTo = null;
             updates.isAssigned = false;
             updates.assignedAt = null;

             updates.lostAt = new Date().toISOString();
             updates.lostBy = user.id;
             updates.lostRemark = (leadUpdates as any).lostRemark;

             // Create lostLeads document
             const lostRef = doc(collection(db, "lostLeads"));
             transaction.set(lostRef, {
               leadId,
               lostBy: user.id,
               lostDate: new Date().toISOString(),
               lostRemark: (leadUpdates as any).lostRemark,
               isPermanent: false,
               id: lostRef.id
             });
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

  const updateFollowUp = async (
    leadId: string,
    followUp: FollowUp,
    leadUpdates?: Partial<Lead>
  ): Promise<boolean> => {
    if (!user) return false;

    // Permission check: Super Admin cannot update follow-ups
    if (user.role === 'super_admin') {
      console.error("Super Admin cannot update follow-ups");
      return false;
    }

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

        // FIX 5: Strict Director Matching
        // Must match exact talkedToId
        const newDirectorIndex = directors.findIndex(
          d => d.id === followUp.talkedToId
        );

        if (newDirectorIndex === -1) {
          throw new Error("Director not found. Please select an existing director.");
        }

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
            if (!hasPermission(user.role, "MARK_AS_CONVERTED")) {
               throw new Error("You do not have permission to mark leads as Converted.");
            }
            updates.assignedTo = null;
            updates.isAssigned = false;
            updates.assignedAt = null;
            updates.convertedAt = new Date().toISOString();
            updates.convertedBy = user?.id;

            // Create convertedLeads document
            const convertedRef = doc(collection(db, "convertedLeads"));
            transaction.set(convertedRef, {
              leadId,
              convertedBy: user.id,
              convertedAt: serverTimestamp(),
              invoiceNo: (leadUpdates as any).invoiceNo,
              projectValue: (leadUpdates as any).projectValue,
              id: convertedRef.id
            });
          }
          
          if (leadUpdates.status === 'Lost') {
             if (!hasPermission(user.role, "MARK_AS_LOST")) {
                throw new Error("You do not have permission to mark leads as Lost.");
             }
             updates.assignedTo = null;
             updates.isAssigned = false;
             updates.assignedAt = null;

             updates.lostAt = new Date().toISOString();
             updates.lostBy = user?.id;
             updates.lostRemark = (leadUpdates as any).lostRemark;

             // Create lostLeads document
             const lostRef = doc(collection(db, "lostLeads"));
             transaction.set(lostRef, {
               leadId,
               lostBy: user.id,
               lostDate: new Date().toISOString(),
               lostRemark: (leadUpdates as any).lostRemark,
               isPermanent: false,
               id: lostRef.id
             });
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

  const permanentlyDeleteLost = async (lostId: string): Promise<boolean> => {
    try {
      const lostRef = doc(db, "lostLeads", lostId);
      await deleteDoc(lostRef);
      return true;
    } catch (err) {
      console.error("permanentlyDeleteLost error:", err);
      return false;
    }
  };

  const markAsConverted = async (
    leadId: string,
    invoiceNo: string,
    projectValue: string,
    userId: string
  ): Promise<boolean> => {
    try {
      const convRef = await addDoc(collection(db, "convertedLeads"), {
        leadId,
        invoiceNo,
        projectValue,
        convertedBy: userId,
        convertedAt: serverTimestamp(),
      });
      const leadRef = doc(db, "leads", leadId);
      await updateDoc(leadRef, {
        status: "Converted",
        invoiceNo,
        projectValue,
        convertedBy: userId,
        convertedAt: serverTimestamp(),
        assignedTo: null,
        isAssigned: false,
        assignedAt: null,
      } as any);
      await setDoc(doc(db, "convertedLeads", convRef.id), { id: convRef.id }, { merge: true });
      return true;
    } catch (err) {
      console.error("markAsConverted error:", err);
      return false;
    }
  };

  // -------------------- Query Helpers --------------------

  const getLeadsByCompany = (companyId: string): Lead[] => {
    return leads.filter((l) => l.companyId === companyId);
  };

  const getUnassignedLeads = (companyId: string): Lead[] => {
    return leads.filter((l) => l.companyId === companyId && !l.isAssigned);
  };

  const getAssignedLeads = (companyId: string): Lead[] => {
    return leads.filter((l) => l.companyId === companyId && l.isAssigned && l.status !== 'Converted');
  };

  const getLeadsAssignedToUser = (userId: string): Lead[] => {
    return leads.filter((l) => l.assignedTo === userId && l.status !== 'Converted');
  };

  const getConvertedLeads = (companyId: string): Lead[] => {
    return leads.filter((l) => l.companyId === companyId && l.status === 'Converted');
  };

  const getDirectorFollowUpsForDate = (date: string, companyId?: string): Array<{lead: Lead; director: Director; followUp: FollowUp}> => {
    const filteredLeads = companyId ? getLeadsByCompany(companyId) : leads;
    const result: Array<{lead: Lead; director: Director; followUp: FollowUp}> = [];
    filteredLeads.forEach((lead) => {
      // Exclude Converted and Lost leads from calendar
      if (lead.status === 'Converted' || lead.status === 'Lost') return;

      (lead.directors ?? []).forEach((director) => {
        (director.followUps ?? []).forEach((followUp) => {
          // Only show active follow-ups in calendar (backward compatible: treat missing status as active)
          // AND exclude converted leads
          const isActive = (!followUp.status || followUp.status === "active") && lead.status !== 'Converted';
          if (isActive && followUp.date === date) {
            result.push({ lead, director, followUp });
          }
        });
      });
    });
    return result.sort((a, b) => a.followUp.time.localeCompare(b.followUp.time));
  };

  const getGlobalAggregates = (companyId?: string) => {
    const filteredLeads = companyId ? getLeadsByCompany(companyId) : leads;
    const totalLeads = filteredLeads.length;
    const convertedLeads = filteredLeads.filter(l => l.status === 'Converted').length;
    const lostCount = companyId 
      ? lostLeads.filter(ll => ll.lead.companyId === companyId).length 
      : lostLeads.length;
    const totalProcessed = convertedLeads + lostCount;
    const conversionRate = totalProcessed > 0 ? Math.round((convertedLeads / totalProcessed) * 10000) / 100 : 0;
    const userSet = new Set<string>();
    filteredLeads.forEach(l => {
      if (l.assignedTo) userSet.add(l.assignedTo);
      if (l.uploadedBy) userSet.add(l.uploadedBy);
      if (l.convertedBy) userSet.add(l.convertedBy);
    });
    const activeUsers = userSet.size;
    const totalCompanies = new Set(filteredLeads.map(l => l.companyId)).size;
    return { totalCompanies, totalLeads, convertedLeads, conversionRate, activeUsers };
  };

  // -------------------- Context Value --------------------

  const value: LeadsContextValue = {
    leads,
    setLeads,
    lostLeads,
    setLostLeads,
    fieldConfigs,
    setFieldConfigs,
    isLoading,
    addLead,
    updateLead,
    assignLead,
    unassignLead,
    addFollowUp,
    markAsLost,
    restoreLostLead,
    permanentlyDeleteLost,
    markAsConverted,
    getLeadsByCompany,
    getUnassignedLeads,
    getAssignedLeads,
    getLeadsAssignedToUser,
    getConvertedLeads,
    getDirectorFollowUpsForDate,
    getGlobalAggregates,
    updateFollowUp,
    batchAddLeads,
    // NEW: Follow-up helpers
    getActiveFollowUps,
    getAllFollowUps,
    calculateNextFollowUpDate,
    getLatestActiveFollowUpForCompany,
    hasFollowUps,
    getLastFollowUp,

    // Pagination
    paginatedLeads,
    totalLeadsCount,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    totalPages,
    loadLeadsPaginated,
    resetPagination,
    pauseListeners,
    resumeListeners
  };

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
};

export default LeadsProvider;
