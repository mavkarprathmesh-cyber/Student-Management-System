import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: Role | null;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('sms_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sms_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      if (!token) {
        setIsLoading(false);
        return;
      }
      const res = await api.get('/auth/me');
      if (res.success && res.data) {
        setUser(res.data);
        localStorage.setItem('sms_user', JSON.stringify(res.data));
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
      setUser(null);
      setToken(null);
      localStorage.removeItem('sms_auth_token');
      localStorage.removeItem('sms_user');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshUser();

    const handleLogoutEvent = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('sms_auth_logout', handleLogoutEvent);
    return () => window.removeEventListener('sms_auth_logout', handleLogoutEvent);
  }, [refreshUser]);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('sms_auth_token', newToken);
    localStorage.setItem('sms_user', JSON.stringify(newUser));
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('sms_auth_token');
      localStorage.removeItem('sms_user');
    }
  };

  const role = user?.role || null;
  const isAdmin = role === 'ADMIN';
  const isTeacher = role === 'TEACHER';
  const isStudent = role === 'STUDENT';
  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        role,
        isAdmin,
        isTeacher,
        isStudent,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
