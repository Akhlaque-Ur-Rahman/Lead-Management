import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

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
  createdAt: string | Date;
  updatedAt?: string | Date;
  isActive: boolean;
  isDeleted?: boolean;
  blockReason?: string | null;
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
  addCompany: (company: Omit<Company, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => Promise<Company>;
  updateCompany: (companyId: string, updates: Partial<Omit<Company, 'id' | 'companyId' | 'createdAt'>>) => Promise<void>;
  deleteCompany: (companyId: string) => Promise<void>;
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

// Helper to parse Firestore timestamp
const parseTimestamp = (timestamp: any): string => {
  if (!timestamp) return new Date().toISOString();
  if (timestamp.toDate) return timestamp.toDate().toISOString();
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toISOString();
  return new Date(timestamp).toISOString();
};

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [planPricing, setPlanPricing] = useState<PlanPricing>(DEFAULT_PLAN_PRICES);

  // Load companies from Firestore with real-time updates
  useEffect(() => {
    console.log('Setting up Firestore listener for companies');
    
    const companiesRef = collection(db, 'companies');
    const q = query(companiesRef, where('isDeleted', '!=', true));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('Companies snapshot received:', snapshot.docs.length, 'companies');
        
        const companiesData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            companyId: doc.id, // Use doc.id as companyId
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            logo: data.logo,
            createdAt: parseTimestamp(data.createdAt),
            updatedAt: data.updatedAt ? parseTimestamp(data.updatedAt) : undefined,
            isActive: data.isActive !== false, // default to true if not set
            isDeleted: data.isDeleted || false,
            subscriptionPlan: data.subscriptionPlan || 'basic',
            maxUsers: data.maxUsers || 0,
            monthlyPrice: data.monthlyPrice,
            blockReason: data.blockReason || null
          } as Company;
        });
        
        setCompanies(companiesData);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error loading companies:', error);
        setIsLoading(false);
      }
    );

    // Clean up the listener on unmount
    return () => {
      console.log('Cleaning up companies listener');
      unsubscribe();
    };
  }, []);

  // Add a new company to Firestore
  const addCompany = async (companyData: Omit<Company, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<Company> => {
    console.log('Adding new company:', companyData);
    
    try {
      const companyId = generateCompanyId();
      const now = serverTimestamp();
      const companyRef = doc(db, 'companies', companyId);
      
      const companyToSave = {
        ...companyData,
        // Don't include companyId in the document data as it's already the document ID
        isActive: companyData.isActive !== false,
        isDeleted: false,
        blockReason: companyData.blockReason || null,
        createdAt: now,
        updatedAt: now
      };

      console.log('Creating company in Firestore:', { companyId, ...companyToSave });
      
      await setDoc(companyRef, companyToSave);
      
      console.log('Company created successfully');
      return { 
        id: companyId,
        companyId, // Include companyId in the returned object
        ...companyToSave,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error adding company to Firestore:', error);
      throw error;
    }
  };

  // Update an existing company in Firestore
  const updateCompany = async (companyId: string, updates: Partial<Omit<Company, 'id' | 'companyId' | 'createdAt'>>) => {
    console.log('Updating company:', companyId, updates);
    
    try {
      const companyRef = doc(db, 'companies', companyId);
      await updateDoc(companyRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('Company updated successfully');
    } catch (error) {
      console.error('Error updating company in Firestore:', error);
      throw error;
    }
  };

  // Soft delete a company in Firestore
  const deleteCompany = async (companyId: string) => {
    console.log('Deleting company:', companyId);
    
    try {
      const companyRef = doc(db, 'companies', companyId);
      await updateDoc(companyRef, {
        isActive: false,
        isDeleted: true,
        updatedAt: serverTimestamp()
      });
      console.log('Company soft-deleted successfully');
    } catch (error) {
      console.error('Error deleting company in Firestore:', error);
      throw error;
    }
  };

  // Get a single company by ID (from in-memory state)
  const getCompany = useCallback((companyId: string) => {
    return companies.find(c => c.id === companyId || c.companyId === companyId);
  }, [companies]);

  // Update plan pricing (kept in local state as it's UI-only)
  const updatePlanPricing = useCallback((updates: Partial<PlanPricing>) => {
    setPlanPricing(prev => ({
      ...prev,
      ...updates,
      prices: { ...prev.prices, ...(updates.prices || {}) },
      maxUsers: { ...prev.maxUsers, ...(updates.maxUsers || {}) }
    }));
  }, []);

  const value = {
    companies,
    isLoading,
    planPricing,
    updatePlanPricing,
    addCompany,
    updateCompany,
    deleteCompany,
    getCompany
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};
