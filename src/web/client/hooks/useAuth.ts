import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient, { setAuthToken, getAuthToken, removeAuthToken, isAuthenticated } from '../services/api.service';

interface UseAuthResult {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

/**
 * Authentication hook that manages token-based authentication.
 *
 * Features:
 * - Reads token from URL query parameter on mount (QR code flow)
 * - Validates token with backend
 * - Stores token in localStorage
 * - Provides login/logout methods
 * - Redirects to appropriate page after auth
 */
export function useAuth(): UseAuthResult {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(isAuthenticated());

  /**
   * Validate token with backend
   */
  const validateToken = async (token: string): Promise<boolean> => {
    try {
      const response = await apiClient.get('/auth/validate');
      return response.status === 200;
    } catch {
      return false;
    }
  };

  /**
   * Login with token
   */
  const login = async (token: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Set token temporarily
      setAuthToken(token);

      // Validate token with backend
      const isValid = await validateToken(token);

      if (isValid) {
        setAuthenticated(true);
        navigate('/');
      } else {
        removeAuthToken();
        setAuthenticated(false);
        setError('Invalid authentication token');
      }
    } catch (err) {
      removeAuthToken();
      setAuthenticated(false);
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout user
   */
  const logout = (): void => {
    removeAuthToken();
    setAuthenticated(false);
    navigate('/login');
  };

  /**
   * Check for token in URL query params on mount (QR code scan)
   */
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');

    if (tokenFromUrl) {
      // Token from QR code scan
      login(tokenFromUrl).catch((err: unknown) => {
        console.error('Login failed:', err);
      });
    } else if (isAuthenticated()) {
      // Already authenticated
      setIsLoading(false);
    } else {
      // Not authenticated
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  return {
    isAuthenticated: authenticated,
    isLoading,
    error,
    login,
    logout,
  };
}
