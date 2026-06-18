import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

interface PlanPricingBase {
  basic: number;
  professional: number;
  enterprise: number;
  custom?: number;
}

export interface PlanPricing {
  prices: PlanPricingBase;
  maxUsers: PlanPricingBase;
}

export interface Company {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  isActive: boolean;
  isDeleted?: boolean;
  blockReason?: string | null;
  subscriptionPlan: 'basic' | 'professional' | 'enterprise' | 'custom';
  maxUsers: number;
  monthlyPrice?: number;
}

export const DEFAULT_PLAN_PRICES: PlanPricing = {
  prices: { basic: 99, professional: 299, enterprise: 999, custom: 0 },
  maxUsers: { basic: 10, professional: 50, enterprise: 200, custom: 0 },
};

interface CompanyContextType {
  companies: Company[];
  isLoading: boolean;
  planPricing: PlanPricing;
  updatePlanPricing: (pricing: Partial<PlanPricing>) => void;
  addCompany: (company: Omit<Company, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => Promise<Company>;
  updateCompany: (companyId: string, updates: Partial<Omit<Company, 'id' | 'companyId' | 'createdAt'>>) => Promise<void>;
  deleteCompany: (companyId: string) => Promise<void>;
  getCompany: (companyId: string) => Company | undefined;
  testFirestoreConnection: () => Promise<{ success: boolean; companyId?: string; error?: string }>;
  canChangePlan: (role?: string) => boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompanies = () => {
  const context = useContext(CompanyContext);
  if (!context) throw new Error('useCompanies must be used within a CompanyProvider');
  return context;
};

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [planPricing, setPlanPricing] = useState<PlanPricing>(DEFAULT_PLAN_PRICES);

  const refreshCompanies = useCallback(async () => {
    try {
      const { companies: list } = await api.companies.list();
      setCompanies(list);
    } catch (e) {
      console.error('Failed to load companies', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setCompanies([]);
      setIsLoading(false);
      return;
    }
    refreshCompanies();
    const interval = setInterval(refreshCompanies, 10000);
    return () => clearInterval(interval);
  }, [user, refreshCompanies]);

  useEffect(() => {
    if (!user) return;
    api.config.getPlanPricing()
      .then(({ planPricing: saved }) => {
        if (saved) setPlanPricing(saved);
      })
      .catch(() => {});
  }, [user]);

  const addCompany = async (companyData: Omit<Company, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<Company> => {
    const trimmedName = (companyData.name || '').trim();
    if (!trimmedName) throw new Error('COMPANY_NAME_REQUIRED');
    const { company } = await api.companies.create({
      ...companyData,
      name: trimmedName,
      email: (companyData.email || '').trim(),
      phone: (companyData.phone || '').trim(),
      address: (companyData.address || '').trim(),
    });
    await refreshCompanies();
    return company;
  };

  const updateCompany = async (companyId: string, updates: Partial<Omit<Company, 'id' | 'companyId' | 'createdAt'>>) => {
    await api.companies.update(companyId, updates);
    await refreshCompanies();
  };

  const deleteCompany = async (companyId: string) => {
    await api.companies.delete(companyId);
    await refreshCompanies();
  };

  const getCompany = useCallback((companyId: string) => {
    return companies.find((c) => c.id === companyId || c.companyId === companyId);
  }, [companies]);

  const updatePlanPricing = useCallback(async (updates: Partial<PlanPricing>) => {
    const next: PlanPricing = {
      prices: { ...planPricing.prices, ...(updates.prices || {}) },
      maxUsers: { ...planPricing.maxUsers, ...(updates.maxUsers || {}) },
    };
    setPlanPricing(next);
    try {
      await api.config.setPlanPricing(next);
    } catch (e) {
      console.error('Failed to save plan pricing', e);
    }
  }, [planPricing]);

  const testFirestoreConnection = async () => {
    return { success: false, error: 'Disabled in PostgreSQL deployment' };
  };

  const canChangePlan = (role?: string) => role === 'super_admin' || role === 'platform_admin';

  return (
    <CompanyContext.Provider value={{
      companies, isLoading, planPricing, updatePlanPricing,
      addCompany, updateCompany, deleteCompany, getCompany,
      testFirestoreConnection, canChangePlan,
    }}>
      {children}
    </CompanyContext.Provider>
  );
};
