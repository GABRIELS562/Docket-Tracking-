import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * User Authentication State
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  avatar?: string;
}

/**
 * Tenant (Organization) Information
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'trial' | 'basic' | 'professional' | 'enterprise';
}

interface AuthState {
  // State
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setTenant: (tenant: Tenant | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchTenant: (tenantId: string) => Promise<void>;
}

/**
 * Authentication Store
 *
 * Manages user authentication, session persistence, and tenant context.
 * Uses Zustand persist middleware to save auth state to localStorage.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      // Initial state
      user: null,
      tenant: null,
      isAuthenticated: false,
      isLoading: false,

      // Set user
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      // Set tenant
      setTenant: (tenant) =>
        set({ tenant }),

      // Login (mock implementation - replace with real API)
      login: async (email, _password) => {
        set({ isLoading: true });

        // Mock authentication - Replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Mock user data
        const mockUser: User = {
          id: '1',
          name: 'J. Gabriels',
          email,
          role: 'admin',
        };

        const mockTenant: Tenant = {
          id: 'tenant-1',
          name: 'SAPS Forensics Lab',
          slug: 'saps-forensics',
          plan: 'professional',
        };

        set({
          user: mockUser,
          tenant: mockTenant,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      // Logout
      logout: () =>
        set({
          user: null,
          tenant: null,
          isAuthenticated: false,
        }),

      // Switch tenant (for multi-tenant users)
      switchTenant: async (tenantId) => {
        set({ isLoading: true });

        // Mock API call - Replace with actual tenant switch
        await new Promise((resolve) => setTimeout(resolve, 500));

        const mockTenant: Tenant = {
          id: tenantId,
          name: 'Different Tenant',
          slug: 'different-tenant',
          plan: 'basic',
        };

        set({
          tenant: mockTenant,
          isLoading: false,
        });
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
