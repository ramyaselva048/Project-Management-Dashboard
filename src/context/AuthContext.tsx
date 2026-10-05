import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.ts';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (fullName: string, email: string, password: string) => Promise<void>;
  resetPasswordAndLogin: (email: string, newPassword: string) => Promise<void>;
  logout: () => void;
  updateUser: (updated: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const profile = await api.getProfile();
      setUser(profile);
    } catch {
      // Stale or expired token in storage - cleanly reset session without error
      removeAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.login({ email, password });
    setAuthToken(response.token);
    setUser(response.user);
  };

  const signup = async (fullName: string, email: string, password: string) => {
    const response = await api.signup({ full_name: fullName, email, password });
    setAuthToken(response.token);
    setUser(response.user);
  };

  const resetPasswordAndLogin = async (email: string, newPassword: string) => {
    const response = await api.resetPasswordByEmail({ email, new_password: newPassword });
    setAuthToken(response.token);
    setUser(response.user);
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  const updateUser = (updated: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        signup,
        resetPasswordAndLogin,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
