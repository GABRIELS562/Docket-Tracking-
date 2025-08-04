import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { IndividualGuest, TokenValidationResult } from '../types';
import { validateToken } from '../utils/guestSecurity';

interface UseGuestAuthReturn {
  guest: IndividualGuest | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  securityFlags: TokenValidationResult['securityFlags'];
  authenticate: (token: string) => Promise<boolean>;
  logout: () => void;
  // Legacy compatibility
  guestToken: IndividualGuest | null;
}

export const useGuestAuth = (): UseGuestAuthReturn => {
  const [guest, setGuest] = useState<IndividualGuest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [securityFlags, setSecurityFlags] = useState<TokenValidationResult['securityFlags']>();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const getClientIp = useCallback(async (): Promise<string | undefined> => {
    // In a real application, you would get the client IP from your backend
    // For demo purposes, we'll return undefined
    return undefined;
  }, []);

  const authenticate = useCallback(async (tokenStr: string): Promise<boolean> => {
    setError(null);
    setSecurityFlags(undefined);
    
    try {
      const clientIp = await getClientIp();
      const validation = validateToken(tokenStr, clientIp);
      
      if (!validation.isValid) {
        setError(validation.error || 'Authentication failed');
        setSecurityFlags(validation.securityFlags);
        setGuest(null);
        return false;
      }

      if (validation.guest) {
        setGuest(validation.guest);
        setSecurityFlags(validation.securityFlags);
        localStorage.setItem('wedding_guest_token', tokenStr);
        return true;
      }

      return false;
    } catch (err) {
      setError('Authentication service unavailable. Please try again.');
      console.error('Authentication error:', err);
      return false;
    }
  }, [getClientIp]);

  const logout = useCallback(() => {
    setGuest(null);
    setError(null);
    setSecurityFlags(undefined);
    localStorage.removeItem('wedding_guest_token');
    navigate('/');
  }, [navigate]);

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let tokenToCheck = token;

        if (!tokenToCheck) {
          const storedToken = localStorage.getItem('wedding_guest_token');
          if (storedToken) {
            tokenToCheck = storedToken;
          }
        }

        if (tokenToCheck) {
          const authSuccess = await authenticate(tokenToCheck);
          
          if (!authSuccess) {
            // Clear stored token if authentication fails
            localStorage.removeItem('wedding_guest_token');
            
            if (token) {
              // Redirect to home if URL token is invalid
              navigate('/', { replace: true });
            }
          } else if (token && token !== tokenToCheck) {
            // Update stored token if URL token is different and valid
            localStorage.setItem('wedding_guest_token', token);
          }
        } else {
          setGuest(null);
        }
      } catch (err) {
        setError('An error occurred while authenticating. Please try again.');
        console.error('Authentication initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [token, navigate, authenticate]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'wedding_guest_token') {
        if (e.newValue) {
          // Re-authenticate with new token
          authenticate(e.newValue);
        } else {
          setGuest(null);
          setError(null);
          setSecurityFlags(undefined);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [authenticate]);

  // Security monitoring - check for suspicious activity
  useEffect(() => {
    if (securityFlags?.suspiciousActivity) {
      console.warn('Suspicious authentication activity detected');
      // In a real application, you might want to log this or take additional action
    }
    
    if (securityFlags?.rateLimited) {
      console.warn('Rate limiting triggered for authentication attempts');
    }
  }, [securityFlags]);

  const isAuthenticated = guest !== null && !error && !securityFlags?.ipBlocked;

  return {
    guest,
    isAuthenticated,
    isLoading,
    error,
    securityFlags,
    authenticate,
    logout,
    // Legacy compatibility
    guestToken: guest
  };
};