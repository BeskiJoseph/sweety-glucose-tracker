import { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContextValue';
import { authApi } from '../services/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Restore current session from secure HTTP-only cookie on mount
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authApi.getMe();
      if (res?.success && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials) => {
    setAuthError(null);
    try {
      const res = await authApi.login(credentials);
      if (res?.success && res.data) {
        setUser(res.data);
        return res.data;
      }
    } catch (err) {
      setAuthError(err.message || 'Login failed. Please check your credentials.');
      throw err;
    }
  };

  const register = async (userData) => {
    setAuthError(null);
    try {
      const res = await authApi.register(userData);
      if (res?.success && res.data) {
        setUser(res.data);
        return res.data;
      }
    } catch (err) {
      setAuthError(err.message || 'Registration failed.');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Proceed with clearing local state even if network call failed
    } finally {
      setUser(null);
      setAuthError(null);
    }
  };

  const clearError = () => setAuthError(null);

  const value = {
    user,
    loading,
    authError,
    login,
    register,
    logout,
    clearError,
    refreshUser: checkAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
