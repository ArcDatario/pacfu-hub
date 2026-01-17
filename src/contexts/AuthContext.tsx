import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole, AuthState } from '@/types/auth';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setDemoUser: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default credentials for demo accounts
export const defaultCredentials = {
  admin: {
    email: 'admin@pacfu.psau.edu',
    password: 'admin123',
  },
  faculty: {
    email: 'faculty@pacfu.psau.edu',
    password: 'faculty123',
  },
};

// Demo users for testing
const demoUsers: Record<UserRole, User> = {
  admin: {
    id: '1',
    email: 'admin@pacfu.psau.edu',
    name: 'Dr. Maria Santos',
    role: 'admin',
    isActive: true,
    createdAt: new Date(),
  },
  faculty: {
    id: '2',
    email: 'faculty@pacfu.psau.edu',
    name: 'Prof. Juan Dela Cruz',
    role: 'faculty',
    isActive: true,
    createdAt: new Date(),
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  });

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Check against default credentials
    if (email === defaultCredentials.admin.email && password === defaultCredentials.admin.password) {
      setAuthState({
        user: demoUsers.admin,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    }
    
    if (email === defaultCredentials.faculty.email && password === defaultCredentials.faculty.password) {
      setAuthState({
        user: demoUsers.faculty,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    }

    // For other faculty accounts (created by admin), default password check
    // In a real app, this would validate against Firebase Auth
    if (email.includes('@') && password.length >= 6) {
      const isFacultyEmail = !email.includes('admin');
      setAuthState({
        user: {
          id: Date.now().toString(),
          email,
          name: email.split('@')[0].replace(/[.]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          role: isFacultyEmail ? 'faculty' : 'admin',
          isActive: true,
          createdAt: new Date(),
        },
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    }
    
    setAuthState((prev) => ({ ...prev, isLoading: false }));
    return { success: false, error: 'Invalid email or password' };
  };

  const logout = () => {
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const setDemoUser = (role: UserRole) => {
    setAuthState({
      user: demoUsers[role],
      isAuthenticated: true,
      isLoading: false,
    });
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, setDemoUser }}>
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
