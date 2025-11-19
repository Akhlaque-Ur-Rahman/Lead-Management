import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface FollowUp {
  id: string;
  date: string;
  time: string;
  remark: string;
  createdBy: string;
  createdAt: string;
  directorId?: string;
  directorName?: string;
}

export interface LostLead {
  lead: Lead;
  lostBy: string;
  lostDate: string;
  lostRemark: string;
  isPermanent: boolean;
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

export interface Lead {
  id: string;
  companyId: string; // Multi-tenant support
  
  // MCA Data Fields
  cin: string;
  companyName: string;
  authorisedCapital: string;
  paidUpCapital: string;
  dateOfIncorporation: string;
  registeredAddress: string;
  companyEmail: string;
  
  // Director Information
  directors: Director[];
  
  // Legacy fields
  din: string;
  directorFirstName: string;
  directorLastName: string;
  mobile: string;
  directorEmail: string;
  
  // LMS Fields
  status: 'Hot' | 'Warm' | 'Cold' | 'Converted' | 'Lost';
  isAssigned: boolean; // TRUE when assigned to user
  assignedTo: string | null; // User ID when assigned
  assignedAt?: string; // Timestamp of assignment
  followUpDate: string;
  nextFollowUpDate?: string;
  notes: string;
  createdAt: string;
  uploadedBy: string; // Who uploaded/created this lead
  
  // Follow-up History
  followUpHistory?: FollowUp[];
  
  // Converted Lead Fields
  invoiceNo?: string;
  projectValue?: string;
  convertedBy?: string;
  convertedAt?: string;
  
  // Lost Lead Fields
  lostRemark?: string;
  lostBy?: string;
  lostAt?: string;
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

interface LeadsContextType {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  lostLeads: LostLead[];
  setLostLeads: React.Dispatch<React.SetStateAction<LostLead[]>>;
  fieldConfigs: FieldConfig[];
  setFieldConfigs: React.Dispatch<React.SetStateAction<FieldConfig[]>>;
  
  // Lead Operations
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'isAssigned' | 'assignedTo'>, createdByUserId?: string, isManualCreation?: boolean) => void;
  updateLead: (leadId: string, updates: Partial<Lead>) => void;
  assignLead: (leadId: string, userId: string) => void;
  unassignLead: (leadId: string) => void;
  
  // Follow-up Operations
  addDirectorFollowUp: (leadId: string, directorId: string, followUp: Omit<FollowUp, 'id'>) => void;
  
  // Lost Lead Operations
  markAsLost: (leadId: string, remark: string, userId: string, isPermanent: boolean) => void;
  restoreLostLead: (lostLeadIndex: number) => void;
  permanentlyDeleteLost: (lostLeadIndex: number) => void;
  
  // Converted Lead Operations
  markAsConverted: (leadId: string, invoiceNo: string, projectValue: string, userId: string) => void;
  
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
}

const LeadsContext = createContext<LeadsContextType | undefined>(undefined);

export const useLeads = () => {
  const context = useContext(LeadsContext);
  if (context === undefined) {
    throw new Error('useLeads must be used within a LeadsProvider');
  }
  return context;
};

// Default field configurations
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

// Mock initial leads with multi-tenant data
const getInitialLeads = (): Lead[] => {
  const today = new Date();
  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return [
    // Company 1 - ABC Motors - Unassigned Leads
    {
      id: 'lead-1-1',
      companyId: 'company-1',
      cin: 'U74999DL2020PTC123456',
      companyName: 'Tech Innovations Pvt Ltd',
      authorisedCapital: '10,00,000',
      paidUpCapital: '7,50,000',
      dateOfIncorporation: '2020-05-15',
      registeredAddress: 'Plot 123, Sector 18, Noida, UP 201301',
      companyEmail: 'info@techinnovations.com',
      directors: [
        {
          id: 'dir-1-1-1',
          din: '08765432',
          firstName: 'Rahul',
          lastName: 'Verma',
          mobile: '+91 98765 43210',
          email: 'rahul@techinnovations.com',
          followUps: []
        }
      ],
      din: '08765432',
      directorFirstName: 'Rahul',
      directorLastName: 'Verma',
      mobile: '+91 98765 43210',
      directorEmail: 'rahul@techinnovations.com',
      status: 'Hot',
      isAssigned: false,
      assignedTo: null,
      followUpDate: getLocalDateString(today),
      notes: 'New lead from MCA data',
      createdAt: '2025-10-01',
      uploadedBy: 'user-1-1',
      followUpHistory: []
    },
    // Company 1 - Assigned Lead
    {
      id: 'lead-1-2',
      companyId: 'company-1',
      cin: 'U74999MH2021PTC234567',
      companyName: 'Digital Solutions Ltd',
      authorisedCapital: '15,00,000',
      paidUpCapital: '10,00,000',
      dateOfIncorporation: '2021-03-20',
      registeredAddress: 'Tower A, BKC, Mumbai, MH 400051',
      companyEmail: 'contact@digitalsol.com',
      directors: [
        {
          id: 'dir-1-2-1',
          din: '09876543',
          firstName: 'Priya',
          lastName: 'Nair',
          mobile: '+91 98765 43211',
          email: 'priya@digitalsol.com',
          followUps: [
            {
              id: 'fu-1-2-1-1',
              date: getLocalDateString(new Date(today.getTime() + 86400000)), // Tomorrow
              time: '10:00',
              remark: 'First follow-up call scheduled',
              createdBy: 'user-1-3',
              createdAt: new Date().toISOString(),
              directorId: 'dir-1-2-1',
              directorName: 'Priya Nair'
            }
          ],
          nextFollowUpDate: getLocalDateString(new Date(today.getTime() + 86400000)),
          nextFollowUpTime: '10:00'
        }
      ],
      din: '09876543',
      directorFirstName: 'Priya',
      directorLastName: 'Nair',
      mobile: '+91 98765 43211',
      directorEmail: 'priya@digitalsol.com',
      status: 'Warm',
      isAssigned: true,
      assignedTo: 'user-1-3', // Assigned to Amit
      assignedAt: '2025-10-12',
      followUpDate: getLocalDateString(new Date(today.getTime() + 86400000)),
      notes: 'Good prospect, interested in products',
      createdAt: '2025-10-05',
      uploadedBy: 'user-1-1',
      followUpHistory: []
    }
  ];
};

export const LeadsProvider = ({ children }: { children: ReactNode }) => {
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('lms_leads');
    return saved ? JSON.parse(saved) : getInitialLeads();
  });
  
  const [lostLeads, setLostLeads] = useState<LostLead[]>(() => {
    const saved = localStorage.getItem('lms_lostLeads');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>(() => {
    const saved = localStorage.getItem('lms_fieldConfigs');
    return saved ? JSON.parse(saved) : defaultFieldConfigs;
  });

  useEffect(() => {
    localStorage.setItem('lms_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('lms_lostLeads', JSON.stringify(lostLeads));
  }, [lostLeads]);

  useEffect(() => {
    localStorage.setItem('lms_fieldConfigs', JSON.stringify(fieldConfigs));
  }, [fieldConfigs]);

  const addLead = (leadData: Omit<Lead, 'id' | 'createdAt' | 'isAssigned' | 'assignedTo'>, createdByUserId?: string, isManualCreation: boolean = true) => {
    const today = new Date();
    const createdAt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Auto-assign manual leads to creator, leave imported leads unassigned
    const isAssigned = isManualCreation && !!createdByUserId;
    const assignedTo = isAssigned ? createdByUserId : null;
    const assignedAt = isAssigned ? createdAt : undefined;
    
    const newLead: Lead = {
      ...leadData,
      id: `lead-${Date.now()}`,
      createdAt,
      isAssigned,
      assignedTo,
      assignedAt,
    };
    setLeads(prev => [...prev, newLead]);
  };

  const updateLead = (leadId: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(lead =>
      lead.id === leadId ? { ...lead, ...updates } : lead
    ));
  };

  const assignLead = (leadId: string, userId: string) => {
    const today = new Date();
    const assignedAt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    setLeads(prev => prev.map(lead =>
      lead.id === leadId 
        ? { ...lead, isAssigned: true, assignedTo: userId, assignedAt }
        : lead
    ));
  };

  const unassignLead = (leadId: string) => {
    setLeads(prev => prev.map(lead =>
      lead.id === leadId 
        ? { ...lead, isAssigned: false, assignedTo: null, assignedAt: undefined }
        : lead
    ));
  };

  const addDirectorFollowUp = (leadId: string, directorId: string, followUp: Omit<FollowUp, 'id'>) => {
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        const newFollowUp: FollowUp = {
          ...followUp,
          id: `fu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        
        const updatedDirectors = lead.directors.map(director => {
          if (director.id === directorId) {
            const existingFollowUps = director.followUps || [];
            
            return {
              ...director,
              followUps: [...existingFollowUps, newFollowUp],
              nextFollowUpDate: followUp.date,
              nextFollowUpTime: followUp.time
            };
          }
          return director;
        });
        
        return {
          ...lead,
          directors: updatedDirectors,
          followUpDate: followUp.date, // Update lead's follow-up date
          nextFollowUpDate: followUp.date
        };
      }
      return lead;
    }));
  };

  const markAsLost = (leadId: string, remark: string, userId: string, isPermanent: boolean) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      const today = new Date();
      const lostDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      const lostLead: LostLead = {
        lead: { 
          ...lead, 
          status: 'Lost',
          lostRemark: remark,
          lostBy: userId,
          lostAt: lostDate
        },
        lostBy: userId,
        lostDate: lostDate,
        lostRemark: remark,
        isPermanent
      };
      
      setLostLeads(prev => [...prev, lostLead]);
      setLeads(prev => prev.filter(l => l.id !== leadId));
    }
  };

  const markAsConverted = (leadId: string, invoiceNo: string, projectValue: string, userId: string) => {
    const today = new Date();
    const convertedAt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    setLeads(prev => prev.map(lead =>
      lead.id === leadId
        ? {
            ...lead,
            status: 'Converted',
            invoiceNo,
            projectValue,
            convertedBy: userId,
            convertedAt
          }
        : lead
    ));
  };

  const restoreLostLead = (lostLeadIndex: number) => {
    const lostLead = lostLeads[lostLeadIndex];
    if (lostLead && !lostLead.isPermanent) {
      setLeads(prev => [...prev, { ...lostLead.lead, status: 'Cold' }]);
      setLostLeads(prev => prev.filter((_, index) => index !== lostLeadIndex));
    }
  };

  const permanentlyDeleteLost = (lostLeadIndex: number) => {
    setLostLeads(prev => prev.filter((_, index) => index !== lostLeadIndex));
  };

  const getLeadsByCompany = (companyId: string) => {
    return leads.filter(lead => lead.companyId === companyId);
  };

  const getUnassignedLeads = (companyId: string) => {
    return leads.filter(lead => lead.companyId === companyId && !lead.isAssigned);
  };

  const getAssignedLeads = (companyId: string) => {
    return leads.filter(lead => lead.companyId === companyId && lead.isAssigned);
  };

  const getLeadsAssignedToUser = (userId: string) => {
    return leads.filter(lead => lead.assignedTo === userId);
  };

  const getConvertedLeads = (companyId: string) => {
    return leads.filter(lead => lead.companyId === companyId && lead.status === 'Converted');
  };

  const getDirectorFollowUpsForDate = (date: string, companyId?: string) => {
    const result: Array<{lead: Lead; director: Director; followUp: FollowUp}> = [];
    
    const filteredLeads = companyId 
      ? leads.filter(l => l.companyId === companyId)
      : leads;
    
    filteredLeads.forEach(lead => {
      lead.directors?.forEach(director => {
        director.followUps?.forEach(followUp => {
          if (followUp.date === date) {
            result.push({ lead, director, followUp });
          }
        });
      });
    });
    
    return result.sort((a, b) => a.followUp.time.localeCompare(b.followUp.time));
  };

  // Aggregation helper: compute global or per-company aggregates
  const getGlobalAggregates = (companyId?: string) => {
    const filteredLeads = companyId ? leads.filter(l => l.companyId === companyId) : leads;

    const totalLeads = filteredLeads.length;
    const convertedLeads = filteredLeads.filter(l => l.status === 'Converted').length;

    const lostCount = companyId
      ? lostLeads.filter(ll => ll.lead.companyId === companyId).length
      : lostLeads.length;

    const totalProcessed = convertedLeads + lostCount;
    const conversionRate = totalProcessed > 0 ? Math.round((convertedLeads / totalProcessed) * 10000) / 100 : 0; // percentage with 2 decimals

    // Active users derived from leads (assignedTo, uploadedBy, convertedBy)
    const userSet = new Set<string>();
    filteredLeads.forEach(l => {
      if (l.assignedTo) userSet.add(l.assignedTo);
      if (l.uploadedBy) userSet.add(l.uploadedBy);
      if (l.convertedBy) userSet.add(l.convertedBy);
    });

    const activeUsers = userSet.size;

    // total companies present in leads data
    const totalCompanies = new Set(filteredLeads.map(l => l.companyId)).size;

    return { totalCompanies, totalLeads, convertedLeads, conversionRate, activeUsers };
  };

  return (
    <LeadsContext.Provider
      value={{
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
        markAsConverted,
        restoreLostLead,
        permanentlyDeleteLost,
        getLeadsByCompany,
        getUnassignedLeads,
        getAssignedLeads,
        getLeadsAssignedToUser,
        getConvertedLeads,
        getDirectorFollowUpsForDate,
        getGlobalAggregates,
      }}
    >
      {children}
    </LeadsContext.Provider>
  );
};
