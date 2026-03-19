import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { apiFetch, authEvents, getErrorMessage, getStoredToken, refreshAccessToken, setStoredToken } from '../lib/api';
import { formatRoleLabel, getRoleDesignation } from '../lib/format';
import type { AuthMeResponse, AuthResponse, ApiUser, BackendRole } from '../lib/types';

export type Role = 'Support Engineer' | 'Project Lead' | 'Project Manager';

interface RoleContextType {
  role: Role;
  backendRole: BackendRole | null;
  designation: string;
  name: string;
  user: ApiUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const toRoleLabel = (role: BackendRole): Role => {
  switch (role) {
    case 'PM':
      return 'Project Manager';
    case 'PL':
      return 'Project Lead';
    case 'SE':
    default:
      return 'Support Engineer';
  }
};

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>('Project Manager');
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applySession = useCallback((nextUser: ApiUser | null, nextToken = getStoredToken()) => {
    setUser(nextUser);
    setToken(nextToken);
    setRoleState(nextUser ? toRoleLabel(nextUser.role) : 'Project Manager');
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiFetch<AuthResponse>('/auth/login', {
          method: 'POST',
          auth: false,
          body: {
            email,
            password,
          },
        });

        setStoredToken(response.token);
        applySession(response.user, response.token);
      } catch (authenticationError) {
        setStoredToken(null);
        applySession(null, null);
        const message = getErrorMessage(authenticationError);
        setError(message);
        throw authenticationError;
      } finally {
        setIsLoading(false);
      }
    },
    [applySession],
  );

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const existingToken = getStoredToken();

      if (existingToken) {
        try {
          const response = await apiFetch<AuthMeResponse>('/auth/me');
          applySession(response.user, getStoredToken());
          return;
        } catch {
          // fall through to refresh-token recovery
        }
      }

      const refreshResponse = await refreshAccessToken();

      if (refreshResponse) {
        applySession(refreshResponse.user, refreshResponse.token);
        return;
      }

      applySession(null, null);
    } catch (refreshError) {
      setError(getErrorMessage(refreshError));
      applySession(null, null);
    } finally {
      setIsLoading(false);
    }
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', {
        method: 'POST',
        auth: false,
      });
    } finally {
      setStoredToken(null);
      applySession(null, null);
      setError(null);
    }
  }, [applySession]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const response = await apiFetch<{ token: string }>('/auth/change-password', {
      method: 'POST',
      body: {
        currentPassword,
        newPassword,
      },
    });

    setStoredToken(response.token);
    setToken(response.token);
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const handleExpired = () => {
      setStoredToken(null);
      applySession(null, null);
      setError(null);
      setIsLoading(false);
    };

    const handleRefreshed = (event: Event) => {
      const refreshedEvent = event as CustomEvent<ApiUser>;
      applySession(refreshedEvent.detail, getStoredToken());
    };

    window.addEventListener(authEvents.expired, handleExpired);
    window.addEventListener(authEvents.refreshed, handleRefreshed as EventListener);

    return () => {
      window.removeEventListener(authEvents.expired, handleExpired);
      window.removeEventListener(authEvents.refreshed, handleRefreshed as EventListener);
    };
  }, [applySession]);

  const contextValue = useMemo<RoleContextType>(
    () => ({
      role,
      backendRole: user?.role ?? null,
      designation: getRoleDesignation(user?.role),
      name: user?.name || formatRoleLabel(user?.role) || 'Internal User',
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading,
      error,
      login,
      logout,
      changePassword,
      refreshSession,
    }),
    [changePassword, error, isLoading, login, logout, refreshSession, role, token, user],
  );

  return <RoleContext.Provider value={contextValue}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);

  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }

  return context;
}
