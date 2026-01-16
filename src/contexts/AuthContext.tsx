import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole, AuthState } from '@/types/auth';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setDemoUser: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  const login = async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // For demo, check if email contains 'admin'
    const role: UserRole = email.includes('admin') ? 'admin' : 'faculty';
    const user = demoUsers[role];
    
    setAuthState({
      user: { ...user, email },
      isAuthenticated: true,
      isLoading: false,
    });
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
