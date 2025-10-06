import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'main_admin' | 'admin' | 'user';
  createdAt: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  addUser: (userData: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
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

// Mock users data
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Main Admin',
    email: 'admin@company.com',
    role: 'main_admin',
    createdAt: '2024-01-01',
    isActive: true,
  },
  {
    id: '2',
    name: 'Sales Manager',
    email: 'sales@company.com',
    role: 'admin',
    createdAt: '2024-01-15',
    isActive: true,
  },
  {
    id: '3',
    name: 'Lead Executive',
    email: 'lead@company.com',
    role: 'user',
    createdAt: '2024-02-01',
    isActive: true,
  },
];

// Initial mock credentials
const initialCredentials = {
  'admin@company.com': 'admin123',
  'sales@company.com': 'sales123',
  'lead@company.com': 'lead123',
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [credentials, setCredentials] = useState<Record<string, string>>(initialCredentials);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved user session
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Mock authentication delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (credentials[email] === password) {
      const loggedInUser = users.find(u => u.email === email && u.isActive);
      if (loggedInUser) {
        setUser(loggedInUser);
        localStorage.setItem('currentUser', JSON.stringify(loggedInUser));
        setIsLoading(false);
        return true;
      }
    }
    
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const addUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setUsers(prev => [...prev, newUser]);
    // Add default password for new user
    setCredentials(prev => ({
      ...prev,
      [userData.email]: 'password123'
    }));
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
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
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};