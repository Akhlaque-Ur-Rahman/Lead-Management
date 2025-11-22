import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { type RoleKey, type RoleId, getRoleId } from '../types/roles';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';

import { 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

const SESSION_KEY = 'lms_user_session';

export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  roleId: RoleId; // Unique identifier for the role
  companyId: string | null; // null for super_admin
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const USERS_COLLECTION = 'users';

const mapFirebaseUser = (firebaseUser: any): User => ({
  id: firebaseUser.id || firebaseUser.uid,
  name: firebaseUser.name || firebaseUser.displayName || '',
  email: firebaseUser.email,
  role: firebaseUser.role,
  roleId: firebaseUser.roleId,
  companyId: firebaseUser.companyId || null,
  isActive: firebaseUser.isActive !== undefined ? firebaseUser.isActive : true,
  deactivatedByCompany: firebaseUser.deactivatedByCompany === true,
  createdAt: firebaseUser.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  lastLoginAt: firebaseUser.lastLoginAt?.toDate?.()?.toISOString()
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);




  useEffect(() => {
    // Restore session from localStorage
    const restoreSession = async () => {
      const storedSession = localStorage.getItem(SESSION_KEY);
      if (storedSession) {
        try {
          const sessionUser = JSON.parse(storedSession);
          // Verify user still exists and is active in Firestore
          const userDoc = await getDoc(doc(db, USERS_COLLECTION, sessionUser.id));
          if (userDoc.exists() && userDoc.data().isActive !== false) {
            setUser(mapFirebaseUser({ ...userDoc.data(), id: userDoc.id }));
          } else {
            // User no longer exists or is inactive
            localStorage.removeItem(SESSION_KEY);
            setUser(null);
          }
        } catch (error) {
          console.error('Error restoring session:', error);
          localStorage.removeItem(SESSION_KEY);
        }
      }
      setIsLoading(false);
    };

    restoreSession();

    // Load all users (active and inactive) so the UI can show status filters
    const usersRef = collection(db, USERS_COLLECTION);
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const usersList: User[] = [];
      snapshot.forEach((doc) => {
        usersList.push(mapFirebaseUser({ ...doc.data(), id: doc.id }));
      });
      setUsers(usersList);
    });

    return () => {
      unsubscribeUsers();
    };
  }, []);

  // If the current user's company becomes inactive, sign them out immediately.


  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const normalizedEmail = email.toLowerCase();
      
      // Query user by email
      const usersQuery = query(
        collection(db, USERS_COLLECTION), 
        where('email', '==', normalizedEmail)
      );
      const querySnapshot = await getDocs(usersQuery);
      
      if (querySnapshot.empty) {
        toast.error('Invalid email or password');
        return { success: false, error: 'Invalid email or password' };
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // Check password
      const isPasswordValid = await bcrypt.compare(password, userData.password);
      if (!isPasswordValid) {
        toast.error('Invalid email or password');
        return { success: false, error: 'Invalid email or password' };
      }

      if (userData.isActive === false) {
        toast.error('This account has been deactivated');
        return { success: false, error: 'This account has been deactivated' };
      }

      if (userData.companyId) {
        const companyDoc = await getDoc(doc(db, 'companies', userData.companyId));
        if (companyDoc.exists() && !companyDoc.data()?.isActive) {
          toast.error('Your company account is inactive');
          return { success: false, error: 'Your company account is inactive' };
        }
      }

      // Update last login
      await updateDoc(userDoc.ref, {
        lastLoginAt: serverTimestamp()
      });

      const userObj = mapFirebaseUser({ ...userData, id: userDoc.id });
      setUser(userObj);
      localStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
      
      toast.success(`Welcome back, ${userData.name || userData.email}!`);
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    toast.success('Successfully logged out');
  };

  const getUserCountForCompany = (companyId: string | null) => {
    if (!companyId) return 0;
    // Count only active users for company-level limits/stats
    return users.filter(user => user.companyId === companyId && user.isActive).length;
  };

  const addUser = async (userData: Omit<User, 'id' | 'createdAt' | 'roleId'> & { password: string }) => {
    try {
      setIsLoading(true);
      const roleId = getRoleId(userData.role);
      if (!roleId) {
        throw new Error('Invalid role');
      }

      const normalizedEmail = userData.email.toLowerCase();

      // Check if email already exists
      const emailQuery = query(
        collection(db, USERS_COLLECTION),
        where('email', '==', normalizedEmail)
      );
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        throw new Error('Email is already in use');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create new user doc with auto-generated ID
      const newUserRef = doc(collection(db, USERS_COLLECTION));
      const newUserDoc = {
        name: userData.name,
        email: normalizedEmail,
        role: userData.role,
        roleId,
        companyId: userData.companyId || null,
        password: hashedPassword,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(newUserRef, newUserDoc);

      const newUser: User = {
        id: newUserRef.id,
        name: userData.name,
        email: normalizedEmail,
        role: userData.role,
        roleId,
        companyId: userData.companyId || null,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      toast.success(`User ${userData.name} created successfully`);
      return newUser;
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(error.message || 'Failed to create user');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (userId: string, updates: Partial<Omit<User, 'roleId' | 'id'>> & { password?: string }) => {
    try {
      setIsLoading(true);
      const userRef = doc(db, USERS_COLLECTION, userId);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      const updateData: any = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      const { password, ...userUpdates } = updateData;
      
      // If password is provided, hash it
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await updateDoc(userRef, { ...userUpdates, password: hashedPassword });
      } else {
        await updateDoc(userRef, userUpdates);
      }
      toast.success('User updated successfully');
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      setIsLoading(true);
      const userRef = doc(db, USERS_COLLECTION, userId);
      await deleteDoc(userRef);
      if (user && user.id === userId) {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
      }
      toast.success('User deleted permanently');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUsersByCompanyId = async (companyId: string) => {
    try {
      setIsLoading(true);
      const usersQuery = query(
        collection(db, USERS_COLLECTION),
        where('companyId', '==', companyId)
      );
      const querySnapshot = await getDocs(usersQuery);
      const deletions: Promise<void>[] = [];
      querySnapshot.forEach((userDoc) => {
        deletions.push(deleteDoc(userDoc.ref));
      });
      await Promise.all(deletions);
      if (user && user.companyId === companyId) {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
      }
      toast.success(`All users from company have been deleted permanently`);
    } catch (error) {
      console.error('Error deleting company users:', error);
      toast.error('Failed to delete company users');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getUsersByCompany = (companyId: string) => {
    return users.filter(user => user.companyId === companyId);
  };

  const getAllUsers = () => {
    return [...users];
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
        deleteUsersByCompanyId,
        getUsersByCompany,
        getAllUsers,
        getUserCountForCompany,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
