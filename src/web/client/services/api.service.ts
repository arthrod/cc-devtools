import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig, type AxiosError } from 'axios';

/**
 * Token storage key in localStorage
 */
const TOKEN_KEY = 'cc-devtools-auth-token';

/**
 * Retry configuration for network requests
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatuses: number[];
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Get the stored authentication token from localStorage
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Set the authentication token in localStorage
 * Also syncs to VibeTunnel's localStorage for WebSocket authentication
 */
export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);

  // Sync token to VibeTunnel's localStorage for WebSocket auth
  // VibeTunnel's AuthClient reads from these keys
  localStorage.setItem('vibetunnel_auth_token', token);
  localStorage.setItem('vibetunnel_user_data', JSON.stringify({
    userId: 'current_user',
    authMethod: 'cc-devtools',
    loginTime: Date.now(),
  }));
}

/**
 * Remove the authentication token from localStorage
 * Also clears VibeTunnel's localStorage
 */
export function removeAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);

  // Clear VibeTunnel's localStorage
  localStorage.removeItem('vibetunnel_auth_token');
  localStorage.removeItem('vibetunnel_user_data');
}

/**
 * Check if user is authenticated (has a valid token stored)
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

/**
 * Sync existing authentication token to VibeTunnel localStorage.
 * Call this on app initialization to ensure WebSocket auth works
 * for users who were already logged in before the security update.
 */
export function syncTokenToVibeTunnel(): void {
  const token = getAuthToken();

  if (token) {
    // Token exists but may not be in VibeTunnel's localStorage
    // Sync it now
    localStorage.setItem('vibetunnel_auth_token', token);
    localStorage.setItem('vibetunnel_user_data', JSON.stringify({
      userId: 'current_user',
      authMethod: 'cc-devtools',
      loginTime: Date.now(),
    }));
  }
}

/**
 * Calculate exponential backoff delay for retry attempts
 */
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Add 0-30% jitter
  return Math.min(exponentialDelay + jitter, config.maxDelay);
}

/**
 * Check if an error is retryable based on status code and error type
 */
function isRetryableError(error: AxiosError, config: RetryConfig): boolean {
  // Network errors (no response)
  if (!error.response) {
    return true;
  }

  // Check if status code is retryable
  const status = error.response.status;
  return config.retryableStatuses.includes(status);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Axios instance configured with authentication interceptor.
 *
 * Features:
 * - Automatically adds Authorization header with Bearer token
 * - Base URL configured for cc-devtools API endpoints (/cc-api)
 * - JSON content type by default
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: '/cc-api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/**
 * Request interceptor: Add authentication token to all requests
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = getAuthToken();
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor: Handle authentication errors and implement retry logic
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const config = error.config;

      // Handle 401 Unauthorized (no retry for auth errors)
      if (error.response?.status === 401) {
        removeAuthToken();
        // Redirect to login page
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Retry logic
      if (config && !config.headers?.['X-Retry-Count']) {
        // Initialize retry count
        config.headers = config.headers ?? {};
        config.headers['X-Retry-Count'] = '0';
      }

      const retryCount = config?.headers?.['X-Retry-Count']
        ? parseInt(String(config.headers['X-Retry-Count']), 10)
        : 0;

      // Check if we should retry
      if (
        config &&
        retryCount < DEFAULT_RETRY_CONFIG.maxRetries &&
        isRetryableError(error, DEFAULT_RETRY_CONFIG)
      ) {
        // Increment retry count
        config.headers = config.headers ?? {};
        config.headers['X-Retry-Count'] = String(retryCount + 1);

        // Calculate backoff delay
        const delay = calculateBackoffDelay(retryCount, DEFAULT_RETRY_CONFIG);

        // Log retry attempt
        // eslint-disable-next-line no-console
        console.log(
          `Retrying request (attempt ${retryCount + 1}/${DEFAULT_RETRY_CONFIG.maxRetries}) after ${Math.round(delay)}ms:`,
          config.url
        );

        // Wait before retrying
        await sleep(delay);

        // Retry the request
        return apiClient.request(config);
      }

      // Extract detailed error message from backend response if available
      if (error.response?.data) {
        const responseData = error.response.data as Record<string, unknown>;
        if (responseData.error && typeof responseData.error === 'object') {
          const errorObj = responseData.error as Record<string, unknown>;
          if (errorObj.message && typeof errorObj.message === 'string') {
            // Replace the generic axios error message with the backend's detailed message
            error.message = errorObj.message;
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
