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
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "./AuthContext";

// -------------------- Types --------------------

export type RoleKey = "super_admin" | "company_admin" | "team_lead" | "sales_user";

export interface FollowUp {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  remark: string;
  createdBy: string;
  createdAt: string;
  directorId?: string;
  directorName?: string;
  talkedTo: string; // Legacy field, kept for backward compatibility
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
  followUpDate?: string;
  nextFollowUpDate?: string;
  notes?: string;
  createdAt?: any;
  uploadedBy?: string;

  // Follow-up History
  followUpHistory?: FollowUp[];

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
  addDirectorFollowUp: (
    leadId: string,
    directorId: string,
    followUp: Omit<FollowUp, "id" | "createdAt" | "createdBy" | "status">
  ) => Promise<boolean>;
  updateDirectorFollowUp: (
    leadId: string,
    directorId: string,
    followUp: FollowUp
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
  calculateNextFollowUpDate: (lead: Lead) => string | null;
}

const LeadsContext = createContext<LeadsContextValue | undefined>(undefined);

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
  { id: '14', label: 'Follow-up Date', key: 'followUpDate', type: 'date', required: true, showInForm: true, showInExcel: true, excelHeader: 'Follow-up Date' },
  { id: '15', label: 'Notes', key: 'notes', type: 'textarea', required: false, showInForm: true, showInExcel: true, excelHeader: 'Notes' },
];

// -------------------- Provider --------------------

export const LeadsProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [lostLeads, setLostLeads] = useState<LostLead[]>([]);
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>(() => {
    const saved = localStorage.getItem('lms_fieldConfigs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return defaultFieldConfigs;
      }
    }
    return defaultFieldConfigs;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      uploadedBy: data.uploadedBy ?? null,
      followUpHistory: data.followUpHistory ?? [],
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
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    try {
      let q;
      if (user && user.companyId) {
        q = query(collection(db, "leads"), where("companyId", "==", user.companyId));
      } else {
        q = query(collection(db, "leads"));
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
        }
        setLostLeads(arr);
      });

      return () => unsub();
    } catch (err) {
      console.error("LostLeads subscription error:", err);
    }
  }, [authLoading]);

  // -------------------- NEW: Follow-up Helper Functions --------------------

  /**
   * Get only active follow-ups for a lead (optionally filtered by director)
   * Backward compatible: treats missing status as "active"
   */
  const getActiveFollowUps = (lead: Lead, directorId?: string): FollowUp[] => {
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
  const getAllFollowUps = (lead: Lead, directorId?: string): FollowUp[] => {
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

  /**
   * Calculate the next follow-up date for a lead (earliest active future follow-up)
   */
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

  const addDirectorFollowUp = async (
    leadId: string,
    directorId: string,
    followUpData: Omit<FollowUp, "id" | "createdAt" | "createdBy" | "status">
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const leadRef = doc(db, "leads", leadId);
      
      await runTransaction(db, async (transaction) => {
        const leadDoc = await transaction.get(leadRef);
        if (!leadDoc.exists()) throw new Error("Lead not found");

        const leadData = leadDoc.data() as Lead;
        const directors = leadData.directors || [];
        const directorIndex = directors.findIndex(d => d.id === directorId);
        
        if (directorIndex === -1) throw new Error("Director not found");

        const newFollowUp: FollowUp = {
          ...followUpData,
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
          createdBy: user.id,
          status: "active", // Always active when created
          // talkedTo, talkedToId, talkedToName and followUpStatus are passed in followUpData
        };

        // COMPANY-LEVEL SINGLETON: Mark ALL follow-ups across ALL directors as 'updated'
        // This ensures only ONE active follow-up exists per company
        directors.forEach((director, idx) => {
          const updatedFollowUps = (director.followUps || []).map(f => {
            // Mark any existing active follow-up as updated
            if (!f.status || f.status === "active") {
              return { ...f, status: "updated" as const };
            }
            return f;
          });
          directors[idx].followUps = updatedFollowUps;
        });

        // Add new follow-up to the specified director
        directors[directorIndex].followUps = directors[directorIndex].followUps || [];
        directors[directorIndex].followUps.push(newFollowUp);

        // Calculate next follow-up date (based on active follow-ups only)
        const nextDate = calculateNextFollowUpDate({ ...leadData, directors });

        transaction.update(leadRef, {
          directors,
          nextFollowUpDate: nextDate
        });
      });
      return true;
    } catch (error) {
      console.error("Error adding director follow-up:", error);
      throw error;
    }
  };

  const updateDirectorFollowUp = async (
    leadId: string,
    directorId: string,
    followUp: FollowUp
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
      await runTransaction(db, async (t) => {
        const snap = await t.get(leadRef);
        if (!snap.exists()) throw new Error("Lead not found");
        const data = snap.data();
        const directors: Director[] = data.directors ?? [];
        const idx = directors.findIndex((d) => d.id === directorId);
        if (idx === -1) throw new Error("Director not found on lead");

        // COMPANY-LEVEL SINGLETON: Mark ALL follow-ups across ALL directors as 'updated'
        directors.forEach((director, dirIdx) => {
          const updatedFollowUps = (director.followUps || []).map(f => {
            if (!f.status || f.status === "active") {
              return { ...f, status: "updated" as const };
            }
            return f;
          });
          directors[dirIdx].followUps = updatedFollowUps;
        });
        
        // Create a new follow-up with updated data and "active" status
        const newFollowUp: FollowUp = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          date: followUp.date,
          time: followUp.time,
          remark: followUp.remark,
          talkedTo: followUp.talkedTo,
          talkedToId: followUp.talkedToId,
          talkedToName: followUp.talkedToName,
          createdBy: user?.id ?? "unknown",
          createdAt: new Date().toISOString(),
          directorId,
          directorName: directors[idx].firstName + " " + directors[idx].lastName,
          status: "active",
          followUpStatus: followUp.followUpStatus
        };
        
        // Add the new follow-up to the specified director
        directors[idx].followUps = directors[idx].followUps || [];
        directors[idx].followUps.push(newFollowUp);
        
        // Sort follow-ups by createdAt (chronological order)
        directors[idx].followUps.sort((a, b) => {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

        // Recalculate nextFollowUpDate (only active follow-ups)
        const nextFollowUpDate = calculateNextFollowUpDate({ ...data, directors } as Lead);

        t.update(leadRef, { 
          directors,
          nextFollowUpDate: nextFollowUpDate
        } as any);
      });
      return true;
    } catch (err) {
      console.error("updateDirectorFollowUp error:", err);
      throw err;
    }
  };

  const batchAddLeads = async (leadsData: Partial<Lead>[]): Promise<number> => {
    try {
      // Process in chunks of 500 (Firestore batch limit)
      const chunkSize = 500;
      let successCount = 0;
      
      for (let i = 0; i < leadsData.length; i += chunkSize) {
        const chunk = leadsData.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        chunk.forEach(lead => {
          const docRef = doc(collection(db, "leads"));
          batch.set(docRef, {
            ...lead,
            companyId: lead.companyId ?? user?.companyId ?? null,
            status: lead.status ?? "Cold",
            isAssigned: !!lead.isAssigned,
            assignedTo: lead.assignedTo ?? null,
            uploadedBy: lead.uploadedBy ?? user?.id ?? null,
            createdAt: serverTimestamp(),
            id: docRef.id // Ensure ID is saved in document
          });
        });
        
        await batch.commit();
        successCount += chunk.length;
      }
      
      return successCount;
    } catch (err) {
      console.error("batchAddLeads error:", err);
      return 0;
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
    return leads.filter((l) => l.companyId === companyId && l.isAssigned);
  };

  const getLeadsAssignedToUser = (userId: string): Lead[] => {
    return leads.filter((l) => l.assignedTo === userId);
  };

  const getConvertedLeads = (companyId: string): Lead[] => {
    return leads.filter((l) => l.companyId === companyId && l.status === 'Converted');
  };

  const getDirectorFollowUpsForDate = (date: string, companyId?: string): Array<{lead: Lead; director: Director; followUp: FollowUp}> => {
    const filteredLeads = companyId ? getLeadsByCompany(companyId) : leads;
    const result: Array<{lead: Lead; director: Director; followUp: FollowUp}> = [];
    filteredLeads.forEach((lead) => {
      (lead.directors ?? []).forEach((director) => {
        (director.followUps ?? []).forEach((followUp) => {
          // Only show active follow-ups in calendar (backward compatible: treat missing status as active)
          const isActive = !followUp.status || followUp.status === "active";
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
    addDirectorFollowUp,
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
    updateDirectorFollowUp,
    batchAddLeads,
    // NEW: Follow-up helpers
    getActiveFollowUps,
    getAllFollowUps,
    calculateNextFollowUpDate,
  };

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
};

export default LeadsProvider;
