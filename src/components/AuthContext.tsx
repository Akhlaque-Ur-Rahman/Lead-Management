import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { type RoleKey, type RoleId, getRoleId } from '../types/roles';
import { toast } from 'sonner';
import { useCompanies, type Company } from './CompanyContext';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  createUserWithEmailAndPassword,
  updateProfile as updateFirebaseProfile,
  updateEmail as updateFirebaseEmail,
  updatePassword as updateFirebasePassword,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  roleId: RoleId; // Unique identifier for the role
  companyId: string | null; // null for super_admin
  createdAt: string;
  isActive: boolean;
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
  createdAt: firebaseUser.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  lastLoginAt: firebaseUser.lastLoginAt?.toDate?.()?.toISOString()
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { companies } = useCompanies();
  const firebaseAuth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, USERS_COLLECTION, firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.isActive === false) {
              await firebaseSignOut(firebaseAuth);
              setUser(null);
              return;
            }
            setUser(mapFirebaseUser({ ...userData, id: firebaseUser.uid }));
          } else {
            console.error('User not found in Firestore');
            await firebaseSignOut(firebaseAuth);
            setUser(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    const usersQuery = query(collection(db, USERS_COLLECTION), where('isActive', '==', true));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersList: User[] = [];
      snapshot.forEach((doc) => {
        usersList.push(mapFirebaseUser({ ...doc.data(), id: doc.id }));
      });
      setUsers(usersList);
    });

    return () => {
      unsubscribe();
      unsubscribeUsers();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const firebaseUser = userCredential.user;
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, firebaseUser.uid));
      if (!userDoc.exists()) {
        await firebaseSignOut(firebaseAuth);
        return { success: false, error: 'User not found' };
      }
      const userData = userDoc.data();
      if (userData.isActive === false) {
        await firebaseSignOut(firebaseAuth);
        return { success: false, error: 'This account has been deactivated' };
      }
      if (userData.companyId) {
        const companyDoc = await getDoc(doc(db, 'companies', userData.companyId));
        if (companyDoc.exists() && !companyDoc.data()?.isActive) {
          await firebaseSignOut(firebaseAuth);
          return { success: false, error: 'Your company account is inactive' };
        }
      }
      await updateDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), {
        lastLoginAt: serverTimestamp()
      });
      toast.success(`Welcome back, ${userData.name || userData.email}!`);
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'An error occurred during login';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      }
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(firebaseAuth);
      toast.success('Successfully logged out');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out. Please try again.');
    }
  };

  const getUserCountForCompany = (companyId: string | null) => {
    if (!companyId) return 0;
    return users.filter(user => user.companyId === companyId).length;
  };

  const addUser = async (userData: Omit<User, 'id' | 'createdAt' | 'roleId'> & { password: string }) => {
    try {
      setIsLoading(true);
      const roleId = getRoleId(userData.role);
      if (!roleId) {
        throw new Error('Invalid role');
      }
      const userCredential = await createUserWithEmailAndPassword(
        firebaseAuth, 
        userData.email, 
        userData.password
      );
      const firebaseUser = userCredential.user;
      const userDoc = {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        roleId,
        companyId: userData.companyId || null,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), userDoc);
      await updateFirebaseProfile(firebaseUser, {
        displayName: userData.name
      });
      const newUser: User = {
        id: firebaseUser.uid,
        name: userData.name,
        email: userData.email,
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
      let errorMessage = 'Failed to create user';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already in use';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }
      toast.error(errorMessage);
      throw new Error(errorMessage);
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
      await updateDoc(userRef, userUpdates);
      const firebaseUser = firebaseAuth.currentUser;
      if (firebaseUser && firebaseUser.uid === userId) {
        const updates: any = {};
        if (updates.email && updates.email !== userDoc.data().email) {
          await updateFirebaseEmail(firebaseUser, updates.email);
        }
        if (password) {
          await updateFirebasePassword(firebaseUser, password);
        }
        if (updates.name && updates.name !== userDoc.data().name) {
          await updateFirebaseProfile(firebaseUser, {
            displayName: updates.name
          });
        }
      }
      toast.success('User updated successfully');
    } catch (error: any) {
      console.error('Error updating user:', error);
      let errorMessage = 'Failed to update user';
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Please log in again to update your email or password';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already in use';
      }
      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      setIsLoading(true);
      const userRef = doc(db, USERS_COLLECTION, userId);
      await updateDoc(userRef, {
        isActive: false,
        updatedAt: serverTimestamp()
      });
      if (user && user.id === userId) {
        await firebaseSignOut(firebaseAuth);
      }
      toast.success('User deactivated successfully');
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error('Failed to deactivate user');
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
        where('companyId', '==', companyId),
        where('isActive', '==', true)
      );
      const querySnapshot = await getDocs(usersQuery);
      const batch: Promise<void>[] = [];
      querySnapshot.forEach((doc) => {
        batch.push(updateDoc(doc.ref, {
          isActive: false,
          updatedAt: serverTimestamp()
        }));
      });
      await Promise.all(batch);
      if (user && user.companyId === companyId) {
        await firebaseSignOut(firebaseAuth);
      }
      toast.success(`All users from company have been deactivated`);
    } catch (error) {
      console.error('Error deactivating company users:', error);
      toast.error('Failed to deactivate company users');
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
