import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

type ViewportKind = 'mobile' | 'tablet' | 'desktop';

type ShellContextValue = {
  viewport: ViewportKind;
  isDesktop: boolean;
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  toggleSidebarCollapsed: () => void;
};

const DESKTOP_BREAKPOINT = 1024;

const ShellContext = createContext<ShellContextValue | undefined>(undefined);

function getViewportKind(width: number): ViewportKind {
  if (width >= DESKTOP_BREAKPOINT) {
    return 'desktop';
  }

  if (width >= 768) {
    return 'tablet';
  }

  return 'mobile';
}

export function ShellProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [viewport, setViewport] = useState<ViewportKind>(() => getViewportKind(typeof window === 'undefined' ? DESKTOP_BREAKPOINT : window.innerWidth));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setViewport(getViewportKind(window.innerWidth));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (viewport === 'desktop') {
      document.body.style.removeProperty('overflow');
      return;
    }

    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
      return;
    }

    document.body.style.removeProperty('overflow');
  }, [isSidebarOpen, viewport]);

  useEffect(() => {
    return () => {
      document.body.style.removeProperty('overflow');
    };
  }, []);

  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setIsSidebarOpen((current) => !current), []);
  const toggleSidebarCollapsed = useCallback(() => setIsSidebarCollapsed((current) => !current), []);

  const value = useMemo<ShellContextValue>(
    () => ({
      viewport,
      isDesktop: viewport === 'desktop',
      isSidebarOpen,
      isSidebarCollapsed,
      openSidebar,
      closeSidebar,
      toggleSidebar,
      toggleSidebarCollapsed,
    }),
    [closeSidebar, isSidebarCollapsed, isSidebarOpen, openSidebar, toggleSidebar, toggleSidebarCollapsed, viewport],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const context = useContext(ShellContext);

  if (!context) {
    throw new Error('useShell must be used within a ShellProvider');
  }

  return context;
}
