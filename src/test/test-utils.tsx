/**
 * Test Utilities
 *
 * Custom render function and utilities for testing React components.
 * Provides wrapped render with common providers.
 */

import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries in tests
        retry: false,
        // Disable refetch on window focus
        refetchOnWindowFocus: false,
        // Disable stale time caching in tests
        staleTime: 0,
        // Disable garbage collection time
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface WrapperProps {
  children: ReactNode;
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Add router if needed
  withRouter?: boolean;
  // Add query client if needed
  withQueryClient?: boolean;
  // Initial route for router
  initialRoute?: string;
}

/**
 * Custom render function that wraps components with necessary providers.
 *
 * @param ui - The React component to render
 * @param options - Custom render options
 * @returns Render result with additional utilities
 */
function customRender(
  ui: ReactElement,
  {
    withRouter = true,
    withQueryClient = true,
    initialRoute = '/',
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  const queryClient = createTestQueryClient();

  // Set initial route if using router
  if (withRouter && initialRoute !== '/') {
    window.history.pushState({}, 'Test page', initialRoute);
  }

  function Wrapper({ children }: WrapperProps) {
    let wrapped = children;

    // Wrap with QueryClient if needed
    if (withQueryClient) {
      wrapped = <QueryClientProvider client={queryClient}>{wrapped}</QueryClientProvider>;
    }

    // Wrap with Router if needed
    if (withRouter) {
      wrapped = <BrowserRouter>{wrapped}</BrowserRouter>;
    }

    return <>{wrapped}</>;
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    // Return query client for test manipulation
    queryClient,
    // Return user event for interactions
    user: userEvent.setup(),
  };
}

/**
 * Create a mock Zustand store for testing.
 * Use this to override specific store values in tests.
 *
 * @param initialState - Partial state to override defaults
 * @returns Mock store with all actions as vi.fn()
 */
export function createMockStore<T extends object>(initialState: Partial<T>): Partial<T> {
  return { ...initialState };
}

/**
 * Wait for a condition to be true.
 * Useful for waiting for async state updates.
 *
 * @param condition - Function that returns true when ready
 * @param timeout - Maximum time to wait in ms
 * @returns Promise that resolves when condition is true
 */
export async function waitForCondition(condition: () => boolean, timeout = 5000): Promise<void> {
  const start = Date.now();

  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/**
 * Create a mock API response for testing.
 *
 * @param data - The data to return
 * @param delay - Optional delay in ms
 * @returns Promise that resolves with the data
 */
export function createMockApiResponse<T>(data: T, delay = 0): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { userEvent };

// Export custom render as default render
export { customRender as render };
