import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { type RoleKey, type RoleId, getRoleId } from '../types/roles';

export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  roleId: RoleId; // Unique identifier for the role
  companyId: string | null; // null for super_admin
  createdAt: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  addUser: (userData: Omit<User, 'id' | 'createdAt' | 'roleId'> & { password: string }) => void;
  updateUser: (userId: string, updates: Partial<Omit<User, 'roleId'>> & { password?: string }) => void;
  deleteUser: (userId: string) => void;
  getUsersByCompany: (companyId: string) => User[];
  getAllUsers: () => User[]; // Add this line
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Initial users with multi-tenant structure
const initialUsers: User[] = [
  // Super Admin (Platform Level)
  {
    id: 'super-1',
    name: 'Super Admin',
    email: 'superadmin@lms.com',
    role: 'super_admin',
    roleId: 1,
    companyId: null,
    createdAt: '2024-01-01',
    isActive: true,
  },
  
  // Platform Admin (Platform Level)
  {
    id: 'platform-1',
    name: 'Platform Admin',
    email: 'platformadmin@lms.com',
    role: 'platform_admin',
    roleId: 2,
    companyId: null,
    createdAt: '2024-01-01',
    isActive: true,
  },
  
  // Company 1 - ABC Motors
  {
    id: 'user-1-1',
    name: 'Rajesh Kumar',
    email: 'rajesh@abcmotors.com',
    role: 'company_admin',
    roleId: 2,
    companyId: 'company-1',
    createdAt: '2024-01-15',
    isActive: true,
  },
  {
    id: 'user-1-2',
    name: 'Priya Sharma',
    email: 'priya@abcmotors.com',
    role: 'team_lead',
    roleId: 3,
    companyId: 'company-1',
    createdAt: '2024-01-20',
    isActive: true,
  },
  {
    id: 'user-1-3',
    name: 'Amit Singh',
    email: 'amit@abcmotors.com',
    role: 'sales_user',
    roleId: 4,
    companyId: 'company-1',
    createdAt: '2024-01-25',
    isActive: true,
  },
  
  // Company 2 - XYZ Auto
  {
    id: 'user-2-1',
    name: 'Vikram Patel',
    email: 'vikram@xyzauto.com',
    role: 'company_admin',
    roleId: 2,
    companyId: 'company-2',
    createdAt: '2024-02-20',
    isActive: true,
  },
  {
    id: 'user-2-2',
    name: 'Sneha Reddy',
    email: 'sneha@xyzauto.com',
    role: 'sales_user',
    roleId: 4,
    companyId: 'company-2',
    createdAt: '2024-02-25',
    isActive: true,
  },
  
  // Company 3 - PQR Enterprises
  {
    id: 'user-3-1',
    name: 'Arjun Mehta',
    email: 'arjun@pqrenterprises.com',
    role: 'company_admin',
    roleId: 2,
    companyId: 'company-3',
    createdAt: '2024-03-10',
    isActive: true,
  },
];

// Initial credentials
const initialCredentials: Record<string, string> = {
  'superadmin@lms.com': 'super123',
  'platformadmin@lms.com': 'platform123',
  'rajesh@abcmotors.com': 'admin123',
  'priya@abcmotors.com': 'lead123',
  'amit@abcmotors.com': 'user123',
  'vikram@xyzauto.com': 'admin123',
  'sneha@xyzauto.com': 'user123',
  'arjun@pqrenterprises.com': 'admin123',
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('lms_users');
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      // Ensure platform admin user is always available
      const hasPlatformAdmin = parsed.some((u: User) => u.email === 'platformadmin@lms.com');
      if (!hasPlatformAdmin) {
        return [...initialUsers, ...parsed];
      }
      return parsed.length > 0 ? parsed : initialUsers;
    } catch (error) {
      console.error('Error loading users from localStorage:', error);
      return initialUsers;
    }
  });
  const [credentials, setCredentials] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('lms_credentials');
    try {
      const parsed = saved ? JSON.parse(saved) : {};
      // Ensure platform admin credentials are always available
      return {
        ...initialCredentials,
        ...parsed
      };
    } catch (error) {
      console.error('Error loading credentials from localStorage:', error);
      return initialCredentials;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateAndSetUser = async () => {
      const savedUser = localStorage.getItem('lms_currentUser');
      if (!savedUser) {
        setIsLoading(false);
        return;
      }

      try {
        const user = JSON.parse(savedUser) as User;
        const validation = validateUserSession(user);
        
        if (validation.success) {
          setUser(user);
        } else {
          // Auto-logout if session is no longer valid
          localStorage.removeItem('lms_currentUser');
          setUser(null);
          
          // Show toast with the reason for auto-logout
          if (validation.error) {
            // Using setTimeout to ensure toast shows after the component mounts
            setTimeout(() => {
              toast.error(validation.error);
            }, 500);
          }
        }
      } catch (error) {
        console.error('Error validating session:', error);
        localStorage.removeItem('lms_currentUser');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    validateAndSetUser();
  }, []);

  useEffect(() => {
    localStorage.setItem('lms_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('lms_credentials', JSON.stringify(credentials));
  }, [credentials]);

  interface LoginResult {
    success: boolean;
    error?: string;
    user?: User;
  }

  const validateUserSession = (user: User): LoginResult => {
    // 1. Check if user is active
    if (!user.isActive) {
      return {
        success: false,
        error: 'Your user account is inactive. Contact your company admin.'
      };
    }

    // 2. For non-platform users, validate company status
    if (user.companyId) {
      try {
        const companiesData = localStorage.getItem('lms_companies');
        if (!companiesData) {
          return {
            success: false,
            error: 'Invalid email or password.'
          };
        }

        const companies = JSON.parse(companiesData);
        const userCompany = companies.find((c: any) => c.id === user.companyId);
        
        // 3. Check if company exists
        if (!userCompany) {
          return {
            success: false,
            error: 'Invalid email or password.'
          };
        }
        
        // 4. Check if company is active
        if (!userCompany.isActive) {
          const reason = userCompany.blockReason ? 
            `Reason: ${userCompany.blockReason}` : 
            'No reason provided';
            
          return { 
            success: false, 
            error: `Your company account has been disabled. ${reason} Contact support to reactivate.`
          };
        }
      } catch (error) {
        console.error('Error validating user session:', error);
        return {
          success: false,
          error: 'An error occurred while validating your session. Please try again.'
        };
      }
    }

    return { success: true, user };
  };

  const login = async (email: string, password: string): Promise<LoginResult> => {
    setIsLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // 1. Find user by email
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    // 2. Early return if user not found or credentials don't match
    if (!user || credentials[email] !== password) {
      setIsLoading(false);
      return { 
        success: false, 
        error: 'Invalid email or password.' 
      };
    }

    // 3. Validate user session (checks isActive, company status, etc.)
    const validation = validateUserSession(user);
    if (!validation.success) {
      setIsLoading(false);
      return validation;
    }

    // 4. Login successful
    setUser(user);
    localStorage.setItem('lms_currentUser', JSON.stringify(user));
    localStorage.setItem('lms_lastLogin', new Date().toISOString());
    
    setIsLoading(false);
    return { 
      success: true,
      user
    };
  };

  const logout = (message?: string) => {
    setUser(null);
    localStorage.removeItem('lms_currentUser');
    
    if (message) {
      toast(message, {
        duration: 5000,
      });
    }
  };

  const addUser = (userData: Omit<User, 'id' | 'createdAt' | 'roleId'> & { password: string }) => {
    const { password, ...userDataWithoutPassword } = userData;
    const today = new Date();
    const roleId = getRoleId(userData.role) || 4; // Default to sales_user if not found
    const newUser: User = {
      ...userDataWithoutPassword,
      roleId,
      id: `user-${Date.now()}`,
      createdAt: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
    };
    setUsers(prev => [...prev, newUser]);
    setCredentials(prev => ({
      ...prev,
      [userData.email]: password || 'password123'
    }));
  };

  const updateUser = (userId: string, updates: Partial<Omit<User, 'roleId'>> & { password?: string }) => {
    const { password, ...userUpdates } = updates;
    // If role is being updated, update roleId as well
    const roleId = updates.role ? getRoleId(updates.role) : undefined;
    const fullUpdates = roleId ? { ...userUpdates, roleId } : userUpdates;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...fullUpdates } : u));
    
    if (password && password.trim()) {
      const userToUpdate = users.find(u => u.id === userId);
      if (userToUpdate) {
        setCredentials(prev => ({
          ...prev,
          [userToUpdate.email]: password
        }));
      }
    }

    // Update current user session if it's the same user
    if (user && user.id === userId) {
      const updatedUser = users.find(u => u.id === userId);
      if (updatedUser) {
        const newUserData = { ...updatedUser, ...userUpdates };
        setUser(newUserData);
        localStorage.setItem('lms_currentUser', JSON.stringify(newUserData));
      }
    }
  };

  const deleteUser = (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setCredentials(prev => {
        const newCreds = { ...prev };
        delete newCreds[userToDelete.email];
        return newCreds;
      });
    }
  };

  const getUsersByCompany = (companyId: string) => {
    return users.filter(u => u.companyId === companyId);
  };

  const getAllUsers = () => {
    return users.filter(u => u.role !== 'super_admin');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser,
        getUsersByCompany,
        getAllUsers,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
