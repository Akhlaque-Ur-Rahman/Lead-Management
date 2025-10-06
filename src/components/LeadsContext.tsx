import { createContext, useContext, useState, ReactNode } from 'react';

export interface FollowUp {
  id: string;
  date: string;
  remark: string;
  createdBy: string; // User ID
  createdAt: string; // Timestamp
}

export interface LostLead {
  lead: Lead;
  lostBy: string; // User ID
  lostDate: string;
  lostRemark: string;
  isPermanent: boolean; // true if marked as permanent by admin
}

export interface Director {
  id: string;
  din: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
}

export interface Lead {
  id: string;
  // MCA Data Fields
  cin: string;
  companyName: string;
  authorisedCapital: string;
  paidUpCapital: string;
  dateOfIncorporation: string;
  registeredAddress: string;
  companyEmail: string;
  
  // Director Information - Now supports multiple directors
  directors: Director[];
  
  // Legacy fields for backward compatibility (deprecated - use directors array)
  din: string;
  directorFirstName: string;
  directorLastName: string;
  mobile: string;
  directorEmail: string;
  
  // LMS Fields
  status: 'Hot' | 'Warm' | 'Cold' | 'Converted' | 'Lost';
  followUpDate: string;
  nextFollowUpDate?: string;
  notes: string;
  createdAt: string;
  assignedTo: string;
  
  // Follow-up History
  followUpHistory?: FollowUp[];
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
  options?: string[]; // For select type
}

interface LeadsContextType {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  lostLeads: LostLead[];
  setLostLeads: React.Dispatch<React.SetStateAction<LostLead[]>>;
  fieldConfigs: FieldConfig[];
  setFieldConfigs: React.Dispatch<React.SetStateAction<FieldConfig[]>>;
  addLead: (lead: Lead) => void;
  updateLead: (leadId: string, updates: Partial<Lead>) => void;
  deleteLead: (leadId: string) => void;
  addFollowUp: (leadId: string, followUp: Omit<FollowUp, 'id'>) => void;
  markAsLost: (leadId: string, remark: string, userId: string, isPermanent: boolean) => void;
  restoreLostLead: (lostLeadId: string) => void;
  permanentlyDeleteLost: (lostLeadId: string) => void;
  getLeadsForDate: (date: string) => Lead[];
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

export const LeadsProvider = ({ children }: { children: ReactNode }) => {
  const [leads, setLeads] = useState<Lead[]>([
    {
      id: '1',
      cin: 'U74999DL2020PTC123456',
      companyName: 'ABC Enterprises Pvt Ltd',
      authorisedCapital: '10,00,000',
      paidUpCapital: '7,50,000',
      dateOfIncorporation: '2020-05-15',
      registeredAddress: 'Plot 123, Sector 18, Noida, UP 201301',
      companyEmail: 'info@abcenterprises.com',
      directors: [
        {
          id: '1-1',
          din: '08765432',
          firstName: 'Rajesh',
          lastName: 'Kumar',
          mobile: '+91 98765 43210',
          email: 'rajesh@abcenterprises.com'
        },
        {
          id: '1-2',
          din: '08765433',
          firstName: 'Sunita',
          lastName: 'Kumar',
          mobile: '+91 98765 43211',
          email: 'sunita@abcenterprises.com'
        }
      ],
      // Legacy fields
      din: '08765432',
      directorFirstName: 'Rajesh',
      directorLastName: 'Kumar',
      mobile: '+91 98765 43210',
      directorEmail: 'rajesh@abcenterprises.com',
      status: 'Hot',
      followUpDate: '2025-10-04',
      notes: 'Interested in compliance services',
      createdAt: '2025-09-20',
      assignedTo: '1',
      followUpHistory: [
        {
          id: '1',
          date: '2025-09-25',
          remark: 'Initial contact made, showed interest',
          createdBy: '1',
          createdAt: '2025-09-25T10:30:00Z'
        }
      ]
    },
    {
      id: '2',
      cin: 'U72200MH2019PLC234567',
      companyName: 'XYZ Corporation',
      authorisedCapital: '50,00,000',
      paidUpCapital: '45,00,000',
      dateOfIncorporation: '2019-08-20',
      registeredAddress: 'Tower A, BKC, Mumbai, MH 400051',
      companyEmail: 'contact@xyzcorp.com',
      directors: [
        {
          id: '2-1',
          din: '09876543',
          firstName: 'Priya',
          lastName: 'Sharma',
          mobile: '+91 87654 32109',
          email: 'priya@xyzcorp.com'
        }
      ],
      // Legacy fields
      din: '09876543',
      directorFirstName: 'Priya',
      directorLastName: 'Sharma',
      mobile: '+91 87654 32109',
      directorEmail: 'priya@xyzcorp.com',
      status: 'Warm',
      followUpDate: '2025-10-06',
      notes: 'Requested quote for annual filing',
      createdAt: '2025-09-18',
      assignedTo: '2',
      followUpHistory: []
    },
    {
      id: '3',
      cin: 'U62013KA2021PTC345678',
      companyName: 'PQR Solutions',
      authorisedCapital: '25,00,000',
      paidUpCapital: '20,00,000',
      dateOfIncorporation: '2021-03-10',
      registeredAddress: 'MG Road, Bangalore, KA 560001',
      companyEmail: 'hello@pqrsolutions.com',
      directors: [
        {
          id: '3-1',
          din: '07654321',
          firstName: 'Amit',
          lastName: 'Patel',
          mobile: '+91 76543 21098',
          email: 'amit@pqrsolutions.com'
        },
        {
          id: '3-2',
          din: '07654322',
          firstName: 'Neha',
          lastName: 'Patel',
          mobile: '+91 76543 21099',
          email: 'neha@pqrsolutions.com'
        },
        {
          id: '3-3',
          din: '07654323',
          firstName: 'Vikram',
          lastName: 'Singh',
          mobile: '+91 76543 21100',
          email: 'vikram@pqrsolutions.com'
        }
      ],
      // Legacy fields
      din: '07654321',
      directorFirstName: 'Amit',
      directorLastName: 'Patel',
      mobile: '+91 76543 21098',
      directorEmail: 'amit@pqrsolutions.com',
      status: 'Converted',
      followUpDate: '2025-10-10',
      notes: 'Signed contract for ROC filing services',
      createdAt: '2025-09-15',
      assignedTo: '3',
      followUpHistory: [
        {
          id: '2',
          date: '2025-09-20',
          remark: 'Sent proposal and pricing',
          createdBy: '3',
          createdAt: '2025-09-20T14:00:00Z'
        },
        {
          id: '3',
          date: '2025-09-28',
          remark: 'Contract signed, onboarding started',
          createdBy: '3',
          createdAt: '2025-09-28T11:15:00Z'
        }
      ]
    }
  ]);

  const [lostLeads, setLostLeads] = useState<LostLead[]>([]);
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>(defaultFieldConfigs);

  const addLead = (lead: Lead) => {
    setLeads(prev => [...prev, lead]);
  };

  const updateLead = (leadId: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(lead => 
      lead.id === leadId ? { ...lead, ...updates } : lead
    ));
  };

  const deleteLead = (leadId: string) => {
    setLeads(prev => prev.filter(lead => lead.id !== leadId));
  };

  const addFollowUp = (leadId: string, followUp: Omit<FollowUp, 'id'>) => {
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        const newFollowUp: FollowUp = {
          ...followUp,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        return {
          ...lead,
          followUpHistory: [...(lead.followUpHistory || []), newFollowUp]
        };
      }
      return lead;
    }));
  };

  const markAsLost = (leadId: string, remark: string, userId: string, isPermanent: boolean) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      const lostLead: LostLead = {
        lead: { ...lead, status: 'Lost' },
        lostBy: userId,
        lostDate: new Date().toISOString().split('T')[0],
        lostRemark: remark,
        isPermanent
      };
      
      setLostLeads(prev => [...prev, lostLead]);
      setLeads(prev => prev.filter(l => l.id !== leadId));
    }
  };

  const restoreLostLead = (lostLeadId: string) => {
    const lostLead = lostLeads.find(l => l.lead.id === lostLeadId);
    if (lostLead && !lostLead.isPermanent) {
      // Restore to leads with previous status or set to Cold
      const restoredLead = { 
        ...lostLead.lead, 
        status: lostLead.lead.status === 'Lost' ? 'Cold' : lostLead.lead.status 
      } as Lead;
      setLeads(prev => [...prev, restoredLead]);
      setLostLeads(prev => prev.filter(l => l.lead.id !== lostLeadId));
    }
  };

  const permanentlyDeleteLost = (lostLeadId: string) => {
    setLostLeads(prev => prev.filter(l => l.lead.id !== lostLeadId));
  };

  const getLeadsForDate = (date: string) => {
    return leads.filter(lead => lead.followUpDate === date);
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
        deleteLead,
        addFollowUp,
        markAsLost,
        restoreLostLead,
        permanentlyDeleteLost,
        getLeadsForDate
      }}
    >
      {children}
    </LeadsContext.Provider>
  );
};
