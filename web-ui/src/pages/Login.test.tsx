// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/tests/utils/test-utils';
import Login from './Login';
import * as api from '@services/api';
import { mockApiHandlers } from '@/tests/mocks/handlers';

// Mock the api module
vi.mock('@services/api', () => ({
  api: {
    login: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
  },
}));

// Mock the navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => {
      mockNavigate(to);
      return null;
    },
    useNavigate: () => mockNavigate,
  };
});

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders login form with all fields', () => {
    render(<Login />);

    expect(screen.getByText('ConfigBuddy')).toBeInTheDocument();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<Login />);

    const usernameInput = screen.getByLabelText(/username/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Clear the default values
    await user.clear(usernameInput);
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument();
    });
  });

  it('successfully logs in with valid credentials', async () => {
    const user = userEvent.setup();

    // Mock successful API responses with delay to catch loading state
    vi.mocked(api.api.login).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockApiHandlers.login.success), 50))
    );
    vi.mocked(api.api.getCurrentUser).mockResolvedValue(mockApiHandlers.getCurrentUser.success);

    render(<Login />);

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Enter credentials
    await user.clear(usernameInput);
    await user.type(usernameInput, 'admin');
    await user.clear(passwordInput);
    await user.type(passwordInput, 'Admin123!');

    // Submit form
    await user.click(submitButton);

    // Verify API was called with correct credentials
    await waitFor(() => {
      expect(api.api.login).toHaveBeenCalledWith({
        username: 'admin',
        password: 'Admin123!',
      });
    });

    // Verify token is stored in localStorage
    await waitFor(() => {
      expect(localStorage.getItem('auth_token')).toBe('mock-token-12345');
    });

    // Verify user data is stored
    await waitFor(() => {
      const userData = localStorage.getItem('user');
      expect(userData).toBeTruthy();
      if (userData) {
        const parsedUser = JSON.parse(userData);
        expect(parsedUser.username).toBe('admin');
      }
    });

    // Verify navigation to home page
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('displays error message with invalid credentials', async () => {
    const user = userEvent.setup();

    // Mock failed login with delay
    vi.mocked(api.api.login).mockRejectedValue({
      response: {
        data: {
          message: 'Invalid username or password',
        },
      },
    });

    render(<Login />);

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Enter invalid credentials
    await user.clear(usernameInput);
    await user.type(usernameInput, 'wronguser');
    await user.clear(passwordInput);
    await user.type(passwordInput, 'WrongPass123!');

    // Submit form
    await user.click(submitButton);

    // Verify error message is displayed
    await waitFor(() => {
      const errorAlert = screen.queryByText(/invalid username or password/i);
      expect(errorAlert).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify token is NOT stored
    expect(localStorage.getItem('auth_token')).toBeNull();

    // Verify user is not navigated away
    expect(mockNavigate).not.toHaveBeenCalledWith('/');
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<Login />);

    const passwordInput = screen.getByPlaceholderText(/enter your password/i) as HTMLInputElement;

    // Initially password should be hidden
    expect(passwordInput.type).toBe('password');

    // Find and click the show/hide button (Eye icon)
    const toggleButton = passwordInput.parentElement?.querySelector('button[type="button"]');
    expect(toggleButton).toBeInTheDocument();

    if (toggleButton) {
      await user.click(toggleButton);

      // Password should now be visible
      await waitFor(() => {
        expect(passwordInput.type).toBe('text');
      });

      // Click again to hide
      await user.click(toggleButton);

      await waitFor(() => {
        expect(passwordInput.type).toBe('password');
      });
    }
  });

  it('redirects authenticated users to home page', async () => {
    // Set up authenticated state
    localStorage.setItem('auth_token', 'existing-token');
    localStorage.setItem('user', JSON.stringify(mockApiHandlers.getCurrentUser.success));

    vi.mocked(api.api.getCurrentUser).mockResolvedValue(mockApiHandlers.getCurrentUser.success);

    render(<Login />);

    // Should redirect to home
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup();

    // Mock network error
    vi.mocked(api.api.login).mockRejectedValue(new Error('Network error'));

    render(<Login />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    // Verify error message is displayed (generic error shown for network errors)
    await waitFor(() => {
      const errorAlert = screen.queryByText(/invalid username or password/i);
      expect(errorAlert).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('disables form during submission', async () => {
    const user = userEvent.setup();

    let resolveLogin: any;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });

    // Mock a slow login that we control
    vi.mocked(api.api.login).mockReturnValue(loginPromise as any);
    vi.mocked(api.api.getCurrentUser).mockResolvedValue(mockApiHandlers.getCurrentUser.success);

    render(<Login />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Click submit with default values
    await user.click(submitButton);

    // Check that form is disabled
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);

    expect(usernameInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(submitButton).toBeDisabled();

    // Resolve the promise to clean up
    resolveLogin(mockApiHandlers.login.success);
  });
});
