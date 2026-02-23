import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  getAuth
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from '@/lib/firebase';
import { User, UserRole } from '@/types/auth';

// Default admin account - will be created on first app load
// SECURITY: Password should be changed immediately after first login
// The random password ensures the account isn't accessible with default credentials
const generateSecurePassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 24; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export const DEFAULT_ADMIN = {
  email: import.meta.env.VITE_ADMIN_EMAIL || 'admin@pacfu.psau.edu',
  password: import.meta.env.VITE_ADMIN_PASSWORD || generateSecurePassword(),
  name: import.meta.env.VITE_ADMIN_NAME || 'System Administrator',
  role: 'admin' as UserRole,
};

const SECOND_ADMIN = {
  email: 'admin2@pacfu.psau.edu',
  password: 'Admin@PACFU2025',
  name: 'Administrator 2',
  role: 'admin' as UserRole,
};

const createAdminIfNotExists = async (email: string, password: string, name: string, role: UserRole) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email,
          name,
          role,
          isActive: true,
          createdAt: new Date(),
        });
        console.log(`Admin account created: ${email}`);
        await signOut(auth);
      } catch (error: any) {
        if (error.code !== 'auth/email-already-in-use') {
          console.error(`Error creating admin ${email}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error checking for admin:', error);
  }
};

// Initialize default admin account if it doesn't exist
export const initializeDefaultAdmin = async () => {
  await createAdminIfNotExists(DEFAULT_ADMIN.email, DEFAULT_ADMIN.password, DEFAULT_ADMIN.name, DEFAULT_ADMIN.role);
  await createAdminIfNotExists(SECOND_ADMIN.email, SECOND_ADMIN.password, SECOND_ADMIN.name, SECOND_ADMIN.role);
};

// Sign in with email and password
export const loginWithEmail = async (email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    
    if (!userDoc.exists()) {
      await signOut(auth);
      return { user: null, error: 'User account not found in database' };
    }
    
    const userData = userDoc.data();
    
    if (!userData.isActive) {
      await signOut(auth);
      return { user: null, error: 'Your account has been deactivated. Please contact the admin.' };
    }
    
    const user: User = {
      id: firebaseUser.uid,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      avatar: userData.avatar || undefined,
      isActive: userData.isActive,
      department: userData.department || undefined,
      groups: userData.groups || [],
      createdAt: userData.createdAt?.toDate() || new Date(),
    };
    
    return { user, error: null };
  } catch (error: any) {
    console.error('Login error:', error);
    
    let errorMessage = 'Invalid email or password';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password';
    } else if (error.code === 'auth/invalid-credential') {
      errorMessage = 'Invalid email or password';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed attempts. Please try again later.';
    }
    
    return { user: null, error: errorMessage };
  }
};

// Sign out
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
  }
};

// Listen to auth state changes
export const onAuthChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Get user data from Firestore (with fresh fetch)
export const getUserData = async (uid: string): Promise<User | null> => {
  try {
    // Force a fresh fetch from Firestore
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (!userDoc.exists()) {
      console.log('User document does not exist');
      return null;
    }
    
    const data = userDoc.data();
    
    const user: User = {
      id: uid,
      email: data.email,
      name: data.name,
      role: data.role,
      avatar: data.avatar || undefined,
      isActive: data.isActive,
      department: data.department || undefined,
      groups: data.groups || [],
      createdAt: data.createdAt?.toDate() || new Date(),
    };
    
    console.log('Fetched user data:', user);
    
    return user;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Create faculty account using a secondary auth instance to prevent logout
export const createFacultyAccount = async (
  email: string,
  password: string,
  name: string,
  department: string,
  position: string,
  groups: string[] = []
): Promise<{ success: boolean; error?: string; userId?: string }> => {
  try {
    // Create a secondary Firebase app instance to avoid logging out the current admin
    const secondaryApp = initializeApp(firebaseConfig, 'secondary-' + Date.now());
    const secondaryAuth = getAuth(secondaryApp);
    
    // Create user in Firebase Auth using secondary auth
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email,
      name,
      role: 'faculty' as UserRole,
      department,
      position,
      groups,
      isActive: true,
      createdAt: new Date(),
    });

    // Add faculty to group chats' participants
    if (groups && groups.length > 0) {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('type', '==', 'group'));
      const chatsSnapshot = await getDocs(q);
      
      for (const chatDoc of chatsSnapshot.docs) {
        const chatData = chatDoc.data();
        // If the group name matches one of the faculty's assigned groups
        if (groups.includes(chatData.name)) {
          await updateDoc(chatDoc.ref, {
            participants: arrayUnion(userCredential.user.uid),
            participantNames: {
              ...chatData.participantNames,
              [userCredential.user.uid]: name,
            },
          });
        }
      }
    }
    
    // Sign out from secondary auth and delete the secondary app
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
    
    return { success: true, userId: userCredential.user.uid };
  } catch (error: any) {
    console.error('Error creating faculty account:', error);
    
    let errorMessage = 'Failed to create account';
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'An account with this email already exists';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password should be at least 6 characters';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    }
    
    return { success: false, error: errorMessage };
  }
};