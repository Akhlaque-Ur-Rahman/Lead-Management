import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  createdAt: string;
  isActive: boolean;
  subscriptionPlan: 'basic' | 'professional' | 'enterprise';
  maxUsers: number;
}

interface CompanyContextType {
  companies: Company[];
  addCompany: (company: Omit<Company, 'id' | 'createdAt'>) => void;
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

// Mock initial companies
const initialCompanies: Company[] = [
  {
    id: 'company-1',
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
    name: 'PQR Enterprises',
    email: 'admin@pqrenterprises.com',
    phone: '+91 98765 43212',
    address: 'Andheri West, Mumbai, MH 400058',
    createdAt: '2024-03-10',
    isActive: true,
    subscriptionPlan: 'basic',
    maxUsers: 20
  }
];

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem('lms_companies');
    return saved ? JSON.parse(saved) : initialCompanies;
  });

  useEffect(() => {
    localStorage.setItem('lms_companies', JSON.stringify(companies));
  }, [companies]);

  const addCompany = (companyData: Omit<Company, 'id' | 'createdAt'>) => {
    const today = new Date();
    const newCompany: Company = {
      ...companyData,
      id: `company-${Date.now()}`,
      createdAt: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
    };
    setCompanies(prev => [...prev, newCompany]);
  };

  const updateCompany = (companyId: string, updates: Partial<Company>) => {
    setCompanies(prev => prev.map(company =>
      company.id === companyId ? { ...company, ...updates } : company
    ));
  };

  const deleteCompany = (companyId: string) => {
    setCompanies(prev => prev.filter(company => company.id !== companyId));
  };

  const getCompany = (companyId: string) => {
    return companies.find(c => c.id === companyId);
  };

  return (
    <CompanyContext.Provider
      value={{
        companies,
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
