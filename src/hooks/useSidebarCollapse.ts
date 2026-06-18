import { useEffect, useState } from 'react';

const COLLAPSE_KEY = 'sentinel:sidebar:collapsed';

export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COLLAPSE_KEY) === '1';
  });

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  return { collapsed, toggle: () => setCollapsed((current) => !current) };
}
