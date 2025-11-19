import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
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
import { initializeApp, deleteApp } from 'firebase/app';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { app as primaryApp, auth, db } from '../firebaseConfig';

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
  const { companies } = useCompanies();
  const firebaseAuth = getAuth();
  const suppressSignOutToastRef = useRef(false);

  const suppressSignOutToast = (ms = 1200) => {
    suppressSignOutToastRef.current = true;
    setTimeout(() => { suppressSignOutToastRef.current = false; }, ms);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, USERS_COLLECTION, firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Debug: log fetched user doc for troubleshooting
            // eslint-disable-next-line no-console
            console.debug('Auth: fetched userDoc for', firebaseUser.uid, userData);

            // Enforce explicit active flags: deny access if user or company is inactive.
            if (userData.isActive === false) {
              suppressSignOutToast();
              await firebaseSignOut(firebaseAuth);
              setUser(null);
              setIsLoading(false);
              return;
            }

            // If user belongs to a company, ensure the company is active
            if (userData.companyId) {
              const companyDoc = await getDoc(doc(db, 'companies', userData.companyId));
              if (companyDoc.exists() && companyDoc.data()?.isActive === false) {
                suppressSignOutToast();
                await firebaseSignOut(firebaseAuth);
                setUser(null);
                setIsLoading(false);
                return;
              }
            }

            // All checks passed — set the user in context (no automatic writes to Firestore)
            setUser(mapFirebaseUser({ ...userData, id: firebaseUser.uid }));
          } else {
            // User authenticated but no Firestore user doc found
            console.warn('Auth: user authenticated but Firestore user doc missing for', firebaseUser.uid);
            suppressSignOutToast();
            await firebaseSignOut(firebaseAuth);
            setUser(null);
            setIsLoading(false);
            return;
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

    // Load all users (active and inactive) so the UI can show status filters
    const usersRef = collection(db, USERS_COLLECTION);
      const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const usersList: User[] = [];
      snapshot.forEach((doc) => {
        usersList.push(mapFirebaseUser({ ...doc.data(), id: doc.id }));
      });
      setUsers(usersList);

      // If the current authenticated user's Firestore user doc was deactivated, sign them out immediately.
      const currentUid = firebaseAuth.currentUser?.uid;
      if (currentUid) {
        const currentUserDoc = usersList.find(u => u.id === currentUid);
        if (currentUserDoc && currentUserDoc.isActive === false) {
          (async () => {
            try {
              suppressSignOutToast();
              await firebaseSignOut(firebaseAuth);
              setUser(null);
            } catch (err) {
              console.error('Error signing out deactivated user:', err);
            }
          })();
        }
      }
    });

    return () => {
      unsubscribe();
      unsubscribeUsers();
    };
  }, []);

  // If the current user's company becomes inactive, sign them out immediately.
  useEffect(() => {
    if (!user) return;
    // Only check if user has a companyId
    if (!user.companyId) return;

    const company = companies.find(c => c.id === user.companyId || c.companyId === user.companyId);
    if (company && company.isActive === false) {
      (async () => {
        try {
          suppressSignOutToast();
          await firebaseSignOut(firebaseAuth);
          setUser(null);
        } catch (err) {
          console.error('Error signing out inactive company user:', err);
        }
      })();
    }
  }, [user, companies]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const firebaseUser = userCredential.user;
      let userDoc: any;
      try {
        userDoc = await getDoc(doc(db, USERS_COLLECTION, firebaseUser.uid));
      } catch (err: any) {
        console.error('Login: failed to read user document (possible Firestore permission error):', err);
        // Provide a clearer, actionable message while keeping listeners silent
        const isPermDenied = err?.code === 'permission-denied' || String(err).includes('Missing or insufficient permissions');
        const friendly = isPermDenied
          ? 'Unable to access account data. Contact your administrator.'
          : 'Login failed while verifying account. Please try again.';
        toast.error(friendly);
        suppressSignOutToast();
        await firebaseSignOut(firebaseAuth);
        return { success: false, error: String(err?.message || err) };
      }

      if (!userDoc.exists()) {
        // Clearer message when auth succeeds but Firestore user record is missing
        toast.error('Your account is not provisioned in the system. Contact an administrator.');
        suppressSignOutToast();
        await firebaseSignOut(firebaseAuth);
        return { success: false, error: 'User not provisioned in Firestore' };
      }
      const userData = userDoc.data();
      if (userData.isActive === false) {
        toast.error('This account has been deactivated');
        suppressSignOutToast();
        await firebaseSignOut(firebaseAuth);
        return { success: false, error: 'This account has been deactivated' };
      }
      if (userData.companyId) {
        const companyDoc = await getDoc(doc(db, 'companies', userData.companyId));
        if (companyDoc.exists() && !companyDoc.data()?.isActive) {
          toast.error('Your company account is inactive');
          suppressSignOutToast();
          await firebaseSignOut(firebaseAuth);
          return { success: false, error: 'Your company account is inactive' };
        }
      }
      // Try updating lastLoginAt, but don't treat failures as login failures (permission issues may block this)
      try {
        await updateDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), {
          lastLoginAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Login: could not update lastLoginAt for user', firebaseUser.uid, err);
      }
      toast.success(`Welcome back, ${userData.name || userData.email}!`);
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      // Distinguish auth errors from other runtime errors (e.g., Firestore permission denied)
      let errorMessage = '';
      if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && error.code.startsWith('auth/')) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          errorMessage = 'Wrong email or password';
        } else if (error.code === 'auth/too-many-requests') {
          errorMessage = 'Too many failed login attempts. Please try again later.';
        } else if (error.code === 'auth/user-disabled') {
          errorMessage = 'This account has been disabled';
        } else if (error.code === 'auth/network-request-failed') {
          errorMessage = 'Network error. Please check your connection.';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'Invalid email format';
        } else {
          errorMessage = 'Authentication failed';
        }
      } else {
        // Non-auth errors (Firestore update errors, permission denied, etc.)
        console.error('Non-auth error during login:', error);
        const msg = error?.message || String(error) || 'Login failed';
        errorMessage = `Login failed: ${msg}`;
      }
      // Show toast for immediate visibility in UI
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      suppressSignOutToast();
      await firebaseSignOut(firebaseAuth);
      toast.success('Successfully logged out');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out. Please try again.');
    }
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
      // Use a secondary app/auth instance to avoid switching the current logged-in user
      const secondaryApp = initializeApp(primaryApp.options, 'secondary-app');
      const secondaryAuth = getAuth(secondaryApp);
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
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
      // Clean up the secondary app session to avoid interference
      try { await deleteApp(secondaryApp); } catch {}
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
      await deleteDoc(userRef);
      if (user && user.id === userId) {
        suppressSignOutToast();
        await firebaseSignOut(firebaseAuth);
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
        suppressSignOutToast();
        await firebaseSignOut(firebaseAuth);
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
