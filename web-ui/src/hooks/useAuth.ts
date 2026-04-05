// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Authentication hook
 * Provides auth state and methods to components
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginService, logout as logoutService, getMe, LoginCredentials, User } from '../services/auth.service';
import { getToken, removeToken, isTokenExpired, hasRole as hasRoleUtil, getUserFromToken } from '../utils/token';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useAuth = () => {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  /**
   * Initialize auth state from token
   */
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();

      if (!token || isTokenExpired(token)) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      try {
        const user = await getMe();
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        console.error('Failed to fetch user:', error);
        removeToken();
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initAuth();
  }, []);

  /**
   * Logs in the user
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await loginService(credentials);

      setAuthState({
        user: {
          id: response._user._id,
          email: response._user._username, // Using username as email for now
          name: response._user._username,
          roles: [response._user._role],
        },
        isAuthenticated: true,
        isLoading: false,
      });

      navigate('/');
    } catch (error) {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      throw error;
    }
  }, [navigate]);

  /**
   * Logs out the user
   */
  const logout = useCallback(async (): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      await logoutService();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      navigate('/login');
    }
  }, [navigate]);

  /**
   * Checks if user has at least one of the specified roles
   */
  const hasRole = useCallback((roles: string[]): boolean => {
    const token = getToken();
    if (!token) {
      return false;
    }
    return hasRoleUtil(token, roles);
  }, []);

  /**
   * Refreshes user data
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const user = await getMe();
      setAuthState(prev => ({
        ...prev,
        user,
      }));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    login,
    logout,
    hasRole,
    refreshUser,
  };
};
