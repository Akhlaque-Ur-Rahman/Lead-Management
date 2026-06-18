import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { type RoleKey, type RoleId, getRoleId } from '../types/roles';
import { toast } from 'sonner';
import { api, setAuth, clearAuth, getStoredUser, setSessionExpiredHandler } from '../api/client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  roleId: RoleId;
  companyId: string | null;
  createdAt: string;
  isActive: boolean;
  deactivatedByCompany?: boolean;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  addUser: (userData: Omit<User, 'id' | 'createdAt' | 'roleId'> & { password: string }) => Promise<User>;
  updateUser: (userId: string, updates: Partial<Omit<User, 'roleId' | 'id'>> & { password?: string }) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  deleteUsersByCompanyId: (companyId: string) => Promise<void>;
  getUsersByCompany: (companyId: string) => User[];
  getAllUsers: () => User[];
  getUserCountForCompany: (companyId: string | null) => number;
  isLoading: boolean;
  systemName: string;
  systemLogoUrl: string | null;
  companyDisplayName: string;
  refreshBranding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [systemName, setSystemName] = useState('Lead Management');
  const [systemLogoUrl, setSystemLogoUrl] = useState<string | null>(null);
  const [companyDisplayName, setCompanyDisplayName] = useState('');

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      setUsers([]);
      toast.error('Session expired. Please log in again.');
    });
  }, []);

  const refreshUsers = useCallback(async () => {
    try {
      const { users: list } = await api.users.list();
      setUsers(list);
    } catch (e) {
      console.error('Failed to load users', e);
    }
  }, []);

  const refreshBranding = useCallback(async () => {
    try {
      const data = user
        ? await api.config.getBranding()
        : await api.config.getPublicBranding();
      setSystemName(data.systemName || 'Lead Management');
      setSystemLogoUrl(data.logoUrl || null);
    } catch {
      /* fallback to defaults */
    }
  }, [user]);

  const refreshCompanyDisplay = useCallback(async (companyId: string) => {
    try {
      const { company } = await api.companies.get(companyId);
      setCompanyDisplayName(company.companyNameCustom || company.name || '');
    } catch {
      setCompanyDisplayName('');
    }
  }, []);

  useEffect(() => {
    const restore = async () => {
      const stored = getStoredUser();
      if (stored) {
        try {
          const { user: me } = await api.auth.me();
          if (me.isActive !== false) {
            setUser(me);
          } else {
            clearAuth();
          }
        } catch {
          clearAuth();
        }
      }
      setIsLoading(false);
    };
    restore();
  }, []);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  useEffect(() => {
    if (!user) return;
    refreshUsers();
    const interval = setInterval(refreshUsers, 10000);
    return () => clearInterval(interval);
  }, [user, refreshUsers]);

  useEffect(() => {
    if (!user?.companyId) {
      setCompanyDisplayName('');
      return;
    }
    refreshCompanyDisplay(user.companyId);
    const interval = setInterval(() => refreshCompanyDisplay(user.companyId!), 10000);
    return () => clearInterval(interval);
  }, [user?.companyId, refreshCompanyDisplay]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { user: loggedIn, token } = await api.auth.login(email, password);
      setAuth(token, loggedIn);
      setUser(loggedIn);
      toast.success(`Welcome back, ${loggedIn.name || loggedIn.email}!`);
      return { success: true };
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try { await api.auth.logout(); } catch { /* ignore */ }
    clearAuth();
    setUser(null);
    toast.success('Successfully logged out');
  };

  const getUserCountForCompany = (companyId: string | null) => {
    if (!companyId) return 0;
    return users.filter((u) => u.companyId === companyId && u.isActive).length;
  };

  const addUser = async (userData: Omit<User, 'id' | 'createdAt' | 'roleId'> & { password: string }) => {
    try {
      setIsLoading(true);
      const roleId = getRoleId(userData.role);
      if (!roleId) throw new Error('Invalid role');
      const { user: created } = await api.users.create({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        companyId: userData.companyId,
      });
      await refreshUsers();
      toast.success(`User ${userData.name} created successfully`);
      return created;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (userId: string, updates: Partial<Omit<User, 'roleId' | 'id'>> & { password?: string }) => {
    try {
      setIsLoading(true);
      await api.users.update(userId, updates);
      await refreshUsers();
      toast.success('User updated successfully');
    } catch (error: any) {
      toast.error('Failed to update user');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      setIsLoading(true);
      await api.users.delete(userId);
      if (user && user.id === userId) {
        clearAuth();
        setUser(null);
      }
      await refreshUsers();
      toast.success('User deleted permanently');
    } catch {
      toast.error('Failed to delete user');
      throw new Error('Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUsersByCompanyId = async (companyId: string) => {
    try {
      setIsLoading(true);
      await api.users.deleteByCompany(companyId);
      if (user && user.companyId === companyId) {
        clearAuth();
        setUser(null);
      }
      await refreshUsers();
      toast.success('All users from company have been deleted permanently');
    } catch {
      toast.error('Failed to delete company users');
      throw new Error('Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getUsersByCompany = (companyId: string) => users.filter((u) => u.companyId === companyId);
  const getAllUsers = () => [...users];

  return (
    <AuthContext.Provider value={{
      user, users, login, logout, addUser, updateUser, deleteUser,
      deleteUsersByCompanyId, getUsersByCompany, getAllUsers,
      getUserCountForCompany, isLoading, systemName, systemLogoUrl, companyDisplayName,
      refreshBranding,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
