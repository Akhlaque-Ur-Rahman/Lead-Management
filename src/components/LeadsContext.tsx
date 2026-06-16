// src/components/LeadsContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";
import { FEATURE_FLAGS } from '../config/featureFlags';

// Utils
import { filterLeadsForView, LeadView, isLeadInPoolForUser, isLeadInAssignedForUser } from '../utils/filters/leadFilters';
import { subscribeToEvents, triggerUpdateEvent } from '../utils/events/eventBus';
import { initBackgroundSync } from '../utils/events/sync';
import { calculateNextFollowUpDate } from '../utils/followups/calculations';
import { hasPermission, canAssignToUser } from '../utils/role/permissions';
import { hasFollowUps } from '../utils/role/visibility';
import { checkForDuplicates } from '../utils/imports/duplicateCheck';

// -------------------- Types --------------------

export type RoleKey = "super_admin" | "company_admin" | "team_lead" | "sales_user";

export interface FollowUp {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  remark: string;
  createdBy: string;
  createdAt: string;
  talkedTo: string;
  talkedToId?: string;
  talkedToName?: string;
  followUpStatus: "Hot" | "Warm" | "Cold" | "Converted" | "Lost";
  status?: "active" | "updated";
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
  cin: string;
  companyName: string;
  authorisedCapital?: string;
  paidUpCapital?: string;
  dateOfIncorporation?: string;
  registeredAddress?: string;
  companyEmail?: string;
  directors: Director[];
  
  // Legacy
  din?: string;
  directorFirstName?: string;
  directorLastName?: string;
  mobile?: string;
  directorEmail?: string;

  status: LeadStatus;
  isAssigned: boolean;
  assignedTo: string | null;
  assignedAt?: string;
  
  // Deprecated but kept for type safety until full migration
  followUpDate?: string | null;
  nextFollowUpDate?: string | null;
  notes?: string;
  
  createdAt?: any;
  uploadedBy?: string;

  invoiceNo?: string;
  projectValue?: string;
  convertedBy?: string;
  convertedAt?: any;

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
  lostLeads: LostLead[]; // Kept for compatibility, but mainly we filter from leads
  setLostLeads: React.Dispatch<React.SetStateAction<LostLead[]>>;
  fieldConfigs: FieldConfig[];
  setFieldConfigs: React.Dispatch<React.SetStateAction<FieldConfig[]>>;
  isLoading: boolean;
  refreshFlag: number;
  refreshLeads: () => void;

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

  // Actions
  markAsLost: (leadId: string, remark: string, userId: string, isPermanent?: boolean) => Promise<boolean>;
  restoreLostLead: (lostId: string) => Promise<boolean>;
  permanentlyDeleteLost: (lostId: string) => Promise<boolean>;
  markAsConverted: (leadId: string, invoiceNo: string, projectValue: string, userId: string) => Promise<boolean>;

  // Getters
  getLeadsByCompany: (companyId: string) => Lead[];
  getUnassignedLeads: (companyId: string) => Lead[];
  getAssignedLeads: (companyId: string) => Lead[];
  getLeadsAssignedToUser: (userId: string) => Lead[];
  getConvertedLeads: (companyId: string) => Lead[];
  getDirectorFollowUpsForDate: (date: string, companyId?: string) => Array<{lead: Lead; director: Director; followUp: FollowUp}>;
  getGlobalAggregates: (companyId?: string) => any;
  
  // Helpers
  getActiveFollowUps: (lead: Lead, directorId?: string) => FollowUp[];
  getAllFollowUps: (lead: Lead, directorId?: string) => FollowUp[];
  hasFollowUps: (lead: Lead) => boolean;
  getLastFollowUp: (lead: Lead) => FollowUp | null;
  calculateNextFollowUpDate: (lead: Lead) => string | null;
  getLatestActiveFollowUpForCompany: (lead: Lead) => FollowUp | null;

  // New Loader
  loadLeadsAll: (
    view: LeadView,
    filters?: any,
    limitOverride?: number,
    sortOption?: "latest" | "oldest"
  ) => Promise<Lead[]>;
}

// -------------------- Helpers --------------------

export const getActiveFollowUps = (lead: Lead, directorId?: string): FollowUp[] => {
  const allFollowUps: FollowUp[] = [];
  lead.directors?.forEach(director => {
    if (directorId && director.id !== directorId) return;
    (director.followUps || []).forEach(followUp => {
      const isActive = !followUp.status || followUp.status === "active";
      if (isActive) allFollowUps.push(followUp);
    });
  });
  return allFollowUps.sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
};

export const getAllFollowUps = (lead: Lead, directorId?: string): FollowUp[] => {
  const allFollowUps: FollowUp[] = [];
  lead.directors?.forEach(director => {
    if (directorId && director.id !== directorId) return;
    (director.followUps || []).forEach(followUp => allFollowUps.push(followUp));
  });
  return allFollowUps.sort((a, b) => (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0));
};

export const getLastFollowUp = (lead: Lead): FollowUp | null => {
  const all = getAllFollowUps(lead);
  return all.length > 0 ? all[all.length - 1] : null;
};

export const getLatestActiveFollowUpForCompany = (lead: Lead): FollowUp | null => {
  const active = getActiveFollowUps(lead);
  return active.length > 0 ? active[active.length - 1] : null;
};

// -------------------- Default Configs --------------------

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
];

// -------------------- Provider --------------------

export const LeadsContext = createContext<LeadsContextValue | undefined>(undefined);

export const LeadsProvider = ({ children }: { children: ReactNode }) => {
  const { user, users } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [lostLeads, setLostLeads] = useState<LostLead[]>([]);
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>(() => {
    const saved = localStorage.getItem('lms_fieldConfigs');
    return saved ? JSON.parse(saved) : defaultFieldConfigs;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshFlag, setRefreshFlag] = useState(0);

  // Cache: Map<ViewKey, { data: Lead[], timestamp: number }>
  const cache = useRef<Map<string, { data: Lead[], timestamp: number }>>(new Map());
  const CACHE_TTL = 15000; // 15 seconds

  const refreshLeads = () => {
    setRefreshFlag(prev => prev + 1);
    // Invalidate cache on refresh
    cache.current.clear();
  };

  // Event Listener
  useEffect(() => {
    if (!user || !FEATURE_FLAGS.USE_EVENT_LISTENER) return;
    const unsub = subscribeToEvents(null, user, () => {
      // console.log(`[Event] Received ${event.type}, refreshing...`);
      refreshLeads();
    });
    return () => unsub();
  }, [user]);

  // Background Sync
  useEffect(() => {
    const cleanup = initBackgroundSync(() => {
      // console.log("[Sync] Background sync triggered");
      refreshLeads();
    });
    return cleanup;
  }, []);

  // Persist Configs
  useEffect(() => {
    localStorage.setItem('lms_fieldConfigs', JSON.stringify(fieldConfigs));
  }, [fieldConfigs]);

  // -------------------- Load Leads --------------------

  const loadLeadsAll = async (
    view: LeadView,
    filters?: any,
    limitOverride?: number,
    sortOption: "latest" | "oldest" = "latest"
  ): Promise<Lead[]> => {
    if (!user) return [];

    const cacheKey = `${view}-${JSON.stringify(filters || {})}-${sortOption}-${user.id}`;
    const now = Date.now();
    const cached = cache.current.get(cacheKey);

    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      // console.log(`[loadLeadsAll] Returning cached data for ${view}`);
      setLeads(cached.data);
      return cached.data;
    }

    setIsLoading(true);
    try {
      const { leads: fetchedLeads } = await api.leads.list(view, limitOverride);

      // 3. Filter
      const filteredLeads = fetchedLeads.filter(lead => {
        // Basic exclude
        if (lead.status === 'Converted' || lead.status === 'Lost') {
          // For converted/lost views, handled below in view-specific check
        }

        let isVisible = false;

        // view-specific selection
        if (view === 'pool') {
            isVisible = isLeadInPoolForUser(user, lead);
        } else if (view === 'assigned') {
            isVisible = isLeadInAssignedForUser(user, lead);
        } else if (view === 'converted') {
            isVisible = lead.status === 'Converted';
        } else if (view === 'lost') {
            isVisible = lead.status === 'Lost';
        }

        if (!isVisible) return false;

        // STATUS FILTER — apply to all roles and both Pool + Assigned views
        if (filters?.status && filters.status !== "all") {
            if (lead.status !== filters.status) return false;
        }

        return true;
      });

      // SORTING LOGIC
      filteredLeads.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();

          if (sortOption === "latest") return dateB - dateA;
          if (sortOption === "oldest") return dateA - dateB;

          return 0;
      });

      // 4. Update State & Cache
      setLeads(filteredLeads);
      cache.current.set(cacheKey, { data: filteredLeads, timestamp: now });
      
      setIsLoading(false);
      return filteredLeads;
    } catch (error) {
      console.error("[loadLeadsAll] Error:", error);
      setIsLoading(false);
      return [];
    }
  };

  // -------------------- CRUD --------------------

  const addLead = async (leadData: Partial<Lead>): Promise<string | null> => {
    try {
      const { lead } = await api.leads.create({
        ...leadData,
        companyId: leadData.companyId ?? user?.companyId ?? null,
        status: leadData.status ?? "Cold",
        isAssigned: !!leadData.isAssigned,
        assignedTo: leadData.assignedTo ?? null,
        uploadedBy: leadData.uploadedBy ?? user?.id ?? null,
      });
      refreshLeads();
      triggerUpdateEvent(null, user!, 'LEAD_UPDATE');
      return lead.id;
    } catch (err) {
      console.error("addLead error:", err);
      return null;
    }
  };

  const updateLead = async (leadId: string, updates: Partial<Lead>): Promise<boolean> => {
    if (!user) return false;
    try {
      await api.leads.update(leadId, updates);
      refreshLeads();
      triggerUpdateEvent(null, user, 'LEAD_UPDATE');
      return true;
    } catch (err) {
      console.error("updateLead error:", err);
      return false;
    }
  };

  const assignLead = async (leadId: string, userId: string): Promise<boolean> => {
    if (!user || !hasPermission(user.role as RoleKey, 'ASSIGN_LEADS')) return false;
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser || !canAssignToUser(user.role as RoleKey, targetUser.role as RoleKey)) return false;

    try {
      await api.leads.assign(leadId, userId);
      refreshLeads();
      triggerUpdateEvent(null, user, 'LEAD_ASSIGN');
      triggerUpdateEvent(null, user, 'LEAD_UPDATE');
      return true;
    } catch (error) {
      console.error("assignLead error:", error);
      return false;
    }
  };

  const unassignLead = async (leadId: string): Promise<boolean> => {
    try {
      await api.leads.unassign(leadId);
      refreshLeads();
      triggerUpdateEvent(null, user!, 'LEAD_ASSIGN');
      return true;
    } catch (error) {
      console.error("unassignLead error:", error);
      return false;
    }
  };

  const addFollowUp = async (leadId: string, followUp: Omit<FollowUp, "id" | "createdAt" | "createdBy" | "status">, leadUpdates?: Partial<Lead>): Promise<boolean> => {
    if (!user) return false;
    try {
      await api.leads.addFollowUp(leadId, followUp, leadUpdates);
      refreshLeads();
      triggerUpdateEvent(null, user, 'FOLLOWUP_ADD');
      return true;
    } catch (error) {
      console.error("addFollowUp error:", error);
      return false;
    }
  };

  const updateFollowUp = async (leadId: string, followUp: FollowUp, leadUpdates?: Partial<Lead>): Promise<boolean> => {
    if (!user) return false;
    try {
      await api.leads.updateFollowUp(leadId, followUp, leadUpdates);
      refreshLeads();
      triggerUpdateEvent(null, user, 'FOLLOWUP_ADD');
      return true;
    } catch (error) {
      console.error("updateFollowUp error:", error);
      return false;
    }
  };

  const batchAddLeads = async (leadsData: Partial<Lead>[]): Promise<number> => {
    try {
      const { uniqueLeads, duplicatesCount } = await checkForDuplicates(null, leadsData);
      if (duplicatesCount > 0) {
        console.log(`[batchAddLeads] Skipped ${duplicatesCount} duplicates.`);
      }
      if (uniqueLeads.length === 0) return 0;
      const payload = uniqueLeads.map((lead) => ({
        ...lead,
        status: lead.status || "Cold",
        isAssigned: !!lead.assignedTo,
        assignedTo: lead.assignedTo || null,
        companyId: lead.companyId || user?.companyId || '',
        directors: lead.directors || [],
        uploadedBy: user?.id || '',
      }));
      const { count } = await api.leads.batchCreate(payload);
      refreshLeads();
      triggerUpdateEvent(null, user!, 'LEAD_UPDATE');
      return count;
    } catch (err) {
      console.error("batchAddLeads error:", err);
      return 0;
    }
  };

  const markAsLost = async (leadId: string, remark: string, userId: string): Promise<boolean> => {
    try {
      await api.leads.markLost(leadId, remark, userId);
      refreshLeads();
      triggerUpdateEvent(null, user!, 'LEAD_UPDATE');
      return true;
    } catch (error) {
      console.error("markAsLost error:", error);
      return false;
    }
  };

  const restoreLostLead = async (lostId: string): Promise<boolean> => {
    try {
      await api.leads.restoreLost(lostId);
      refreshLeads();
      triggerUpdateEvent(null, user!, 'LEAD_UPDATE');
      return true;
    } catch (error) {
      console.error("restoreLostLead error:", error);
      return false;
    }
  };

  const permanentlyDeleteLost = async (lostId: string): Promise<boolean> => {
    try {
      await api.leads.delete(lostId);
      refreshLeads();
      triggerUpdateEvent(null, user!, 'LEAD_DELETE');
      return true;
    } catch (error) {
      console.error("permanentlyDeleteLost error:", error);
      return false;
    }
  };

  const markAsConverted = async (leadId: string, invoiceNo: string, projectValue: string, userId: string): Promise<boolean> => {
    try {
      await api.leads.markConverted(leadId, invoiceNo, projectValue, userId);
      refreshLeads();
      triggerUpdateEvent(null, user!, 'LEAD_UPDATE');
      return true;
    } catch (error) {
      console.error("markAsConverted error:", error);
      return false;
    }
  };

  // -------------------- Getters --------------------

  const getLeadsByCompany = (companyId: string) => leads.filter(l => l.companyId === companyId);
  const getUnassignedLeads = (companyId: string) => leads.filter(l => l.companyId === companyId && !l.isAssigned);
  const getAssignedLeads = (companyId: string) => leads.filter(l => l.companyId === companyId && l.isAssigned && l.status !== 'Converted');
  const getLeadsAssignedToUser = (userId: string) => leads.filter(l => l.assignedTo === userId && l.status !== 'Converted');
  const getConvertedLeads = (companyId: string) => leads.filter(l => l.companyId === companyId && l.status === 'Converted');
  
  const getDirectorFollowUpsForDate = (date: string, companyId?: string) => {
    const filteredLeads = companyId ? getLeadsByCompany(companyId) : leads;
    const result: Array<{lead: Lead; director: Director; followUp: FollowUp}> = [];
    filteredLeads.forEach((lead) => {
      if (lead.status === 'Converted' || lead.status === 'Lost') return;
      (lead.directors ?? []).forEach((director) => {
        (director.followUps ?? []).forEach((followUp) => {
          const isActive = (!followUp.status || followUp.status === "active");
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
    const lostCount = leads.filter(l => l.status === 'Lost' && (companyId ? l.companyId === companyId : true)).length;
    
    const totalProcessed = convertedLeads + lostCount;
    const conversionRate = totalProcessed > 0 ? Math.round((convertedLeads / totalProcessed) * 10000) / 100 : 0;
    
    const userSet = new Set<string>();
    filteredLeads.forEach(l => {
      if (l.assignedTo) userSet.add(l.assignedTo);
      if (l.uploadedBy) userSet.add(l.uploadedBy);
    });
    const activeUsers = userSet.size;
    const totalCompanies = new Set(filteredLeads.map(l => l.companyId)).size;
    
    return { totalCompanies, totalLeads, convertedLeads, conversionRate, activeUsers };
  };

  // -------------------- Normalization --------------------
  // API returns normalized leads; kept for compatibility if needed elsewhere.

  return (
    <LeadsContext.Provider
      value={{
        leads,
        setLeads,
        lostLeads,
        setLostLeads,
        fieldConfigs,
        setFieldConfigs,
        isLoading,
        refreshFlag,
        refreshLeads,
        addLead,
        updateLead,
        assignLead,
        unassignLead,
        addFollowUp,
        updateFollowUp,
        batchAddLeads,
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
        getActiveFollowUps,
        getAllFollowUps,
        hasFollowUps,
        getLastFollowUp,
        calculateNextFollowUpDate,
        getLatestActiveFollowUpForCompany,
        loadLeadsAll,
      }}
    >
      {children}
    </LeadsContext.Provider>
  );
};

export const useLeads = (): LeadsContextValue => {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
};
