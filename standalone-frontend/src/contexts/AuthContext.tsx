import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../utils/api';

interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  google_user_data: {
    name: string;
    email: string;
    picture: string;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  redirectToLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = (token: string) => {
    localStorage.setItem('auth_token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchUser();
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    }
  };

  const redirectToLogin = async () => {
    try {
      const response = await api.get('/auth/google/url');
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Failed to get auth URL:', error);
    }
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    redirectToLogin
  };

  return (
    <AuthContext.Provider value={value}>
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
