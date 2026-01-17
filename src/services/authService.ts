import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
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
import { auth, db } from '@/lib/firebase';
import { User, UserRole } from '@/types/auth';

// Default admin account - will be created on first app load
export const DEFAULT_ADMIN = {
  email: 'admin@pacfu.psau.edu',
  password: 'admin123',
  name: 'Dr. Maria Santos',
  role: 'admin' as UserRole,
};

// Initialize default admin account if it doesn't exist
export const initializeDefaultAdmin = async () => {
  try {
    // Check if admin already exists in Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', DEFAULT_ADMIN.email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Create admin in Firebase Auth
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          DEFAULT_ADMIN.email,
          DEFAULT_ADMIN.password
        );
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: DEFAULT_ADMIN.email,
          name: DEFAULT_ADMIN.name,
          role: DEFAULT_ADMIN.role,
          isActive: true,
          createdAt: new Date(),
        });
        
        console.log('Default admin account created successfully');
        
        // Sign out after creating
        await signOut(auth);
      } catch (error: any) {
        // If admin already exists in Auth but not in Firestore, that's okay
        if (error.code !== 'auth/email-already-in-use') {
          console.error('Error creating default admin:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error checking for admin:', error);
  }
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
      isActive: userData.isActive,
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

// Get user data from Firestore
export const getUserData = async (uid: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return null;
    
    const data = userDoc.data();
    return {
      id: uid,
      email: data.email,
      name: data.name,
      role: data.role,
      isActive: data.isActive,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Create faculty account
export const createFacultyAccount = async (
  email: string,
  password: string,
  name: string,
  department: string,
  position: string,
  groups: string[] = []
): Promise<{ success: boolean; error?: string; userId?: string }> => {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
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
