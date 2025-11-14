import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot, 
  serverTimestamp,
  getDoc
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
  // Test function to verify Firestore integration
  testFirestoreConnection: () => Promise<{
    success: boolean;
    companyId?: string;
    error?: string;
    firestoreData?: any;
  }>;
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
    const unsubscribe = onSnapshot(
      companiesRef,
      (snapshot) => {
        console.log('Companies snapshot received:', snapshot.docs.length, 'companies (before filtering)');
        const companiesData = snapshot.docs
          .map(doc => {
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
            // Treat only a strict boolean true as deleted; anything else counts as not deleted
            isDeleted: data.isDeleted === true,
            subscriptionPlan: data.subscriptionPlan || 'basic',
            maxUsers: data.maxUsers || 0,
            monthlyPrice: data.monthlyPrice,
            blockReason: data.blockReason || null
          } as Company;
        })
          .filter(c => !c.isDeleted);
        console.log('Companies after filtering isDeleted:', companiesData.length);
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
      
      // Create a plain object without any Firestore timestamps for logging
      const companyToLog = {
        ...companyData,
        isActive: companyData.isActive !== false,
        isDeleted: false,
        blockReason: companyData.blockReason || null,
        createdAt: '[ServerTimestamp]',
        updatedAt: '[ServerTimestamp]'
      };
      
      console.log('Attempting to create company in Firestore with ID:', companyId);
      console.log('Company data to save:', companyToLog);
      
      // Create the actual company data with Firestore timestamps
      const companyToSave = {
        ...companyData,
        isActive: companyData.isActive !== false,
        isDeleted: false,
        blockReason: companyData.blockReason || null,
        createdAt: now,
        updatedAt: now
      };
      
      console.log('Saving to Firestore...');
      await setDoc(companyRef, companyToSave);
      
      console.log('Company successfully written to Firestore');
      
      // Verify the document was created
      const docSnap = await getDoc(companyRef);
      if (!docSnap.exists()) {
        throw new Error('Failed to verify company creation in Firestore');
      }
      console.log('Company document verified in Firestore');
      
      return { 
        id: companyId,
        companyId,
        ...companyToSave,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in addCompany:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
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

  // Permanently delete a company from Firestore
  const deleteCompany = async (companyId: string) => {
    console.log('Deleting company permanently:', companyId);
    
    try {
      const companyRef = doc(db, 'companies', companyId);
      await deleteDoc(companyRef);
      console.log('Company deleted successfully from Firestore');
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

  // Test function to verify Firestore connection and permissions
  const testFirestoreConnection = async () => {
    const testCompany = {
      name: 'Test Company ' + Math.random().toString(36).substring(2, 8),
      email: `test-${Date.now()}@example.com`,
      phone: '+1234567890',
      address: '123 Test St, Test City',
      isActive: true,
      subscriptionPlan: 'basic' as const,
      maxUsers: 10
    };

    try {
      console.log('Starting Firestore connection test...');
      
      // Test 1: Write to Firestore
      console.log('Creating test company...');
      const company = await addCompany(testCompany);
      console.log('Test company created:', company);
      
      // Test 2: Read from Firestore
      console.log('Reading test company from Firestore...');
      const companyRef = doc(db, 'companies', company.id);
      const docSnap = await getDoc(companyRef);
      
      if (!docSnap.exists()) {
        throw new Error('Failed to read the test company from Firestore');
      }
      
      const firestoreData = docSnap.data();
      console.log('Test company data from Firestore:', firestoreData);
      
      // Clean up
      console.log('Cleaning up test company...');
      await updateDoc(companyRef, { isDeleted: true });
      
      return {
        success: true,
        companyId: company.id,
        firestoreData: {
          ...firestoreData,
          id: docSnap.id,
          // Convert Firestore timestamps to strings for logging
          createdAt: firestoreData.createdAt?.toDate?.()?.toISOString() || firestoreData.createdAt,
          updatedAt: firestoreData.updatedAt?.toDate?.()?.toISOString() || firestoreData.updatedAt
        }
      };
    } catch (error) {
      console.error('Firestore test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        companyId: undefined,
        firestoreData: undefined
      };
    }
  };

  const value = {
    companies,
    isLoading,
    planPricing,
    updatePlanPricing,
    addCompany,
    updateCompany,
    deleteCompany,
    getCompany,
    testFirestoreConnection
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};
