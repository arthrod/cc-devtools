import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { App } from './App';
import { ToastProvider } from './components/common/ToastContainer';
import './index.css';

/**
 * Configures React Query client optimized for mobile compatibility and performance.
 *
 * Settings prevent mobile backgrounding issues and reduce server load:
 * - Custom retry logic prevents retrying on 401 (auth errors) to avoid rate limiting
 * - Disabled refetch on window focus and mount reduces noise during debugging
 * - 5-minute stale time balances fresh data with reasonable cache efficiency
 * - refetchOnMount: false prevents backgrounding accumulation issues on mobile
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
