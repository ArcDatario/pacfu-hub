import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, AuthState } from '@/types/auth';
import { 
  loginWithEmail, 
  logoutUser, 
  onAuthChange, 
  getUserData,
  initializeDefaultAdmin,
  createFacultyAccount
} from '@/services/authService';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  createFaculty: (email: string, password: string, name: string, department: string, position: string, groups?: string[]) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize default admin on app load
  useEffect(() => {
    initializeDefaultAdmin();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await getUserData(firebaseUser.uid);
        if (userData && userData.isActive) {
          setAuthState({
            user: userData,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          // User exists in Auth but not in Firestore or is deactivated
          await logoutUser();
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));
    
    const result = await loginWithEmail(email, password);
    
    if (result.user) {
      setAuthState({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    }
    
    setAuthState((prev) => ({ ...prev, isLoading: false }));
    return { success: false, error: result.error || 'Login failed' };
  };

  const logout = async () => {
    await logoutUser();
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const refreshUser = async () => {
    if (!authState.user) return;
    
    const userData = await getUserData(authState.user.id);
    if (userData) {
      setAuthState(prev => ({
        ...prev,
        user: userData,
      }));
    }
  };

  const createFaculty = async (
    email: string, 
    password: string, 
    name: string, 
    department: string,
    position: string,
    groups: string[] = []
  ): Promise<{ success: boolean; error?: string }> => {
    // Store current user before creating new account
    const currentUser = authState.user;
    
    const result = await createFacultyAccount(email, password, name, department, position, groups);
    
    // Re-authenticate the admin after creating faculty
    // The onAuthChange listener will handle state updates
    if (currentUser && result.success) {
      // The Firebase SDK will automatically sign out when creating a new user
      // We need to re-login the admin
      // For now, we'll just return success and let the admin login again if needed
      // In production, you'd use Firebase Admin SDK on backend
    }
    
    return result;
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, createFaculty, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
