import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PlanPricingBase {
  basic: number;
  professional: number;
  enterprise: number;
  custom?: number; // Optional custom plan price
}

export interface PlanPricing {
  prices: PlanPricingBase;
  maxUsers: PlanPricingBase;
}

export interface Company {
  id: string;
  companyId: string; // Unique readable company ID (e.g., CO_20251110_5A7B)
  name: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  createdAt: string;
  isActive: boolean;
  blockReason?: string; // Reason why company was disabled
  subscriptionPlan: 'basic' | 'professional' | 'enterprise' | 'custom';
  maxUsers: number;
  monthlyPrice?: number; // Only for custom plans
}

export const DEFAULT_PLAN_PRICES: PlanPricing = {
  prices: {
    basic: 99,
    professional: 299,
    enterprise: 999,
    custom: 0
  },
  maxUsers: {
    basic: 10,
    professional: 50,
    enterprise: 200,
    custom: 0
  }
};

interface CompanyContextType {
  companies: Company[];
  isLoading: boolean;
  planPricing: PlanPricing;
  updatePlanPricing: (pricing: Partial<PlanPricing>) => void;
  addCompany: (company: Omit<Company, 'id' | 'companyId' | 'createdAt'>) => Company;
  updateCompany: (companyId: string, updates: Partial<Company>) => void;
  deleteCompany: (companyId: string) => void;
  getCompany: (companyId: string) => Company | undefined;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompanies = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompanies must be used within a CompanyProvider');
  }
  return context;
};

// Generate unique company ID
const generateCompanyId = (): string => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CO_${dateStr}_${randomStr}`;
};

// Mock initial companies
const initialCompanies: Company[] = [
  {
    id: 'company-1',
    companyId: 'CO_20240115_ABC1',
    name: 'ABC Motors Pvt Ltd',
    email: 'info@abcmotors.com',
    phone: '+91 98765 43210',
    address: 'Sector 18, Noida, UP 201301',
    createdAt: '2024-01-15',
    isActive: true,
    subscriptionPlan: 'professional',
    maxUsers: 50
  },
  {
    id: 'company-2',
    companyId: 'CO_20240220_XYZ2',
    name: 'XYZ Auto Solutions',
    email: 'contact@xyzauto.com',
    phone: '+91 98765 43211',
    address: 'MG Road, Bangalore, KA 560001',
    createdAt: '2024-02-20',
    isActive: true,
    subscriptionPlan: 'enterprise',
    maxUsers: 100
  },
  {
    id: 'company-3',
    companyId: 'CO_20240310_PQR3',
    name: 'PQR Enterprises',
    email: 'admin@pqrenterprises.com',
    phone: '+91 98765 43212',
    address: 'Andheri West, Mumbai, MH 400058',
    createdAt: '2024-03-10',
    isActive: true,
    subscriptionPlan: 'custom',
    maxUsers: 200,
    monthlyPrice: 1500
  }
];

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [planPricing, setPlanPricing] = useState<PlanPricing>(DEFAULT_PLAN_PRICES);

  // Load companies and plan pricing from localStorage on mount
  useEffect(() => {
    const loadData = () => {
      try {
        setIsLoading(true);
        
        // Load companies
        const savedCompanies = localStorage.getItem('lms_companies');
        if (savedCompanies) {
          setCompanies(JSON.parse(savedCompanies));
        } else {
          // Initialize with mock data if no saved data
          setCompanies(initialCompanies);
        }
        
        // Load plan pricing
        const savedPricing = localStorage.getItem('lms_plan_pricing');
        if (savedPricing) {
          setPlanPricing(JSON.parse(savedPricing));
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setCompanies([]);
        setPlanPricing(DEFAULT_PLAN_PRICES);
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Save data to localStorage whenever they change
  useEffect(() => {
    if (companies.length > 0) {
      localStorage.setItem('lms_companies', JSON.stringify(companies));
    }
  }, [companies]);
  
  useEffect(() => {
    localStorage.setItem('lms_plan_pricing', JSON.stringify(planPricing));
  }, [planPricing]);

  const addCompany = (companyData: Omit<Company, 'id' | 'companyId' | 'createdAt'>): Company => {
    const today = new Date();
    const newCompany: Company = {
      ...companyData,
      id: `company-${Date.now()}`,
      companyId: generateCompanyId(),
      createdAt: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
    };
    setCompanies(prev => [...prev, newCompany]);
    return newCompany;
  };

  const updateCompany = (companyId: string, updates: Partial<Company>) => {
    setCompanies(prev => prev.map(company =>
      company.id === companyId ? { ...company, ...updates } : company
    ));
  };

  const deleteCompany = (companyId: string) => {
    // We'll handle the user deletion in the component where we call deleteCompany
    // by using the useAuth hook there
    setCompanies(prev => prev.filter(company => company.id !== companyId));
  };

  const getCompany = (companyId: string) => {
    return companies.find(c => c.id === companyId);
  };

  const updatePlanPricing = (updates: Partial<PlanPricing>) => {
    setPlanPricing(prev => {
      const newPricing = { ...prev };
      
      // Update prices if provided
      if (updates.prices) {
        newPricing.prices = {
          ...prev.prices,
          ...updates.prices
        };
      }
      
      // Update maxUsers if provided
      if (updates.maxUsers) {
        newPricing.maxUsers = {
          ...prev.maxUsers,
          ...updates.maxUsers
        };
      }
      
      // Update any other top-level properties
      const { prices, maxUsers, ...otherUpdates } = updates;
      Object.assign(newPricing, otherUpdates);
      
      return newPricing;
    });
  };

  return (
    <CompanyContext.Provider
      value={{
        companies,
        isLoading,
        planPricing,
        updatePlanPricing,
        addCompany,
        updateCompany,
        deleteCompany,
        getCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};
