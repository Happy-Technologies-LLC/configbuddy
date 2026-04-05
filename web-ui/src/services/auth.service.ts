// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Authentication service
 * Handles all authentication-related API calls
 */

import axios from 'axios';
import { getToken, setToken, removeToken } from '../utils/token';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Configure axios instance with auth interceptor
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginData {
  _accessToken: string;
  _refreshToken: string;
  _expiresIn: number;
  _user: {
    _id: string;
    _username: string;
    _role: string;
  };
}

export interface LoginResponse {
  success: boolean;
  data: LoginData;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  avatar?: string;
}

export interface UpdateProfileData {
  name?: string;
  avatar?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

/**
 * Authenticates user and returns JWT token
 */
export const login = async (credentials: LoginCredentials): Promise<LoginData> => {
  const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', {
    _username: credentials.username,
    _password: credentials.password,
  });

  const loginData = response.data.data;

  if (loginData._accessToken) {
    setToken(loginData._accessToken);
  }

  return loginData;
};

/**
 * Logs out the current user
 */
export const logout = async (): Promise<void> => {
  try {
    await apiClient.post('/api/v1/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    removeToken();
  }
};

/**
 * Gets current user information
 */
export const getMe = async (): Promise<User> => {
  const response = await apiClient.get<{ user: User }>('/api/v1/auth/me');
  return response.data.user;
};

/**
 * Updates user profile
 */
export const updateProfile = async (data: UpdateProfileData): Promise<User> => {
  const response = await apiClient.put<{ user: User }>('/api/v1/auth/profile', data);
  return response.data.user;
};

/**
 * Changes user password
 */
export const changePassword = async (data: ChangePasswordData): Promise<void> => {
  await apiClient.put('/api/v1/auth/password', data);
};

/**
 * Deletes user account
 */
export const deleteAccount = async (): Promise<void> => {
  await apiClient.delete('/api/v1/auth/account');
  removeToken();
};

export { apiClient };
